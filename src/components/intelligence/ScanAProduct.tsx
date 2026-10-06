"use client";

import { useRef, useState } from "react";
import { Camera, ImageIcon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { compressImage } from "@/lib/intelligence/compress-image";

export interface EntryResolved {
  id: string;
  confidence: string;
  candidates: never[] | unknown[];
  clarification: string;
}

interface Props {
  busy: boolean;
  setBusy: (b: boolean) => void;
  onResolved: (data: EntryResolved, readNote?: string) => void;
  onLimit: (data: { resetsAt: string | null; limit: number }) => void;
  friendlyError: (code: string | undefined) => string;
}

/** Take or choose a photo of the label. The photo is read once and never kept. */
export function ScanAProduct({ busy, setBusy, onResolved, onLimit, friendlyError }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  function pick(f: File | null) {
    setError(null);
    setStatus(null);
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function read() {
    if (!file || busy) return;
    setError(null);
    setBusy(true);
    setStatus("Reading the label…");
    try {
      const compact = await compressImage(file);
      const form = new FormData();
      form.append("image", compact, compact.name);
      const res = await fetch("/api/intelligence/scan", { method: "POST", body: form });
      const data = await res.json();
      if (res.status === 429) return onLimit(data);
      if (res.status === 422) return setError(data.note || "We couldn't make out a product label in that photo. Try the front of the pack, closer and in good light.");
      if (res.status === 413) return setError("That photo is very large. A regular phone photo is fine; try again.");
      if (res.status === 415) return setError("We can read JPG, PNG and WebP photos. Try a different format.");
      if (!res.ok) return setError(friendlyError(data.error));
      onResolved(data, data.read?.note || undefined);
    } catch {
      setError("We couldn't reach GROWN. Intelligence just now. Please try again in a moment.");
    } finally {
      setBusy(false);
      setStatus(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[15px] font-semibold text-espresso">Point your camera at the front of the pack.</p>
        <p className="mt-1 text-sm text-espresso-soft">Brand and product name in frame is all we need. The photo is read once and never stored.</p>
      </div>
      <input
        ref={inputRef}
        id="scan-file"
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        aria-label="Photo of the product label"
        onChange={(e) => pick(e.target.files?.[0] ?? null)}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="button" variant="gold" size="lg" icon={<Camera />} disabled={busy} onClick={() => inputRef.current?.click()}>
          {file ? "Retake" : "Take a photo"}
        </Button>
        {file && (
          <Button type="button" size="lg" icon={<Sparkles />} disabled={busy} onClick={read}>
            {busy ? status ?? "Working…" : "Read the label"}
          </Button>
        )}
      </div>
      {preview && (
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-cream p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Your label photo" className="h-20 w-20 rounded-xl object-cover" />
          <p className="text-sm text-espresso-soft"><ImageIcon className="mr-1 inline h-4 w-4" strokeWidth={1.75} />{file?.name}</p>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-rose">{error}</p>}
    </div>
  );
}
