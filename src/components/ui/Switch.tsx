"use client";

import { cn } from "@/lib/utils/cn";

interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  /** id of the element that labels the switch */
  labelledBy: string;
  describedBy?: string;
}

export function Switch({ checked, onChange, disabled, labelledBy, describedBy }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-8 w-14 shrink-0 items-center rounded-pill border transition-colors duration-200",
        "disabled:opacity-50",
        checked ? "border-espresso bg-espresso" : "border-line-strong bg-cream-deep",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute left-1 h-6 w-6 rounded-full shadow-sm transition-transform duration-200",
          checked ? "translate-x-6 bg-gold" : "translate-x-0 bg-warm-white",
        )}
      />
    </button>
  );
}
