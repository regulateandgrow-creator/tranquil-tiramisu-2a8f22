"use client";

import { Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { lifeModes, getLifeMode } from "@/lib/demo/modes";
import { useDayStore } from "@/lib/store/day-store";
import { cn } from "@/lib/utils/cn";

export function LifeIsLifing() {
  const { mode, setMode } = useDayStore();
  const current = getLifeMode(mode);

  return (
    <Card tone="rose" className="flex flex-col">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-espresso">
        Life Is Lifing<sup className="text-[0.55em]">™</sup>
      </p>
      <h2 className="mt-3 font-serif text-2xl leading-tight font-medium text-espresso">
        Your health routine should survive your real life.
      </h2>

      <div role="radiogroup" aria-label="Life mode" className="mt-5 grid grid-cols-3 gap-2">
        {lifeModes.map((m) => {
          const selected = m.key === mode;
          return (
            <button
              key={m.key}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setMode(m.key)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-3 text-center transition-all duration-200 active:scale-[0.98]",
                selected
                  ? "border-espresso bg-espresso text-cream shadow-[0_8px_20px_-10px_rgba(51,43,40,0.6)]"
                  : "border-line-strong bg-warm-white/80 text-espresso hover:border-espresso/40",
              )}
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] sm:text-xs">
                {m.short}
              </span>
              <span className={cn("text-[11px]", selected ? "text-cream/70" : "text-espresso-soft")}>
                {m.key === "normal" ? "Routine" : m.key === "maintenance" ? "Protect" : "Return"}
              </span>
            </button>
          );
        })}
      </div>

      <div key={current.key} className="mt-5 animate-fade">
        <p className="font-serif text-xl font-medium text-espresso">{current.headline}</p>
        <p className="mt-1.5 text-[15px] leading-relaxed text-espresso-soft">{current.description}</p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {current.focus.map((f) => (
            <li
              key={f}
              className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-warm-white/80 px-3 py-1 text-sm text-espresso"
            >
              <Check className="h-3.5 w-3.5 text-sage" strokeWidth={2.5} />
              {f}
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
