import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type Tone = "sage" | "rose" | "gold" | "neutral";

const toneClasses: Record<Tone, string> = {
  sage: "bg-sage-soft text-espresso",
  rose: "bg-rose-soft text-espresso",
  gold: "bg-gold-soft text-espresso",
  neutral: "bg-cream-deep text-espresso-soft",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-xs font-semibold tracking-wide uppercase",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
