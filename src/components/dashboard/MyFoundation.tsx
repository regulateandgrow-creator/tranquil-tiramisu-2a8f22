import Link from "next/link";
import { ArrowRight, Beef, Wheat, Droplets, Footprints, Moon, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { FoundationKey, FoundationPillar, FoundationStatus } from "@/lib/demo/types";
import { cn } from "@/lib/utils/cn";

const icons: Record<FoundationKey, LucideIcon> = {
  protein: Beef,
  fiber: Wheat,
  hydration: Droplets,
  movement: Footprints,
  sleep: Moon,
};

const statusMeta: Record<FoundationStatus, { label: string; tone: "sage" | "gold" | "rose" | "neutral"; bar: string }> = {
  building: { label: "Building", tone: "gold", bar: "from-gold to-gold/70" },
  steady: { label: "Steady", tone: "sage", bar: "from-sage to-sage/70" },
  "needs-attention": { label: "Needs attention", tone: "rose", bar: "from-rose to-rose/70" },
  "not-logged": { label: "Not logged yet", tone: "neutral", bar: "from-cream-deep to-cream-deep" },
};

function PillarRow({ pillar }: { pillar: FoundationPillar }) {
  const Icon = icons[pillar.key];
  const meta = statusMeta[pillar.status];
  const width = pillar.progress !== undefined ? Math.round(pillar.progress * 100) : 0;

  return (
    <li className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cream-deep text-espresso">
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[15px] font-semibold text-espresso">{pillar.label}</p>
          <Badge tone={meta.tone}>{meta.label}</Badge>
        </div>
        <div
          className="mt-2.5 h-2 w-full overflow-hidden rounded-pill bg-cream-deep"
          role="progressbar"
          aria-label={`${pillar.label} progress`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={width}
        >
          <div
            className={cn("h-full rounded-pill bg-gradient-to-r transition-[width] duration-700", meta.bar)}
            style={{ width: `${width}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-espresso-soft">{pillar.detail}</p>
      </div>
    </li>
  );
}

interface MyFoundationProps {
  pillars: FoundationPillar[];
  eyebrow?: string;
  title?: string;
  description?: string;
  /** Link to Nourish, shown on Home. */
  showLink?: boolean;
}

export function MyFoundation({
  pillars,
  eyebrow = "The basics that hold everything up",
  title = "My Foundation",
  description = "No scores to beat. Just a gentle picture of where today stands.",
  showLink = true,
}: MyFoundationProps) {
  return (
    <section className="space-y-4">
      <SectionHeading eyebrow={eyebrow} title={title} description={description} />
      <Card>
        <ul className="divide-y divide-line">
          {pillars.map((p) => (
            <PillarRow key={p.key} pillar={p} />
          ))}
        </ul>
        {showLink && (
          <Link href="/nourish" className="mt-5 inline-flex items-center gap-1.5 text-[15px] font-semibold text-espresso transition-colors hover:text-charcoal">
            Tap today&apos;s plate in Nourish <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </Card>
    </section>
  );
}
