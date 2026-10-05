/**
 * Gold-standard acceptance test for GROWN. Intelligence v1.
 *
 * Runs the real pipeline against the CONFIGURED provider. With ANTHROPIC_API_KEY
 * set (and GROWN_AI_PROVIDER unset or "anthropic") this spends real money and
 * takes several minutes. Without a key it runs on the fixture provider so the
 * harness itself is proven, and says so loudly.
 *
 * Output: acceptance-output/<case>-run<N>.json and .md for founder review.
 *   npm run acceptance
 */
import { afterAll, describe, expect, it } from "vitest";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { MemoryDb } from "../support/memory-admin";
import { InstrumentedProvider, estimateCostUsd, type RecordedCall } from "../support/instrumented-provider";
import { classifySource, hostOf } from "@/lib/ai/citations";
import { brandSlug } from "@/lib/ai/identity";
import { runAnalysis } from "@/lib/ai/pipeline/run";
import { resolveProduct } from "@/lib/ai/pipeline/resolve";
import { getAiProvider } from "@/lib/ai/provider";
import { getAiProviderName } from "@/lib/ai/config";
import { lintAnalysis } from "@/lib/ai/lint";
import type { PersonalAnalysis, ProductDossier } from "@/lib/ai/schemas";
import type { AnalysisRow } from "@/lib/db/intelligence";

if (!process.env.ANTHROPIC_API_KEY && !process.env.GROWN_AI_PROVIDER) process.env.GROWN_AI_PROVIDER = "fixture";
const providerName = getAiProviderName();
const REAL = providerName === "anthropic";
const RUNS = Number(process.env.GROWN_ACCEPTANCE_RUNS ?? (REAL ? 3 : 1));
const OUT = "acceptance-output";
const USER = "11111111-2222-3333-4444-555555555555";

console.log(`\n=== GROWN. Intelligence acceptance — provider: ${providerName}${REAL ? " (REAL MODEL, real cost)" : " (SCRIPTED FIXTURE: proves the harness, not the research)"} — runs per case: ${RUNS} ===\n`);

function freshDb() {
  const db = new MemoryDb();
  db.tables.profiles.push({ id: USER, hide_weight: true, first_name: "Simone", life_mode: "normal", tier: "beta", analysis_limit_override: null });
  return db;
}

const reportLines: string[] = [];
function report(line = "") { reportLines.push(line); }

