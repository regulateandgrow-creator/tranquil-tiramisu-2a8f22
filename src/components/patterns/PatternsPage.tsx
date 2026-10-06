"use client";

import { BadgeCheck, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useDayStore } from "@/lib/store/day-store";
import { findPatterns, type TriedProduct } from "@/lib/patterns/engine";
import type { WorksForMeInsight } from "@/lib/demo/types";

const CATEGORY: Record<WorksForMeInsight["category"], string> = {
  meals: "Meals", products: "Products", supplements: "Supplements", sleep: "Sleep", movement: "Movement", energy: "Energy", hunger: "Hunger", cravings: "Cravings", digestion: "Digestion",
};

const MIN_DAYS_FOR_PATTERNS = 7;

export function PatternsPage({ products }: { products: TriedProduct[] }) {
  const { checkIns, today } = useDayStore();
  const { insights, loggedDays, windowDays } = findPatterns({ checkIns, today, products });
  const consistent = insights.filter((i) => i.confidence === "consistent");
  const emerging = insights.filter((i) => i.confidence === "emerging");

  return (
    <div className="space-y-8">
      <Card tone="sage" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-espresso">Your logs, read back to you</p>
          <p className="mt-1 max-w-prose text-[15px] text-espresso">
            {loggedDays} of the last {windowDays} days have something noted. Patterns need at least {MIN_DAYS_FOR_PATTERNS} to start appearing, and get steadier with more.
          </p>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-pill bg-warm-white/80 sm:w-48" role="progressbar" aria-label="Days logged" aria-valuemin={0} aria-valuemax={windowDays} aria-valuenow={loggedDays}>
          <div className="h-full rounded-pill bg-sage transition-[width] duration-700" style={{ width: `${Math.round((loggedDays / windowDays) * 100)}%` }} />
        </div>
      </Card>

      {insights.length === 0 ? (
        <Card className="space-y-3">
          <p className="font-serif text-2xl font-medium leading-tight text-espresso">Nothing to report yet. That&apos;s normal.</p>
          <p className="max-w-prose text-[15px] text-espresso-soft">
            {loggedDays < MIN_DAYS_FOR_PATTERNS
              ? "Keep tapping your check-ins, plate and movement. After about a week, this page starts noticing what tends to show up alongside what."
              : "Your days look fairly even so far, which is its own kind of information. Patterns appear when some days differ from others by enough to mention."}
          </p>
        </Card>
      ) : (
        <>
          {consistent.length > 0 && <InsightList title="Consistent patterns" blurb="Seen often enough, and clearly enough, to trust as a tendency." items={consistent} />}
          {emerging.length > 0 && <InsightList title="Emerging patterns" blurb="Early signals. Worth noticing, not yet worth reorganising your week around." items={emerging} />}
        </>
      )}

      <Card className="space-y-3">
        <div className="flex items-center gap-2 text-espresso">
          <Sparkles className="h-5 w-5 text-gold" strokeWidth={1.75} />
          <p className="text-xs font-semibold uppercase tracking-[0.18em]">How we look for patterns</p>
        </div>
        <ul className="space-y-2 text-[15px] text-espresso-soft">
          <li>We compare your ratings on days with something (a protein anchor, a walk, a drink) against days without it, inside the last {windowDays} days.</li>
          <li>A pattern is mentioned only with at least three logged days on each side and a clear difference. Sleep is paired with the night that followed.</li>
          <li>Products you&apos;re trying are compared before and since the day you decided to try them.</li>
          <li>These are associations in your own logs, never cause and effect, and never medical conclusions. Bring anything that worries you to your clinician.</li>
        </ul>
      </Card>
    </div>
  );
}

function InsightList({ title, blurb, items }: { title: string; blurb: string; items: WorksForMeInsight[] }) {
  return (
    <section className="space-y-3">
      <SectionHeading title={title} description={blurb} />
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {items.map((i) => (
          <li key={i.id}>
            <Card className="flex h-full flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={i.confidence === "consistent" ? "sage" : "gold"}>{CATEGORY[i.category]}</Badge>
                <span className="text-xs text-espresso-soft">{i.confidence === "consistent" ? "Consistent" : "Emerging"} · {i.observedOver}</span>
              </div>
              <p className="text-[15px] leading-relaxed text-espresso">{i.text}</p>
              {i.confidence === "consistent" && <BadgeCheck className="h-4 w-4 text-sage" strokeWidth={1.75} aria-hidden />}
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
