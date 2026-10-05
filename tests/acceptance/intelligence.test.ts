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
import { InstrumentedProvider, estimateCostUsd } from "../support/instrumented-provider";
import { classifySource, hostOf } from "@/lib/ai/citations";
import { brandSlug } from "@/lib/ai/identity";
import { runAnalysis } from "@/lib/ai/pipeline/run";
import { resolveProduct } from "@/lib/ai/pipeline/resolve";
import { getAiProvider } from "@/lib/ai/provider";
import { getAiProviderName } from "@/lib/ai/config";
import { lintAnalysis } from "@/lib/ai/lint";
import type { PersonalAnalysis, ProductDossier } from "@/lib/ai/schemas";
import type { AnalysisRow } from "@/lib/db/intelligence";

if (!process.env.GROWN_ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY && !process.env.GROWN_AI_PROVIDER) process.env.GROWN_AI_PROVIDER = "fixture";
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
  const cacheRead = calls.reduce((a, c) => a + c.cacheReadTokens, 0), cacheWrite = calls.reduce((a, c) => a + c.cacheWriteTokens, 0);
  report(`- Cost: ${cost.priced ? `$${cost.totalUsd.toFixed(3)} total = $${cost.tokensUsd.toFixed(3)} tokens + $${cost.searchUsd.toFixed(3)} for ${cost.webSearches} web searches` : "unpriced model"}; prompt cache read ${cacheRead.toLocaleString()} / write ${cacheWrite.toLocaleString()} tokens; GROWN_AI_PROMPT_CACHE=${process.env.GROWN_AI_PROMPT_CACHE ?? "off"}`);
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
  if (r.dossier) {
    const d = r.dossier;
    const independent = tiers.filter((t) => t.kind === "independent").length;
    const evidenceSrc = new Set(d.evidenceByBenefit.flatMap((b) => [...b.ingredientEvidence.sourceUrls, ...b.productEvidence.sourceUrls]));
    const unknownKept = [...evidenceSrc].filter((u) => classifySource(u, slug).kind === "other");
    const mfrPrice = !!d.pricing.sourceUrl && classifySource(d.pricing.sourceUrl, slug).kind === "manufacturer";
    const undisclosed = d.formulation.ingredients.filter((i) => !i.disclosed);
    report(`- VERIFY search allocation to independent evidence: ${independent} independent of ${searched.length} retrieved URLs (${searched.length ? Math.round((independent / searched.length) * 100) : 0}%); evidence entries with ≥1 source: ${d.evidenceByBenefit.filter((b) => b.ingredientEvidence.sourceUrls.length > 0).length}/${d.evidenceByBenefit.length}`);
    report(`- VERIFY manufacturer pricing preferred: ${d.pricing.available ? (mfrPrice ? "YES, price taken from manufacturer page" : `NO, price from ${hostOf(d.pricing.sourceUrl) || "unknown"}; manufacturer URLs retrieved: ${searched.filter((u) => classifySource(u, slug).kind === "manufacturer").length}`) : "pricing unavailable"}`);
    report(`- VERIFY journal domains survive validation: ${unknownKept.length} unrecognized-host evidence URL(s) kept (${unknownKept.map(hostOf).join(", ") || "none"}); removed from evidence as manufacturer/retailer: ${(validator.citations as { manufacturerInEvidence?: string[] } | undefined)?.manufacturerInEvidence?.length ?? 0}`);
    report(`- VERIFY "not disclosed" labelling: ${undisclosed.length} undisclosed ingredient(s), all labelled: ${undisclosed.every((i) => /not disclosed/i.test(i.amountPerServing))}`);
    report(`- VERIFY identity accuracy: ${d.identity.brand} ${d.identity.name}${d.identity.variant ? ` [${d.identity.variant}]` : ""} (${d.identity.form}), confidence ${d.identity.identityConfidence}; resolve candidates offered: ${r.resolved.result.candidates.length}`);
  }
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
    // Taxonomy clarification (founder-approved 2026-10-05): the strength/designation passes when it is
    // correctly represented in the canonical identity, whether in the product name or a distinct variant.
    ["Exact identity incl. strength designation", /extra strength/i.test(`${dossier.identity.name} ${dossier.identity.variant}`) && /liquid/i.test(dossier.identity.form)],
    ["Ingredients with amounts or 'not disclosed'", dossier.formulation.ingredients.length > 0 && dossier.formulation.ingredients.every((i) => i.amountPerServing.length > 0) && dossier.formulation.ingredients.every((i) => i.disclosed || /not disclosed/i.test(i.amountPerServing))],
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

