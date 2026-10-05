import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { EvidenceRating, PersonalAnalysis, ProductCandidate } from "@/lib/ai/schemas";
import { goalLabel } from "@/lib/ai/goals";

const RATING_LABEL: Record<EvidenceRating, string> = {
  strong: "Strong",
  moderate: "Moderate",
  limited: "Limited",
  insufficient: "Insufficient",
  "none-found": "None found",
};
const RATING_TONE: Record<EvidenceRating, "sage" | "gold" | "rose" | "neutral"> = {
  strong: "sage",
  moderate: "sage",
  limited: "gold",
  insufficient: "rose",
  "none-found": "neutral",
};

function money(n: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}

function Section({ eyebrow, title, children, tone = "default" }: { eyebrow?: string; title: string; children: ReactNode; tone?: "default" | "sage" | "rose" | "gold" | "espresso" }) {
  const dark = tone === "espresso";
  return (
    <Card tone={tone} className="space-y-3">
      {eyebrow && <p className={dark ? "text-xs font-semibold uppercase tracking-[0.18em] text-gold" : "text-xs font-semibold uppercase tracking-[0.18em] text-espresso-soft"}>{eyebrow}</p>}
      <h2 className={dark ? "font-serif text-2xl font-medium leading-tight text-cream" : "font-serif text-2xl font-medium leading-tight text-espresso"}>{title}</h2>
      <div className={dark ? "space-y-3 text-[15px] leading-relaxed text-cream" : "space-y-3 text-[15px] leading-relaxed text-espresso"}>{children}</div>
    </Card>
  );
}

