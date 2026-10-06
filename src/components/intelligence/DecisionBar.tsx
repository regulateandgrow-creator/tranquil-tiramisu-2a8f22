"use client";

import { useState } from "react";
import { Bookmark, FlaskConical, XCircle, Check } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import type { Decision } from "@/lib/db/intelligence";

const LABELS: Record<Decision, string> = { try_track: "Try it & track it", save: "Save it", not_for_me: "Not for me" };

export function DecisionBar({ id, initial }: { id: string; initial: Decision | null }) {
  const [decision, setDecision] = useState<Decision | null>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function choose(next: Decision) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/intelligence/analyses/${id}/decision`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision: next }) });
      if (!res.ok) throw new Error();
      setDecision(next);
    } catch {
      setError("Couldn't save that just now. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3" role="group" aria-label="Your decision">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button variant={decision === "try_track" ? "primary" : "gold"} size="lg" disabled={busy} icon={<FlaskConical />} onClick={() => choose("try_track")}>
          Try it &amp; track it
        </Button>
        <Button variant={decision === "save" ? "primary" : "secondary"} size="lg" disabled={busy} icon={<Bookmark />} onClick={() => choose("save")}>
          Save it
        </Button>
        <Button variant={decision === "not_for_me" ? "primary" : "ghost"} size="lg" disabled={busy} icon={<XCircle />} onClick={() => choose("not_for_me")}>
          Not for me
        </Button>
      </div>
      <p className="min-h-5 text-sm text-espresso-soft" role="status">
        {error ? (
          error
        ) : decision ? (
          <span className="inline-flex items-center gap-1.5 text-espresso">
            <Check className="h-4 w-4 text-sage" strokeWidth={2.5} /> Saved: {LABELS[decision]}.{" "}
            <Link href="/my-products" className="font-semibold underline-offset-2 hover:underline">See it in My Products</Link>
          </span>
        ) : null}
      </p>
    </div>
  );
}
