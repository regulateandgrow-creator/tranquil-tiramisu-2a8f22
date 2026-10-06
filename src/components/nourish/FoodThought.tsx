"use client";

import { Lightbulb } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useDayStore } from "@/lib/store/day-store";
import { foodThoughtForDay } from "@/lib/demo/nourish";

export function FoodThought() {
  const { today } = useDayStore();
  return (
    <Card tone="gold" className="flex items-start gap-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-warm-white/80 text-espresso"><Lightbulb className="h-[18px] w-[18px]" strokeWidth={1.75} /></span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-espresso-soft">Learn your food</p>
        <p className="mt-1.5 font-serif text-xl leading-snug font-medium text-espresso">{foodThoughtForDay(today)}</p>
      </div>
    </Card>
  );
}
