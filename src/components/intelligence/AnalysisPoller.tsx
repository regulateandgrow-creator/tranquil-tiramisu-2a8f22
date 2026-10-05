"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";

const STAGES = ["Finding the product", "Reading the research", "Checking the claims", "Fitting it to your goals"];

/** Polls the analysis status while research runs, then refreshes the page. */
export function AnalysisPoller({ id, initialMessage }: { id: string; initialMessage: string | null }) {
  const router = useRouter();
  const [message, setMessage] = useState(initialMessage ?? STAGES[1]);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let active = true;
    const started = Date.now();
    const tick = async () => {
      try {
        const res = await fetch(`/api/intelligence/analyses/${id}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { status: string; stageMessage: string | null };
        if (!active) return;
        if (data.stageMessage) setMessage(data.stageMessage);
        if (data.status === "complete" || data.status === "failed" || data.status === "limited") {
          router.refresh();
          return;
        }
      } catch {
        /* keep polling */
      }
      setElapsed(Math.round((Date.now() - started) / 1000));
      if (active) timer = setTimeout(tick, 1500);
    };
    let timer = setTimeout(tick, 800);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [id, router]);

  const stageIndex = Math.max(0, STAGES.indexOf(message));

  return (
    <Card tone="gold" className="space-y-5" aria-live="polite">
      <div className="flex items-center gap-3">
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-gold" />
        </span>
        <p className="font-serif text-2xl font-medium text-espresso">{message}…</p>
      </div>
      <ol className="space-y-2">
        {STAGES.map((s, i) => (
          <li key={s} className={i <= stageIndex ? "text-[15px] text-espresso" : "text-[15px] text-espresso-soft/60"}>
            {i < stageIndex ? "✓ " : i === stageIndex ? "• " : "○ "}
            {s}
          </li>
        ))}
      </ol>
      <p className="text-sm text-espresso-soft">
        Real research takes a minute or two. You can leave this page; your Breakdown will be waiting in My Products.
        {elapsed > 90 && " Still working on it."}
      </p>
    </Card>
  );
}
