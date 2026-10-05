import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type Tone = "default" | "sage" | "rose" | "gold" | "espresso";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: Tone;
  padded?: boolean;
  hover?: boolean;
  children: ReactNode;
}

const toneClasses: Record<Tone, string> = {
  default: "bg-warm-white text-espresso",
  sage: "bg-gradient-to-br from-sage-soft to-warm-white text-espresso",
  rose: "bg-gradient-to-br from-rose-soft to-warm-white text-espresso",
  gold: "bg-gradient-to-br from-gold-soft via-warm-white to-warm-white text-espresso",
  espresso: "bg-gradient-to-br from-espresso to-charcoal text-cream",
};

export function Card({
  tone = "default",
  padded = true,
  hover = false,
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-card border border-line shadow-card transition-all duration-300",
        toneClasses[tone],
        padded && "p-5 sm:p-6",
        hover && "hover:shadow-card-hover hover:-translate-y-0.5",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
