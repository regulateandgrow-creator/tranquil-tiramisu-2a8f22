"use client";

import { CalendarCheck, Dumbbell, Footprints, Soup } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SignalHistory } from "@/components/body/SignalHistory";
import { useDayStore } from "@/lib/store/day-store";
import { describeAverage, summarizeProgress } from "@/lib/progress/summary";
import { signalDefinitions } from "@/lib/demo/signals";
import { cn } from "@/lib/utils/cn";

const TREND_KEYS = ["energy", "sleep", "mood", "digestion"] as const;

function Tile({ icon: Icon, value, of, label, note }: { icon: typeof CalendarCheck; value: number; of: number; label: string; note: string }) {
  return (
    <Card className="flex items-start gap-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cream-deep text-espresso"><Icon className="h-[18px] w-[18px]" strokeWidth={1.75} /></span>
      <div>
        <p className="font-serif text-4xl font-medium leading-none text-espresso">{value}{" "}<span className="text-base font-normal text-espresso-soft">of {of}</span></p>
        <p className="mt-1.5 text-[15px] font-semibold text-espresso">{label}</p>
        <p className="text-sm text-espresso-soft">{note}</p>
      </div>
    </Card>
  );
}

export function ProgressPage() {
  const { checkIns, today } = useDayStore();
  const s = summarizeProgress(checkIns, today);

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <SectionHeading eyebrow="The last four weeks" title="Showing up is the progress." description="Counts, not scores. A quiet month is information too." />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Tile icon={CalendarCheck} value={s.daysLogged} of={s.windowDays} label="Days you checked in" note={s.daysLogged === 0 ? "The first tap starts the picture." : "Every tap counts, even one."} />
          <Tile icon={Soup} value={s.plateDays} of={s.windowDays} label="Days with a plate noted" note="Meals tapped in Nourish." />
          <Tile icon={Footprints} value={s.movingDays} of={s.windowDays} label="Moving days" note={s.restDays > 0 ? `Plus ${s.restDays} rest day${s.restDays === 1 ? "" : "s"}, which count.` : "Walks and chores included."} />
          <Tile icon={Dumbbell} value={s.strengthDays} of={s.windowDays} label="Strength days" note="The habit that keeps bones and muscle." />
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeading eyebrow="Week by week" title="Where the weeks landed." description="The usual rating each week, in your own words from the check-in." />
        <Card padded={false} className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-[15px]">
            <thead>
              <tr className="text-xs uppercase tracking-[0.14em] text-espresso-soft">
                <th scope="col" className="px-5 py-4 font-semibold">Signal</th>
                {s.weeks.map((w) => <th key={w.label} scope="col" className="px-3 py-4 font-semibold">{w.label}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {TREND_KEYS.map((key) => {
                const def = signalDefinitions.find((d) => d.key === key)!;
                return (
                  <tr key={key}>
                    <th scope="row" className="px-5 py-3 font-semibold text-espresso">{def.label}</th>
                    {s.weeks.map((w) => {
                      const avg = w.averages[key] ?? null;
                      const level = avg === null ? 0 : Math.round(avg);
                      return (
                        <td key={w.label} className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <span aria-hidden className={cn("h-3 w-10 rounded-[3px]", level === 0 ? "border border-line bg-warm-white" : level === 1 ? "bg-sage-1 border border-sage-2" : level === 2 ? "bg-sage-2" : level === 3 ? "bg-sage-3" : level === 4 ? "bg-sage-4" : "bg-sage-5")} />
                            <span className={avg === null ? "text-espresso-soft" : "text-espresso"}>{describeAverage(key, avg)}</span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </section>

      <section className="space-y-4">
        <SectionHeading eyebrow="Foundation this month" title="How often the basics held." description="Steady days per pillar, out of the days you noted that pillar." />
        <Card>
          <ul className="divide-y divide-line">
            {s.pillars.map((p) => {
              const pct = p.logged ? Math.round((p.steady / p.logged) * 100) : 0;
              return (
                <li key={p.key} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                  <p className="w-24 shrink-0 text-[15px] font-semibold text-espresso">{p.label}</p>
                  <div className="h-2 flex-1 overflow-hidden rounded-pill bg-cream-deep" role="meter" aria-label={`${p.label} steady days`} aria-valuemin={0} aria-valuemax={p.logged || 1} aria-valuenow={p.steady}>
                    <div className="h-full rounded-pill bg-sage-4 transition-[width] duration-700" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="w-40 shrink-0 text-right text-sm text-espresso-soft">{p.logged === 0 ? "Not noted yet" : `Steady ${p.steady} of ${p.logged} noted days`}</p>
                </li>
              );
            })}
          </ul>
        </Card>
      </section>

      <SignalHistory keys={[...TREND_KEYS]} />
      <p className="text-xs text-espresso-soft">Nothing on this page is a score. Maintenance is progress, and a gap in the strip is just a day life needed you elsewhere.</p>
    </div>
  );
}
