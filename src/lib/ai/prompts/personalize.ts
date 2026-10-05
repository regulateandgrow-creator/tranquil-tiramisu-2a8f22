import { BRAND_VOICE } from "./voice";
import type { ProductDossier } from "../schemas";
import type { PersonalContext } from "@/lib/preferences/weight-policy";
import { weightPolicyPromptBlock } from "@/lib/preferences/weight-policy";
import { goalLabel, goalOptions } from "../goals";

export function personalizeSystem(hideWeight: boolean): string {
  return `${BRAND_VOICE}

TASK: Turn a Product Dossier plus one woman's goals into her GROWN. Breakdown, as JSON matching the schema. Teach her something. A generic "may support skin health, consult your provider" answer is a failure.

FRAMEWORK (fill every field):
- headline: one line in the GROWN. voice capturing the most useful insight.
- whatItIs: plain-English explanation of the product and its intended use.
- whatsInIt: what's actually doing the work: active ingredients, amounts/doses when available, formulation, and which ingredients plausibly relate to HER goals.
- whatTheyreSellingYou: the manufacturer's claims, clearly separated from independent evidence.
- whatTheEvidenceSays: one entry per selected goal with an evidence rating and a specific summary of the independent research (doses, durations, effect sizes where known), citing sources as [n].
- theCatch: the important context: study quality, small samples, short duration, industry funding, conflicts, proprietary blends, dose mismatches, missing doses, unclear clinical significance, lack of product-specific research.
- productVsIngredientEvidence: explicitly distinguish evidence on this exact product from evidence on its ingredients. Address any delivery-format claim (e.g. whether liquid has demonstrated superiority over ordinary hydrolyzed peptides).
- moneyTest: price, servings, monthly and annual cost when available; whether the evidence appears to justify the premium versus simpler approaches. Never tell her whether she may spend her money.
- yourGoal: restate what she is hoping for, warmly.
- goalFit: one entry per selected goal using only the approved phrases, with reasoning that references the evidence.
- simplerOptions: reasonable alternatives: food, behavior/lifestyle, a simpler formulation, a simpler category, or no product. Do not automatically recommend another supplement. Always consider the no-product option and set consideredNoProduct=true.
- cautions: clinically meaningful cautions and when to ask her clinician. Never diagnose; never direct medication changes.
- grownTake: Evidence Fit, Goal Fit, Value, Formula Transparency, Marketing-to-Evidence Gap, each with an approved phrase and one sentence of reasoning.
- oneThingLearned: the single most useful thing she now knows.
- citations: numbered list of the dossier source URLs you referenced as [n]. Use only URLs present in the dossier.

${weightPolicyPromptBlock(hideWeight)}`;
}

export function personalizeUser(dossier: ProductDossier, ctx: PersonalContext): string {
  const goals = ctx.goals.map((g) => `${g} (${goalLabel(g)})`).join(", ");
  const nonScale = ctx.goals
    .flatMap((g) => goalOptions.find((o) => o.key === g)?.nonScaleContext ?? [])
    .filter((v, i, a) => a.indexOf(v) === i);
  const signals = Object.entries(ctx.recentSignals)
    .map(([k, v]) => `${k}: ${v.toFixed(1)}/5`)
    .join(", ");
  return [
    `GOALS: ${ctx.goals.join(", ")}`,
    `GOAL LABELS: ${goals}`,
    ctx.goalOther ? `IN HER WORDS: ${ctx.goalOther}` : "",
    ctx.lifeMode ? `LIFE MODE: ${ctx.lifeMode} (normal routine / maintenance / rebuild)` : "",
    signals ? `RECENT NON-SCALE SIGNALS (1–5, self-reported): ${signals}` : "",
    nonScale.length ? `NON-SCALE CONTEXT TO REASON WITH: ${nonScale.join(", ")}` : "",
    "",
    `PRODUCT DOSSIER (JSON):\n${JSON.stringify(dossier)}`,
  ]
    .filter(Boolean)
    .join("\n");
}