/** Renders prose that may contain [n] citation markers as superscript links. */
function Prose({ text, citations }: { text: string; citations: PersonalAnalysis["citations"] }) {
  const parts = text.split(/(\[\d+\]|\[source not confirmed\])/g);
  return (
    <p>
      {parts.map((part, i) => {
        const m = part.match(/^\[(\d+)\]$/);
        if (m) {
          const c = citations.find((x) => x.n === Number(m[1]));
          return c ? (
            <sup key={i} className="ml-0.5">
              <a href={c.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-espresso underline-offset-2 hover:underline">[{c.n}]</a>
            </sup>
          ) : (
            <sup key={i}>[{m[1]}]</sup>
          );
        }
        if (part === "[source not confirmed]") return <sup key={i} className="ml-0.5 text-rose">[source not confirmed]</sup>;
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}

export function Breakdown({ analysis, candidate, scripted }: { analysis: PersonalAnalysis; candidate: ProductCandidate | null; scripted: boolean }) {
  const c = analysis.citations;
  const title = candidate ? [candidate.brand, candidate.name, candidate.variant].filter(Boolean).join(" ") : "Your Breakdown";
  return (
    <div className="space-y-6">
      <Card tone="espresso" className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">The GROWN. Breakdown</p>
          {scripted && <Badge tone="gold">Scripted test data</Badge>}
        </div>
        <p className="text-sm text-cream/70">{title}</p>
        <h1 className="font-serif text-3xl font-medium leading-tight text-cream sm:text-4xl">{analysis.headline}</h1>
        <p className="text-sm text-cream/70">Literacy, not medical advice. For decisions about your health, talk with your clinician.</p>
      </Card>

      <Section eyebrow="1" title="What It Is"><Prose text={analysis.whatItIs} citations={c} /></Section>
      <Section eyebrow="2" title="What's Actually In It"><Prose text={analysis.whatsInIt} citations={c} /></Section>
      <Section eyebrow="3" title="What They're Selling You" tone="rose"><Prose text={analysis.whatTheyreSellingYou} citations={c} /></Section>

      <Section eyebrow="4" title="What the Evidence Says" tone="sage">
        <ul className="space-y-3">
          {analysis.whatTheEvidenceSays.map((e) => (
            <li key={e.goal} className="rounded-2xl border border-line bg-warm-white/80 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{goalLabel(e.goal)}</span>
                <Badge tone={RATING_TONE[e.rating]}>{RATING_LABEL[e.rating]}</Badge>
              </div>
              <div className="mt-2"><Prose text={e.summary} citations={c} /></div>
            </li>
          ))}
        </ul>
      </Section>

      <Section eyebrow="5" title="The Catch 👀" tone="gold">
        <ul className="list-disc space-y-2 pl-5">
          {analysis.theCatch.map((item, i) => <li key={i}><Prose text={item} citations={c} /></li>)}
        </ul>
      </Section>

      <Section eyebrow="6" title="Product Evidence vs Ingredient Evidence"><Prose text={analysis.productVsIngredientEvidence} citations={c} /></Section>

      <Section eyebrow="7" title="The Money Test 💰">
        {analysis.moneyTest.pricingAvailable ? (
          <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
            <div className="rounded-2xl bg-cream-deep p-4"><p className="text-xs uppercase tracking-wide text-espresso-soft">Per month</p><p className="font-serif text-2xl font-medium">{money(analysis.moneyTest.monthlyCost)}</p></div>
            <div className="rounded-2xl bg-cream-deep p-4"><p className="text-xs uppercase tracking-wide text-espresso-soft">Per year</p><p className="font-serif text-2xl font-medium">{money(analysis.moneyTest.annualCost)}</p></div>
          </div>
        ) : (
          <p className="text-espresso-soft">Pricing wasn&apos;t reliably available, so the money test stays open.</p>
        )}
        <Prose text={analysis.moneyTest.summary} citations={c} />
        <Badge tone="neutral">{analysis.moneyTest.premiumAssessment}</Badge>
      </Section>

      <Section eyebrow="8" title="Your Goal"><Prose text={analysis.yourGoal} citations={c} /></Section>

      <Section eyebrow="9" title="Goal Fit" tone="sage">
        <ul className="space-y-3">
          {analysis.goalFit.map((g) => (
            <li key={g.goal} className="rounded-2xl border border-line bg-warm-white/80 p-4">
              <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{goalLabel(g.goal)}</span><Badge tone="neutral">{g.verdict}</Badge></div>
              <div className="mt-2"><Prose text={g.reasoning} citations={c} /></div>
            </li>
          ))}
        </ul>
      </Section>

      <Section eyebrow="10" title="Simpler Options">
        <ul className="space-y-3">
          {analysis.simplerOptions.map((o, i) => (
            <li key={i} className="rounded-2xl border border-line bg-warm-white/80 p-4">
              <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{o.option}</span><Badge tone="neutral">{o.type.replace("-", " ")}</Badge></div>
              <div className="mt-2"><Prose text={o.why} citations={c} /></div>
            </li>
          ))}
        </ul>
      </Section>

      <Section eyebrow="Safety" title="Ask Your Clinician" tone="rose">
        <ul className="list-disc space-y-2 pl-5">{analysis.cautions.map((x, i) => <li key={i}><Prose text={x} citations={c} /></li>)}</ul>
      </Section>

      <Section eyebrow="11" title="GROWN. TAKE" tone="espresso">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {([
            ["Evidence Fit", analysis.grownTake.evidenceFit],
            ["Goal Fit", analysis.grownTake.goalFit],
            ["Value", analysis.grownTake.value],
            ["Formula Transparency", analysis.grownTake.formulaTransparency],
            ["Marketing–Evidence Gap", analysis.grownTake.marketingEvidenceGap],
          ] as const).map(([label, v]) => (
            <div key={label} className="rounded-2xl border border-cream/15 bg-cream/5 p-4">
              <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">{label}</dt>
              <dd className="mt-1 font-serif text-lg font-medium text-cream">{v.verdict}</dd>
              <dd className="mt-1 text-sm text-cream/75">{v.reasoning}</dd>
            </div>
          ))}
        </dl>
        <p className="border-t border-cream/15 pt-3 font-serif text-xl text-cream">One thing to take with you: {analysis.oneThingLearned}</p>
      </Section>

      {c.length > 0 && (
        <Card className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-espresso-soft">Sources</p>
          <ol className="space-y-1 text-sm">
            {c.map((s) => (
              <li key={s.n}>
                <span className="font-semibold">[{s.n}]</span>{" "}
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-espresso underline-offset-2 hover:underline break-all">{s.title || s.url}</a>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  );
}
