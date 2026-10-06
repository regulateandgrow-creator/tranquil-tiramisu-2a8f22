"use client";

import { Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { levelLabel, type SignalDefinition } from "@/lib/demo/signals";
import type { SignalLevel } from "@/lib/demo/types";
import { useDayStore } from "@/lib/store/day-store";
import { cn } from "@/lib/utils/cn";
import {
  Zap,
  Moon,
  Soup,
  Cookie,
  Wind,
  Smile,
  Footprints,
  type LucideIcon,
} from "lucide-react";

const icons: Record<SignalDefinition["key"], LucideIcon> = {
  energy: Zap,
  sleep: Moon,
  hunger: Soup,
  cravings: Cookie,
  digestion: Wind,
  mood: Smile,
  movement: Footprints,
};

const LEVELS: SignalLevel[] = [1, 2, 3, 4, 5];

export function SignalCard({ def }: { def: SignalDefinition }) {
  const { checkIn, setSignal } = useDayStore();
  const value = checkIn.signals[def.key];
  const Icon = icons[def.key];

  return (
    <Card
      padded={false}
      hover
      className={cn("p-4 sm:p-5", value && "border-gold/50 bg-gradient-to-br from-gold-soft/60 to-warm-white")}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl transition-colors",
              value ? "bg-gold/40 text-espresso" : "bg-cream-deep text-espresso-soft",
            )}
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </span>
          <div>
            <p className="text-[15px] font-semibold text-espresso">{def.label}</p>
            <p className="text-xs text-espresso-soft">{levelLabel(def, value)}</p>
          </div>
        </div>
        {value && (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-espresso text-cream animate-fade">
            <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
          </span>
        )}
      </div>

      <div role="radiogroup" aria-label={def.prompt} className="mt-4 flex items-center gap-1.5">
        {LEVELS.map((level) => {
          const active = value !== undefined && level <= value;
          const exact = value === level;
          return (
            <button
              key={level}
              type="button"
              role="radio"
              aria-checked={exact}
              aria-label={def.levels[level - 1]}
              onClick={() => setSignal(def.key, exact ? undefined : level)}
              className={cn(
                "h-9 flex-1 rounded-lg border transition-all duration-200 active:scale-95",
                active
                  ? "border-transparent bg-gradient-to-b from-sage to-sage/80"
                  : "border-line-strong bg-warm-white hover:bg-cream",
                exact && "ring-2 ring-espresso/80 ring-offset-1 ring-offset-warm-white",
              )}
            />
          );
        })}
      </div>
    </Card>
  );
}
