"use client";

import type { ReactNode } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface StepperProps {
  label: string;
  /** Singular/plural noun for the screen-reader labels, e.g. ["glass", "glasses"]. */
  unit: [string, string];
  value: number;
  max: number;
  onChange: (next: number) => void;
  icon?: ReactNode;
  hint?: string;
  className?: string;
}

/** Big-target counter. Two taps, no typing. */
export function Stepper({ label, unit, value, max, onChange, icon, hint, className }: StepperProps) {
  const noun = value === 1 ? unit[0] : unit[1];
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4", className)}>
      <div className="flex min-w-0 flex-1 items-center gap-4">
        {icon && <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cream-deep text-espresso [&>svg]:h-[18px] [&>svg]:w-[18px]">{icon}</span>}
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-espresso">{label}</p>
          {hint && <p className="text-sm text-espresso-soft">{hint}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 self-end sm:self-auto" role="group" aria-label={label}>
        <button
          type="button"
          aria-label={`One fewer ${unit[0]}`}
          disabled={value <= 0}
          onClick={() => onChange(Math.max(0, value - 1))}
          className="flex h-11 w-11 items-center justify-center rounded-pill border border-line-strong bg-warm-white text-espresso transition-all hover:bg-cream active:scale-95 disabled:opacity-40"
        >
          <Minus className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </button>
        <span className="min-w-[4.5rem] text-center" aria-live="polite">
          <span className="font-serif text-2xl font-medium text-espresso">{value}</span>
          <span className="block text-[11px] uppercase tracking-[0.14em] text-espresso-soft">{noun}</span>
        </span>
        <button
          type="button"
          aria-label={`One more ${unit[0]}`}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          className="flex h-11 w-11 items-center justify-center rounded-pill bg-espresso text-cream transition-all hover:bg-charcoal active:scale-95 disabled:opacity-40"
        >
          <Plus className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