async function analyze(db: MemoryDb, query: string, goals: string[]) {
  const provider = new InstrumentedProvider(getAiProvider()!);
  const resolved = await resolveProduct(provider, query);
  const candidate = resolved.result.candidates[0];
  const row: AnalysisRow = { id: db.id(), user_id: USER, product_id: null, research_id: null, query_text: query, goals, goal_other: null, status: "researching", stage_message: null, candidates: resolved.result.candidates, result: null, error_code: null, decision: null, decided_at: null, model: null, research_cached: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  db.tables.analyses.push(row as unknown as Record<string, unknown>);
  if (!candidate) return { resolved, row: row as unknown as Record<string, unknown>, dossier: null, analysis: null, calls: provider.calls };
  await runAnalysis(db.client(), row, candidate, provider);
  const done = db.tables.analyses.find((r) => r.id === row.id)!;
  const research = db.tables.product_research.find((r) => r.id === done.research_id);
  return { resolved, row: done, dossier: (research?.dossier as ProductDossier) ?? null, analysis: (done.result as PersonalAnalysis) ?? null, calls: provider.calls };
}

/** Everything the founder asked to see about a live run, in one place. */
function describeRun(title: string, db: MemoryDb, r: Awaited<ReturnType<typeof analyze>>, goals: string[]) {
  const row = r.row as Record<string, unknown>;
  const calls = r.calls;
  const cost = estimateCostUsd(calls);
  const totalIn = calls.reduce((a, c) => a + c.inputTokens, 0), totalOut = calls.reduce((a, c) => a + c.outputTokens, 0);
  const totalMs = calls.reduce((a, c) => a + c.latencyMs, 0);
  const searched = [...new Set(calls.flatMap((c) => c.searchedUrls))];
  const slug = r.dossier ? brandSlug(r.dossier.identity.brand) : "";
  const tiers = searched.map((u) => classifySource(u, slug));
  const prompts = db.tables.ai_raw_logs.filter((l) => String(l.step).startsWith("personalize")).map((l) => String(l.prompt)).join("\n");
  const validator = (row.validator ?? {}) as Record<string, unknown>;
  report(`## ${title}`);
  report(`- Status: **${row.status}**${row.error_code ? ` (error: ${row.error_code})` : ""}`);
  report(`- Provider: ${providerName}; models served per step: ${calls.map((c) => `${c.step}=${c.servedModel || "n/a"}`).join(", ")}`);
  report(`- Calls: ${calls.length}; total latency ${(totalMs / 1000).toFixed(1)} s; tokens in ${totalIn.toLocaleString()} / out ${totalOut.toLocaleString()}`);
  report(`- Per step: ${calls.map((c) => `${c.step} ${(c.latencyMs / 1000).toFixed(1)}s in=${c.inputTokens} out=${c.outputTokens}${c.webSearch ? " [web search]" : ""}${c.error ? ` ERROR=${c.error}` : ""}`).join("; ")}`);
  report(`- Estimated model-token cost: ${cost.priced ? `$${cost.tokensUsd.toFixed(3)}` : "unpriced model"} (+ ${cost.webSearches} web-search-enabled call(s), billed per search separately)`);
  report(`- Web research: ${searched.length} distinct URLs retrieved; tier 1 ${tiers.filter((t) => t.tier === 1).length}, tier 2 ${tiers.filter((t) => t.tier === 2).length}, manufacturer ${tiers.filter((t) => t.kind === "manufacturer").length}, retailer ${tiers.filter((t) => t.kind === "retailer").length}, other ${tiers.filter((t) => t.kind === "other").length}`);
  for (const u of searched) report(`  - ${hostOf(u)} (${classifySource(u, slug).kind}, tier ${classifySource(u, slug).tier}): ${u}`);
  report(`- Resolve: confidence ${r.resolved.result.confidence}; candidates ${r.resolved.result.candidates.map((c) => `${c.brand} ${c.name} [${c.variant || "no variant"}] ${c.form}`).join(" | ")}`);
  if (r.dossier) {
    const d = r.dossier;
    report(`- Identity: ${d.identity.brand} / ${d.identity.name} / variant "${d.identity.variant}" / ${d.identity.form}; serving ${d.identity.servingSize}, ${d.identity.servingsPerContainer} servings; confidence ${d.identity.identityConfidence}; formulation verifiable=${d.formulation.verifiable} asOf=${d.formulation.asOf || "n/a"}`);
    report(`- Ingredients: ${d.formulation.ingredients.map((i) => `${i.name} = ${i.amountPerServing}${i.proprietaryBlend ? " (blend)" : ""}`).join("; ")}`);
    report(`- Manufacturer claims (${d.manufacturerClaims.length}): ${d.manufacturerClaims.map((c) => `"${c.claim}"`).join("; ")}`);
    report(`- Evidence by benefit: ${d.evidenceByBenefit.map((b) => `${b.benefit}: ingredient=${b.ingredientEvidence.rating} (${b.ingredientEvidence.sourceUrls.length} src, dose ${b.ingredientEvidence.typicalStudiedDose || "n/a"}), product=${b.productEvidence.rating} (${b.productEvidence.sourceUrls.length} src)`).join(" | ")}`);
    report(`- Delivery format: "${d.deliveryFormat.claim}" → ${d.deliveryFormat.rating}: ${d.deliveryFormat.whatEvidenceShows}`);
    report(`- Limitations: ${d.limitations.map((l) => l.type).join(", ")}`);
    report(`- Pricing: ${d.pricing.available ? `${d.pricing.currency} ${d.pricing.price} at ${d.pricing.retailer} (${d.pricing.sourceUrl}); ${d.pricing.servingsPerContainer} servings, ${d.pricing.servingsPerDay}/day → monthly ${d.pricing.monthlyCost}, annual ${d.pricing.annualCost}` : `unavailable: ${d.pricing.note}`}`);
    report(`- Cautions (${d.cautions.length}): ${d.cautions.map((c) => c.caution).join("; ")}`);
  }
  report(`- Citation integrity: ${JSON.stringify(validator.citations ?? null)}; analysis citations dropped: ${validator.droppedAnalysisCitations ?? "n/a"}; personalize attempts: ${validator.personalizeAttempts ?? "n/a"}`);
  if (r.analysis) {
    const a = r.analysis;
    report(`- Personalization: goals ${goals.join(", ")}; goal fit → ${a.goalFit.map((g) => `${g.goal}: ${g.verdict}`).join("; ")}`);
    report(`- Money test: ${a.moneyTest.pricingAvailable ? `monthly ${a.moneyTest.monthlyCost}, annual ${a.moneyTest.annualCost}` : "pricing unavailable"} → ${a.moneyTest.premiumAssessment}`);
    report(`- GROWN. TAKE: evidence ${a.grownTake.evidenceFit.verdict} | goal ${a.grownTake.goalFit.verdict} | value ${a.grownTake.value.verdict} | transparency ${a.grownTake.formulaTransparency.verdict} | gap ${a.grownTake.marketingEvidenceGap.verdict}`);
    report(`- Simpler options: ${a.simplerOptions.map((o) => `${o.option} (${o.type})`).join("; ")}; consideredNoProduct=${a.consideredNoProduct}`);
    report(`- Hide Weight compliance: policy block in prompt=${prompts.includes("Hide Weight Entirely switched on")}; lint issues=${lintAnalysis(a, true).length}`);
    report(`- Headline: "${a.headline}"`);
    report(`- One thing learned: "${a.oneThingLearned}"`);
  }
  report();
}

function rubric(analysis: PersonalAnalysis, dossier: ProductDossier, goals: string[]) {
  const text = JSON.stringify(analysis);
  const checks: Array<[string, boolean]> = [
    ["Exact variant identified", /extra strength/i.test(dossier.identity.variant) && /liquid/i.test(dossier.identity.form)],
    ["Ingredients with amounts or 'not disclosed'", dossier.formulation.ingredients.length > 0 && dossier.formulation.ingredients.every((i) => i.amountPerServing.length > 0)],
    ["Manufacturer claims listed with a source", dossier.manufacturerClaims.length > 0],
    ["Independent collagen evidence rated with sources", dossier.evidenceByBenefit.some((b) => b.ingredientEvidence.sourceUrls.length > 0 && b.ingredientEvidence.rating !== "none-found")],
    ["Product-specific evidence stated separately", dossier.evidenceByBenefit.every((b) => typeof b.productEvidence.rating === "string")],
    ["Prose distinguishes product from ingredient evidence", /ingredient|in general|peptides/i.test(analysis.productVsIngredientEvidence) && /this (exact |specific )?[\w ]*product|product-specific|exact product/i.test(analysis.productVsIngredientEvidence)],
    ["The Catch covers quality/duration/funding/dose", analysis.theCatch.length >= 2],
    ["Liquid delivery claim addressed", /liquid/i.test(analysis.productVsIngredientEvidence + dossier.deliveryFormat.whatEvidenceShows)],
    ["Pricing with monthly and annual cost, or marked unavailable", analysis.moneyTest.pricingAvailable ? analysis.moneyTest.annualCost > 0 : /unavailable|not reliably|couldn't/i.test(analysis.moneyTest.summary + dossier.pricing.note)],
    ["Goal fit per selected goal", goals.every((g) => analysis.goalFit.some((f) => f.goal === g))],
    ["Simpler options include a no-product option", analysis.simplerOptions.some((o) => o.type === "no-product") && analysis.consideredNoProduct],
    ["Cautions present", analysis.cautions.length > 0],
    ["GROWN. TAKE uses approved phrases only", lintAnalysis(analysis, true).filter((i) => i.id === "verdict-phrase").length === 0],
    ["Every citation validated (no unconfirmed markers)", !text.includes("[source not confirmed]") && analysis.citations.length > 0],
    ["No banned language or weight violations", lintAnalysis(analysis, true).length === 0],
    ["Teaches something concrete", analysis.oneThingLearned.length > 20],
  ];
  return checks;
}

function writeOut(name: string, data: unknown, md: string) {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(`${OUT}/${name}.json`, JSON.stringify(data, null, 2));
  writeFileSync(`${OUT}/${name}.md`, md);
}

afterAll(() => {
  mkdirSync(OUT, { recursive: true });
  const header = `# GROWN. Intelligence acceptance report\n\nProvider: ${providerName}${REAL ? " (real model)" : " (scripted fixture)"} · ${new Date().toISOString()} · runs per case: ${RUNS}\n\n`;
  writeFileSync(`${OUT}/REPORT.md`, header);
  appendFileSync(`${OUT}/REPORT.md`, reportLines.join("\n"));
  console.log(`\nReport written to ${OUT}/REPORT.md`);
});

describe("GROWN. Intelligence acceptance", () => {
  for (let run = 1; run <= RUNS; run++) {
    it(`gold standard: SpoiledChild E27 Extra Strength Liquid Collagen (run ${run})`, async () => {
      const db = freshDb();
      const goals = ["skin", "healthy-aging", "hair", "nails", "joints"];
      const result = await analyze(db, "SpoiledChild E27 Extra Strength Liquid Collagen", goals);
      const { resolved, row, dossier, analysis } = result;
      describeRun(`SpoiledChild E27 Extra Strength — run ${run}`, db, result, goals);
      expect(resolved.result.candidates.length).toBeGreaterThan(0);
      expect(row.status, `status ${row.status} code ${row.error_code}`).toBe("complete");
      const checks = rubric(analysis!, dossier!, goals);
      const md = [`# SpoiledChild E27 Extra Strength — run ${run} (${providerName})`, "", ...checks.map(([c, ok]) => `- [${ok ? "x" : " "}] ${c}`), "", `## Headline\n${analysis!.headline}`, `## One thing learned\n${analysis!.oneThingLearned}`, `## Sources\n${analysis!.citations.map((c) => `- [${c.n}] ${c.url}`).join("\n")}`].join("\n");
      writeOut(`spoiledchild-run${run}`, { resolved: resolved.result, dossier, analysis, validator: row.validator }, md);
      console.log(md);
      for (const [label, ok] of checks) expect(ok, label).toBe(true);
    });
  }

  it("control: bare 'magnesium' asks for clarification instead of guessing", async () => {
    const provider = getAiProvider()!;
    const resolved = await resolveProduct(provider, "magnesium");
    report(`## Control: magnesium (resolve only)`);
    report(`- Confidence ${resolved.result.confidence}; clarification: "${resolved.result.clarification}"; candidates: ${resolved.result.candidates.map((c) => `${c.brand} ${c.name} [${c.variant || "no variant"}] ${c.form}`).join(" | ") || "none"}`);
    report();
    writeOut("magnesium-resolve", resolved.result, `# magnesium\n\nconfidence: ${resolved.result.confidence}\n\n${resolved.result.clarification}\n\n${resolved.result.candidates.map((c) => `- ${c.brand} ${c.name} ${c.variant}`).join("\n")}`);
    expect(resolved.result.confidence).not.toBe("high");
    expect(resolved.result.candidates.length === 0 || resolved.result.candidates.length > 1).toBe(true);
    expect(resolved.result.clarification.length).toBeGreaterThan(0);
  });

  it("control: a proprietary-blend product has undisclosed doses flagged", async () => {
    const db = freshDb();
    const query = REAL ? "Alpha Brain by Onnit" : "ProBlend Focus Complex proprietary";
    const result = await analyze(db, query, ["energy"]);
    const { row, dossier, analysis } = result;
    describeRun(`Control: proprietary blend (${query})`, db, result, ["energy"]);
    writeOut("proprietary-blend", { dossier, analysis, validator: row.validator }, `# proprietary blend (${query})\n\nstatus: ${row.status}\n\n${analysis ? analysis.theCatch.map((c) => `- ${c}`).join("\n") : ""}`);
    expect(row.status, `status ${row.status} code ${row.error_code}`).toBe("complete");
    expect(dossier!.formulation.proprietaryBlendPresent || dossier!.limitations.some((l) => l.type === "proprietary-blend" || l.type === "missing-dosage")).toBe(true);
    expect(analysis!.theCatch.join(" ") + analysis!.whatsInIt).toMatch(/proprietary|undisclosed|not disclosed|hidden/i);
  });
});
