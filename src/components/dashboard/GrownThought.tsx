"use client";

import { useState } from "react";
import { Quote, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { thoughtForDay } from "@/lib/demo/thoughts";
import { useDayStore } from "@/lib/store/day-store";

export function GrownThought() {
  const { today } = useDayStore();
  const [offset, setOffset] = useState(0);
  const thought = thoughtForDay(today, offset);

  return (
    <Card tone="gold" className="relative flex flex-col overflow-hidden">
      <Quote
        aria-hidden
        className="pointer-events-none absolute -top-3 -right-3 h-28 w-28 text-gold/30"
        strokeWidth={1}
      />
      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-espresso">
          Today&apos;s GROWN. Thought
        </p>
        <p key={thought} className="mt-4 animate-fade font-serif text-[1.55rem] leading-snug font-medium text-espresso sm:text-[1.7rem]">
          &ldquo;{thought}&rdquo;
        </p>
      </div>
      <button
        type="button"
        onClick={() => setOffset((o) => o + 1)}
        className="relative mt-6 inline-flex w-fit items-center gap-1.5 rounded-pill border border-line bg-warm-white/80 px-3.5 py-1.5 text-sm font-medium text-espresso transition-colors hover:bg-warm-white"
      >
        <RefreshCw className="h-3.5 w-3.5" strokeWidth={2} />
        Another thought
      </button>
    </Card>
  );
}
