"use client";

import type { SignalDefinition } from "@/lib/demo/signals";
import type { StripCell } from "@/lib/progress/summary";
import { cn } from "@/lib/utils/cn";

const LEVEL_CLASS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "bg-sage-1 border border-sage-2",
  2: "bg-sage-2",
  3: "bg-sage-3",
  4: "bg-sage-4",
  5: "bg-sage-5",
};

function pretty(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Four weeks of one signal as 28 cells, one hue, lighter to darker with the level.
 * Each cell names its day and level for screen readers and on hover.
 */
export function SignalStrip({ def, cells, typical, logged }: { def: SignalDefinition; cells: StripCell[]; typical: string | null; logged: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[15px] font-semibold text-espresso">{def.label}</p>
        <p className="text-xs text-espresso-soft">{logged === 0 ? "Not logged yet" : `Mostly ${typical} · ${logged} of ${cells.length} days`}</p>
      </div>
      <ol className="grid grid-cols-[repeat(28,minmax(0,1fr))] gap-0.5" aria-label={`${def.label}, last ${cells.length} days`}>
        {cells.map((c) => (
          <li
            key={c.day}
            title={`${pretty(c.day)}: ${c.level ? def.levels[c.level - 1] : "not logged"}`}
            aria-label={`${pretty(c.day)}: ${c.level ? def.levels[c.level - 1] : "not logged"}`}
            className={cn("h-6 rounded-[3px] transition-colors", c.level ? LEVEL_CLASS[c.level] : "border border-line bg-warm-white")}
          />
        ))}
      </ol>
    </div>
  );
}
