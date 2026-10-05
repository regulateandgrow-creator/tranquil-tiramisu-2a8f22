import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...rest }: InputProps) {
  return (
    <input
      className={cn(
        "h-12 w-full rounded-2xl border border-line-strong bg-warm-white px-4 text-[17px] text-espresso",
        "placeholder:text-espresso-soft/70 transition-colors",
        "hover:border-espresso/30 focus:border-espresso focus:outline-none focus-visible:outline-none",
        "disabled:opacity-60",
        className,
      )}
      {...rest}
    />
  );
}
