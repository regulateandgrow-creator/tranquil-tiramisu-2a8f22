import { cn } from "@/lib/utils/cn";

export function Wordmark({ className, tagline = false }: { className?: string; tagline?: boolean }) {
  return (
    <div className={cn("select-none", className)}>
      <span className="font-serif text-[1.75rem] font-semibold tracking-[0.04em] text-espresso">
        GROWN<span className="text-gold">.</span>
        <sup className="ml-0.5 align-super text-[0.5rem] font-sans font-medium tracking-normal text-espresso-soft">
          ™
        </sup>
      </span>
      {tagline && (
        <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.16em] text-espresso-soft">
          Healthy aging. Your body. Your rules.
        </p>
      )}
    </div>
  );
}
