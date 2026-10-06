"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Decision } from "@/lib/db/intelligence";
import { cn } from "@/lib/utils/cn";

const OPTIONS: Array<{ value: Decision; label: string }> = [
  { value: "try_track", label: "Trying it" },
  { value: "save", label: "Saved" },
  { value: "not_for_me", label: "Not for me" },
];

/** Three quiet toggles to move a product between shelves. Writes through the decision route. */
export function ProductDecisionMenu({ analysisId, decision, title }: { analysisId: string; decision: Decision | null; title: string }) {
  const router = useRouter();
  const [current, setCurrent] = useState<Decision | null>(decision);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function choose(next: Decision) {
    if (next === current || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/intelligence/analyses/${analysisId}/decision`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision: next }),
      });
      if (!res.ok) throw new Error();
      setCurrent(next);
      startTransition(() => router.refresh());
    } catch {
      setError("Couldn't save that just now. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={`Decision for ${title}`}>
        {OPTIONS.map((o) => {
          const selected = current === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={busy}
              onClick={() => choose(o.value)}
              className={cn(
                "inline-flex h-10 items-center rounded-pill border px-3.5 text-sm font-medium transition-all duration-200 active:scale-[0.97] disabled:opacity-60",
                selected
                  ? "border-espresso bg-espresso text-cream"
                  : "border-line-strong bg-warm-white text-espresso hover:border-espresso/40 hover:bg-cream",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {error && <p className="text-sm text-rose" role="alert">{error}</p>}
    </div>
  );
}
