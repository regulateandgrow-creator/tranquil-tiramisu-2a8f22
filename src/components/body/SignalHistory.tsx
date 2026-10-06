"use client";

import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SignalStrip } from "@/components/body/SignalStrip";
import { signalDefinitions } from "@/lib/demo/signals";
import { useDayStore } from "@/lib/store/day-store";
import { summarizeProgress } from "@/lib/progress/summary";

export function SignalHistory({ keys }: { keys?: Array<(typeof signalDefinitions)[number]["key"]> }) {
  const { checkIns, today } = useDayStore();
  const s = summarizeProgress(checkIns, today);
  const defs = keys ? signalDefinitions.filter((d) => keys.includes(d.key)) : signalDefinitions;
  return (
    <section className="space-y-4">
      <SectionHeading eyebrow="Four weeks of signals" title="How your days have felt." description="Darker means a higher rating. Empty means not noted. Nothing to beat." action={<span className="text-sm text-espresso-soft">{s.daysLogged} of {s.windowDays} days noted</span>} />
      <Card className="space-y-5">
        {defs.map((def) => (
          <SignalStrip key={def.key} def={def} cells={s.strips[def.key]} typical={s.signalNotes[def.key].typical} logged={s.signalNotes[def.key].logged} />
        ))}
        <div className="flex items-center gap-2 text-xs text-espresso-soft" aria-hidden>
          <span>Lower</span>
          {[1, 2, 3, 4, 5].map((l) => <span key={l} className={`h-3 w-5 rounded-[3px] ${l === 1 ? "bg-sage-1 border border-sage-2" : l === 2 ? "bg-sage-2" : l === 3 ? "bg-sage-3" : l === 4 ? "bg-sage-4" : "bg-sage-5"}`} />)}
          <span>Higher</span>
          <span className="ml-2 h-3 w-5 rounded-[3px] border border-line bg-warm-white" />
          <span>Not noted</span>
        </div>
      </Card>
    </section>
  );
}
