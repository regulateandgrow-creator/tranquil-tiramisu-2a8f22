import { beforeEach, describe, expect, it } from "vitest";
import { MemoryDb } from "../support/memory-admin";
import { runAnalysis } from "@/lib/ai/pipeline/run";
import { resolveProduct } from "@/lib/ai/pipeline/resolve";
import { FixtureProvider } from "@/lib/ai/provider/fixture";
import { checkUsage } from "@/lib/ai/pipeline/usage";
import type { AnalysisRow } from "@/lib/db/intelligence";

process.env.GROWN_AI_PROVIDER = "fixture";

const USER = "11111111-2222-3333-4444-555555555555";

function analysisRow(db: MemoryDb, query: string, goals: string[], goalOther: string | null = null): AnalysisRow {
  const row = { id: db.id(), user_id: USER, product_id: null, research_id: null, query_text: query, goals, goal_other: goalOther, status: "researching" as const, stage_message: null, candidates: null, result: null, error_code: null, decision: null, decided_at: null, model: null, research_cached: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  db.tables.analyses.push(row);
  return row;
}

const SPOILED = { brand: "SpoiledChild", name: "E27 Liquid Collagen", variant: "Extra Strength", form: "liquid", category: "collagen supplement", note: "" };

describe("pipeline: Resolve → Research → Personalize with the fixture provider", () => {
  let db: MemoryDb;
  beforeEach(() => {
    db = new MemoryDb();
    db.tables.profiles.push({ id: USER, hide_weight: true, first_name: "Simone", life_mode: "normal", tier: "beta", analysis_limit_override: null });
  });

  it("resolve asks for confirmation on a bare ingredient and is confident on a named product", async () => {
    const p = new FixtureProvider();
    const mag = await resolveProduct(p, "magnesium");
    expect(mag.result.confidence).toBe("low");
    expect(mag.result.candidates.length).toBeGreaterThan(1);
    expect(mag.result.clarification).toMatch(/which product/i);
    const sc = await resolveProduct(p, "SpoiledChild E27 Extra Strength Liquid Collagen");
    expect(sc.result.confidence).toBe("high");
    expect(sc.result.candidates[0].variant).toBe("Extra Strength");
  });

  it("completes the gold-standard case, validates citations, and caches the dossier for the next woman", async () => {
    const admin = db.client();
    const a1 = analysisRow(db, "spoiledchild e27 extra strength liquid collagen", ["skin", "healthy-aging", "hair", "nails", "joints"]);
    await runAnalysis(admin, a1, SPOILED);
    const r1 = db.tables.analyses.find((r) => r.id === a1.id)!;
    expect(r1.status).toBe("complete");
    expect(r1.research_cached).toBe(false);
    const result = r1.result as { citations: Array<{ url: string }>; grownTake: Record<string, { verdict: string }> };
    expect(JSON.stringify(result)).not.toContain("example-fake-journal.org");
    expect(result.citations.length).toBe(4);
    expect(db.tables.product_research.length).toBe(1);
    expect(db.tables.ai_raw_logs.length).toBeGreaterThan(0);
    expect(db.tables.ai_raw_logs.every((l) => typeof l.expires_at === "string")).toBe(true);

    const a2 = analysisRow(db, "spoiledchild e27", ["joints"]);
    await runAnalysis(admin, a2, SPOILED);
    const r2 = db.tables.analyses.find((r) => r.id === a2.id)!;
    expect(r2.status).toBe("complete");
    expect(r2.research_cached).toBe(true);
    expect(db.tables.product_research.length).toBe(1); // shared, not duplicated
    expect(r2.result).not.toEqual(r1.result); // personal analyses differ by goals
  });

  it("re-researches when the cached dossier is stale and stores a new version", async () => {
    const admin = db.client();
    const a1 = analysisRow(db, "spoiledchild e27", ["skin"]);
    await runAnalysis(admin, a1, SPOILED);
    db.tables.product_research[0].stale = true;
    const a2 = analysisRow(db, "spoiledchild e27", ["skin"]);
    await runAnalysis(admin, a2, SPOILED);
    expect(db.tables.product_research.map((r) => r.version)).toEqual([1, 2]);
    expect(db.tables.analyses.find((r) => r.id === a2.id)!.research_id).toBe(db.tables.product_research[1].id);
  });

  it("flags undisclosed doses for a proprietary-blend product", async () => {
    const admin = db.client();
    const a = analysisRow(db, "problend focus complex", ["energy"]);
    await runAnalysis(admin, a, { brand: "FocusCo", name: "ProBlend Focus Complex", variant: "", form: "capsule", category: "nootropic blend", note: "" });
    const row = db.tables.analyses.find((r) => r.id === a.id)!;
    expect(row.status).toBe("complete");
    const result = row.result as { theCatch: string[]; moneyTest: { pricingAvailable: boolean } };
    expect(result.theCatch.join(" ")).toMatch(/proprietary blend/i);
    expect(result.moneyTest.pricingAvailable).toBe(false);
  });

  it("regenerates once when the draft breaks the weight policy, then fails closed", async () => {
    const admin = db.client();
    const a = analysisRow(db, "scale-talk spoiledchild", ["body-composition"]);
    await runAnalysis(admin, a, SPOILED);
    const row = db.tables.analyses.find((r) => r.id === a.id)!;
    expect(row.status).toBe("complete");
    expect((row.validator as { personalizeAttempts: number }).personalizeAttempts).toBe(2);
    expect(JSON.stringify(row.result)).not.toMatch(/weigh yourself/i);

    const b = analysisRow(db, "scale-talk-forever spoiledchild", ["body-composition"]);
    await runAnalysis(admin, b, SPOILED);
    const rb = db.tables.analyses.find((r) => r.id === b.id)!;
    expect(rb.status).toBe("failed");
    expect(rb.error_code).toBe("validation_failed");
    expect(rb.result).toBeNull();
  });

  it("allows scale language through only when Hide Weight is off", async () => {
    const admin = db.client();
    db.tables.profiles[0].hide_weight = false;
    const a = analysisRow(db, "scale-talk-forever spoiledchild", ["body-composition"]);
    await runAnalysis(admin, a, SPOILED);
    expect(db.tables.analyses.find((r) => r.id === a.id)!.status).toBe("complete");
  });

  it("keeps the Body composition & weight support goal and never sends weight in context", async () => {
    const admin = db.client();
    db.tables.day_check_ins.push({ user_id: USER, day: "2026-10-05", signals: { energy: 4, sleep: 3, weight: 150 } });
    const a = analysisRow(db, "spoiledchild e27", ["body-composition"], "I'm 168 lbs and want to feel stronger");
    await runAnalysis(admin, a, SPOILED);
    const prompts = db.tables.ai_raw_logs.filter((l) => String(l.step).startsWith("personalize")).map((l) => String(l.prompt)).join("\n");
    expect(prompts).toContain("GOALS: body-composition");
    expect(prompts).toContain("Hide Weight Entirely switched on");
    const leak = prompts.match(/.{0,80}(\b168\b|\blbs\b|weight: 150|"weight").{0,80}/);
    expect(leak?.[0] ?? null, "weight leaked into the AI prompt").toBeNull();
    expect(prompts).toContain("feel stronger");
  });

  it("records an honest failure when the provider is unavailable", async () => {
    const admin = db.client();
    const a = analysisRow(db, "fail-research product", ["skin"]);
    await runAnalysis(admin, a, SPOILED);
    const row = db.tables.analyses.find((r) => r.id === a.id)!;
    expect(row.status).toBe("failed");
    expect(row.error_code).toBe("provider_unavailable");
  });

  it("enforces the configurable daily limit from app_config, tier, and override", async () => {
    const admin = db.client();
    for (let i = 0; i < 5; i++) db.tables.usage_events.push({ user_id: USER, kind: "analysis", created_at: new Date().toISOString() });
    expect((await checkUsage(admin, USER)).allowed).toBe(false);
    db.tables.app_config.find((r) => r.key === "limit:beta")!.value = "8";
    expect((await checkUsage(admin, USER)).allowed).toBe(true);
    db.tables.profiles[0].analysis_limit_override = 2;
    expect((await checkUsage(admin, USER)).limit).toBe(2);
  });
});
