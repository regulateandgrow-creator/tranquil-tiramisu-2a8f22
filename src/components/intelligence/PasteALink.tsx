"use client";

import { useState, type FormEvent } from "react";
import { Link2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { EntryResolved } from "./ScanAProduct";

interface Props {
  busy: boolean;
  setBusy: (b: boolean) => void;
  onResolved: (data: EntryResolved, readNote?: string) => void;
  onLimit: (data: { resetsAt: string | null; limit: number }) => void;
  friendlyError: (code: string | undefined) => string;
}

/** Paste a product page link. We read the product name from the page, nothing else. */
export function PasteALink({ busy, setBusy, onResolved, onLimit, friendlyError }: Props) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const value = url.trim();
    if (!/^https?:\/\//i.test(value)) return setError("Paste the full link, starting with http:// or https://.");
    setBusy(true);
    try {
      const res = await fetch("/api/intelligence/link", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: value }) });
      const data = await res.json();
      if (res.status === 429) return onLimit(data);
      if (res.status === 400) return setError(data.error === "unsupported_host" ? "That link points somewhere we can't read. Try the product page on the brand's or a retailer's site." : "That doesn't look like a link we can open.");
      if (res.status === 422) return setError(data.error === "link_unreachable" ? "We couldn't open that page. Some sites block readers; typing the product name works just as well." : "We couldn't find a product name on that page. Try the product's own page, or type the name.");
      if (!res.ok) return setError(friendlyError(data.error));
      onResolved(data, data.read?.title ? `From the page: ${data.read.title}` : undefined);
    } catch {
      setError("We couldn't reach GROWN. Intelligence just now. Please try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      <div>
        <label htmlFor="product-link" className="block text-[15px] font-semibold text-espresso">Paste the product page link.</label>
        <p className="mt-1 text-sm text-espresso-soft">We read the product name from the page and nothing else. The brand&apos;s own page works best.</p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input id="product-link" type="url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" autoComplete="off" maxLength={2000} aria-describedby={error ? "link-error" : undefined} />
        <Button type="submit" size="lg" disabled={busy} icon={<Link2 />} className="sm:w-auto">{busy ? "Reading…" : "Look it up"}</Button>
      </div>
      {error && <p id="link-error" role="alert" className="text-sm text-rose">{error}</p>}
    </form>
  );
}
