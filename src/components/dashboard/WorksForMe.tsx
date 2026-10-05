import Link from "next/link";
import { ArrowRight, BadgeCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { WorksForMeInsight } from "@/lib/demo/types";

const categoryLabel: Record<WorksForMeInsight["category"], string> = {
  meals: "Meals",
  products: "Products",
  supplements: "Supplements",
  sleep: "Sleep",
  movement: "Movement",
  energy: "Energy",
  hunger: "Hunger",
  cravings: "Cravings",
  digestion: "Digestion",
};

export function WorksForMe({ insights }: { insights: WorksForMeInsight[] }) {
  return (
    <Card tone="sage" className="flex h-full flex-col">
      <div className="flex items-center gap-2 text-espresso">
        <BadgeCheck className="h-5 w-5" strokeWidth={1.75} />
        <p className="text-xs font-semibold uppercase tracking-[0.18em]">
          Works For Me<sup className="text-[0.55em]">™</sup>
        </p>
      </div>
      <h2 className="mt-3 font-serif text-2xl leading-tight font-medium text-espresso">
        Here&apos;s what your body has been telling us.
      </h2>

      <ul className="mt-5 space-y-3">
        {insights.slice(0, 3).map((insight) => (
          <li key={insight.id} className="rounded-2xl border border-line bg-warm-white/80 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral">{categoryLabel[insight.category]}</Badge>
              <span className="text-xs text-espresso-soft">
                {insight.confidence === "consistent" ? "Consistent pattern" : "Emerging pattern"} · {insight.observedOver}
              </span>
            </div>
            <p className="mt-2 text-[15px] leading-relaxed text-espresso">{insight.text}</p>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-xs text-espresso-soft">
        These are patterns in your own logs, not medical conclusions. Associations, never cause and effect.
      </p>

      <Link
        href="/works-for-me"
        className="mt-4 inline-flex items-center gap-1.5 text-[15px] font-semibold text-espresso transition-colors hover:text-charcoal"
      >
        See all patterns <ArrowRight className="h-4 w-4" />
      </Link>
    </Card>
  );
}
