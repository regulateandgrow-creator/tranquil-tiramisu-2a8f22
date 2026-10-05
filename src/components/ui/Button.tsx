import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "ghost" | "gold" | "outline-light";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-espresso text-cream hover:bg-charcoal shadow-[0_6px_16px_-8px_rgba(51,43,40,0.5)]",
  secondary:
    "bg-warm-white text-espresso border border-line-strong hover:border-espresso/30 hover:bg-cream",
  ghost: "bg-transparent text-espresso hover:bg-espresso/5",
  gold: "bg-gold text-espresso hover:brightness-105 shadow-[0_6px_16px_-8px_rgba(213,186,130,0.8)]",
  /** For use on espresso / dark surfaces */
  "outline-light": "border border-cream/30 bg-cream/10 text-cream hover:bg-cream/15 hover:border-cream/50",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-[15px]",
  lg: "h-13 px-6 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  icon,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-pill font-medium tracking-wide",
        "transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...rest}
    >
      {icon && <span className="shrink-0 [&>svg]:h-[18px] [&>svg]:w-[18px]">{icon}</span>}
      <span>{children}</span>
    </button>
  );
}
