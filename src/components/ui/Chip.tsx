"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  children: ReactNode;
}

/** A soft pill toggle used for check-ins and mode selectors. */
export function Chip({ selected = false, className, children, ...rest }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "inline-flex h-10 items-center rounded-pill px-4 text-[15px] font-medium whitespace-nowrap",
        "border transition-all duration-200 active:scale-[0.97]",
        selected
          ? "border-espresso bg-espresso text-cream shadow-[0_6px_14px_-8px_rgba(51,43,40,0.6)]"
          : "border-line-strong bg-warm-white text-espresso hover:border-espresso/40 hover:bg-cream",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
