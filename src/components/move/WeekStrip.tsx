"use client";

import { Dumbbell, Footprints } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useDayStore } from "@/lib/store/day-store";
import { summarizeWeek, weekSentence } from "@/lib/foundation/week";
import { cn } from "@/lib/utils/cn";

/** Seven dots. No streaks, no targets. */
export function WeekStrip() {
  const { checkIns, today } = useDayStore();
  const week = summarizeWeek(checkIns, today);
  return (
    <section className="space-y-4">
      <SectionHeading eyebrow="This week" title="A week at a glance." description="Not a streak to protect. Just a picture of how the week has moved." />
      <Card>
        <ol className="grid grid-cols-7 gap-2" aria-label="Last seven days">
          {week.days.map((d) => (
            <li key={d.day} className="flex flex-col items-center gap-2">
              <span className={cn("text-[11px] font-semibold uppercase tracking-[0.12em]", d.isToday ? "text-espresso" : "text-espresso-soft")}>{d.label}</span>
              <span
                aria-label={`${d.label}: ${d.strength ? "moved, with strength" : d.moved ? "moved" : d.rest ? "rest day" : "not noted"}`}
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-full border transition-colors",
                  d.strength ? "border-gold bg-gold/40 text-espresso" : d.moved ? "border-sage bg-sage-soft text-espresso" : d.rest ? "border-rose/60 bg-rose-soft text-espresso-soft" : "border-line-strong bg-warm-white text-espresso-soft/50",
                  d.isToday && "ring-2 ring-espresso/70 ring-offset-2 ring-offset-warm-white",
                )}
              >
                {d.strength ? <Dumbbell className="h-[18px] w-[18px]" strokeWidth={1.75} /> : d.moved ? <Footprints className="h-[18px] w-[18px]" strokeWidth={1.75} /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-[15px] text-espresso" aria-live="polite">{weekSentence(week)}</p>
      </Card>
    </section>
  );
}