const CACHE_BENCH = process.env.GROWN_ACCEPTANCE_MODE === "cache-bench";

describe.runIf(CACHE_BENCH)("Prompt-caching experiment (measured only)", () => {
  it("runs the same gold case with caching off, then on, and compares", async () => {
    const goals = ["skin", "healthy-aging", "hair", "nails", "joints"];
    const results: Array<{ mode: string; r: Awaited<ReturnType<typeof analyze>>; db: MemoryDb }> = [];
    // GROWN_CACHE_BENCH_MODES=on runs a single leg (e.g. when a cache-off baseline already exists).
    const modes = (process.env.GROWN_CACHE_BENCH_MODES ?? "off,on").split(",").map((m) => m.trim()).filter(Boolean);
    for (const mode of modes) {
      process.env.GROWN_AI_PROMPT_CACHE = mode;
      const db = freshDb();
      const r = await analyze(db, "SpoiledChild E27 Extra Strength Liquid Collagen", goals);
      describeRun(`Cache experiment — GROWN_AI_PROMPT_CACHE=${mode}`, db, r, goals);
      results.push({ mode, r, db });
      writeOut(`cache-bench-${mode}`, { calls: r.calls, dossier: r.dossier, analysis: r.analysis, validator: (r.row as Record<string, unknown>).validator }, `# cache ${mode}`);
    }
    report(`## Cache experiment comparison`);
    for (const { mode, r } of results) {
      const cost = estimateCostUsd(r.calls);
      const research = r.calls.find((c) => c.step === "research");
      const checks = r.analysis && r.dossier ? rubric(r.analysis, r.dossier, goals) : [];
      report(`- ${mode}: status ${(r.row as Record<string, unknown>).status}; total $${cost.totalUsd.toFixed(3)}; research step ${research ? `${(research.latencyMs / 1000).toFixed(0)} s, in ${research.inputTokens.toLocaleString()}, cache read ${research.cacheReadTokens.toLocaleString()}, write ${research.cacheWriteTokens.toLocaleString()}, searches ${research.webSearchRequests}` : "n/a"}; rubric ${checks.filter(([, ok]) => ok).length}/${checks.length}; URLs ${[...new Set(r.calls.flatMap((c) => c.searchedUrls))].length}`);
    }
    report();
    process.env.GROWN_AI_PROMPT_CACHE = "off";
    for (const { r } of results) expect((r.row as Record<string, unknown>).status).toBe("complete");
  });
});

describe.skipIf(CACHE_BENCH)("GROWN. Intelligence acceptance", () => {
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
      // Second woman, same product, within the cache window: only Personalize runs.
      const repeat = await analyze(db, "SpoiledChild E27 Extra Strength Liquid Collagen", ["joints", "skin"]);
      const repeatRow = repeat.row as Record<string, unknown>;
      const repeatCost = estimateCostUsd(repeat.calls);
      const repeatMs = repeat.calls.reduce((a, c) => a + c.latencyMs, 0);
      report(`### Cached personalization (same product, different goals) — run ${run}`);
      report(`- Status ${repeatRow.status}; research_cached=${repeatRow.research_cached}; steps: ${repeat.calls.map((c) => c.step).join(", ")}; latency ${(repeatMs / 1000).toFixed(1)} s; cost ${repeatCost.priced ? `$${repeatCost.totalUsd.toFixed(3)}` : "unpriced"}`);
      report();
      expect(repeatRow.research_cached, "repeat analysis should reuse the cached dossier").toBe(true);
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
