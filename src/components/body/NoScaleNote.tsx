"use client";

import { EyeOff } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useHideWeight } from "@/lib/preferences/weight";

/** My Body never asks for a number from a scale. This says so, in her settings' terms. */
export function NoScaleNote() {
  const hidden = useHideWeight();
  return (
    <Card tone="gold" className="flex items-start gap-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-warm-white/80 text-espresso"><EyeOff className="h-[18px] w-[18px]" strokeWidth={1.75} /></span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-espresso-soft">No scale here</p>
        <p className="mt-1.5 text-[15px] leading-relaxed text-espresso">
          {hidden
            ? "Hide weight entirely is on. Nothing in GROWN. asks for it, shows it, or uses it. Your body is read through energy, sleep, hunger, cravings, digestion, mood and movement."
            : "GROWN. reads your body through energy, sleep, hunger, cravings, digestion, mood and movement. You can switch Hide weight entirely on in Settings at any time."}
        </p>
      </div>
    </Card>
  );
}
