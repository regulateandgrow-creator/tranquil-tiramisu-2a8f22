"use client";

import { CalendarHeart, Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Chip } from "@/components/ui/Chip";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useDayStore } from "@/lib/store/day-store";
import { buildMeeting } from "@/lib/meeting/build";
import { intentions, reflections } from "@/lib/demo/meeting";
import type { TriedProduct } from "@/lib/patterns/engine";

export function WeeklyMeeting({ products }: { products: TriedProduct[] }) {
  const { checkIns, meetings, today, profile, setIntention, setReflection, sync } = useDayStore();
  const m = buildMeeting(checkIns, meetings, today, products);
  const current = meetings[m.weekStart];

  return (
    <div className="space-y-8">
      <Card tone="rose" className="space-y-2">
        <div className="flex items-center gap-2 text-espresso">
          <CalendarHeart className="h-5 w-5" strokeWidth={1.75} />
          <p className="text-xs font-semibold uppercase tracking-[0.18em]">This week&apos;s meeting · {m.label}</p>
        </div>
        <p className="font-serif text-2xl font-medium leading-tight text-espresso">Hello, {profile.firstName}. Here&apos;s what this week has looked like so far.</p>
        <p className="text-[15px] text-espresso-soft">{m.daysNoted} of {m.daysSoFar} day{m.daysSoFar === 1 ? "" : "s"} noted. {m.daysNoted === 0 ? "A quiet week is still a week. Nothing to catch up on." : "Thank you for showing up for yourself."}</p>
      </Card>

      {m.lastWeek && (
        <Card className="space-y-3" data-testid="reflection">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-espresso-soft">Last week&apos;s intention</p>
          <p className="font-serif text-xl font-medium text-espresso">You chose &ldquo;{m.lastWeek.intentionLabel}&rdquo;. How did it feel?</p>
          <div role="radiogroup" aria-label="How last week's intention felt" className="flex flex-wrap gap-2">
            {reflections.map((r) => {
              const on = m.lastWeek?.reflection === r.key;
              return (
                <Chip key={r.key} role="radio" aria-checked={on} selected={on} onClick={() => setReflection(m.lastWeek!.weekStart, on ? undefined : r.key)}>
                  {on && <Check className="mr-1.5 h-3.5 w-3.5" strokeWidth={2.5} />}{r.label}
                </Chip>
              );
            })}
          </div>
          {m.lastWeek.reply && <p className="text-[15px] text-espresso-soft animate-fade">{m.lastWeek.reply}</p>}
        </Card>
      )}

      <section className="space-y-3">
        <SectionHeading title="This week in your body" description="The usual rating this week, in your own words." />
        <Card>
          {m.signals.length === 0 ? (
            <p className="text-[15px] text-espresso-soft">No signals noted yet this week. The seven taps on Home are enough.</p>
          ) : (
            <ul className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
              {m.signals.map((s) => (
                <li key={s.key} className="flex items-baseline justify-between gap-3 border-b border-line py-2 last:border-b-0 sm:last:border-b sm:[&:nth-last-child(-n+2)]:border-b-0">
                  <span className="text-[15px] font-semibold text-espresso">{s.label}</span>
                  <span className="text-[15px] text-espresso-soft">mostly {s.typical}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section className="space-y-3">
        <SectionHeading title="The foundation this week" description="Steady days per pillar, of the days you noted it. Movement in one line." />
        <Card className="space-y-4">
          <ul className="flex flex-wrap gap-2">
            {m.pillars.map((p) => (
              <li key={p.key}>
                <Badge tone={p.noted === 0 ? "neutral" : p.steady === p.noted ? "sage" : "gold"}>{p.label} · {p.noted === 0 ? "not noted" : `steady ${p.steady} of ${p.noted}`}</Badge>
              </li>
            ))}
          </ul>
          <p className="text-[15px] text-espresso">{m.movement}</p>
        </Card>
      </section>

      <section className="space-y-3">
        <SectionHeading title="What showed up" description="From Works For Me. Associations in your own logs, never cause and effect." />
        <Card>
          {m.patterns.length === 0 ? (
            <p className="text-[15px] text-espresso-soft">Nothing to report yet. Patterns start showing after about a week of taps.</p>
          ) : (
            <ul className="space-y-3">
              {m.patterns.map((p) => (
                <li key={p.id} className="rounded-2xl border border-line bg-cream/60 p-4 text-[15px] leading-relaxed text-espresso">{p.text}</li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section className="space-y-3">
        <SectionHeading title="One thing to carry forward" description="An invitation, not an assignment." />
        <Card tone="gold"><p className="font-serif text-xl font-medium leading-snug text-espresso">{m.carry}</p></Card>
      </section>

      <section className="space-y-3">
        <SectionHeading title="Your intention for the week ahead" description="Pick one. Next week's meeting will ask how it felt." />
        <Card className="space-y-3">
          <div role="radiogroup" aria-label="Intention for the week ahead" className="flex flex-wrap gap-2">
            {intentions.map((i) => {
              const on = current?.intention === i.key;
              return (
                <Chip key={i.key} role="radio" aria-checked={on} selected={on} onClick={() => setIntention(m.weekStart, on ? undefined : i.key)}>
                  {on && <Check className="mr-1.5 h-3.5 w-3.5" strokeWidth={2.5} />}{i.label}
                </Chip>
              );
            })}
          </div>
          <p className="min-h-5 text-sm text-espresso-soft" role="status">
            {sync === "error" ? "Having trouble saving right now. Your choice is kept here and we'll try again." : current?.intention ? "Noted. Meeting adjourned whenever you like." : ""}
          </p>
        </Card>
      </section>
    </div>
  );
}
