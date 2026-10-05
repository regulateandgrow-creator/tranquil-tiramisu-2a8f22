import { beforeEach, describe, expect, it } from "vitest";
import { MemoryDb } from "../support/memory-admin";
import { InstrumentedProvider } from "../support/instrumented-provider";
import { runAnalysis } from "@/lib/ai/pipeline/run";
import { FixtureProvider } from "@/lib/ai/provider/fixture";
import type { AnalysisRow } from "@/lib/db/intelligence";

process.env.GROWN_AI_PROVIDER = "fixture";
const USER = "11111111-2222-3333-4444-555555555555";
const SPOILED = { brand: "SpoiledChild", name: "E27 Liquid Collagen", variant: "Extra Strength", form: "liquid", category: "collagen supplement", note: "" };

function row(db: MemoryDb, query: string, goals: string[]): AnalysisRow {
  const r = { id: db.id(), user_id: USER, product_id: null, research_id: null, query_text: query, goals, goal_other: null, status: "researching" as const, stage_message: null, candidates: null, result: null, error_code: null, decision: null, decided_at: null, model: null, research_cached: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  db.tables.analyses.push(r);
  return r;
}

describe("follow-up 1: manufacturer-page price fetch fallback", () => {
  let db: MemoryDb;
  beforeEach(() => {
    db = new MemoryDb();
    db.tables.profiles.push({ id: USER, hide_weight: true, first_name: "Simone", life_mode: "normal", tier: "beta", analysis_limit_override: null });
  });

  it("does not fetch when the search already yielded a manufacturer price", async () => {
    const p = new InstrumentedProvider(new FixtureProvider());
    await runAnalysis(db.client(), row(db, "spoiledchild e27", ["skin"]), SPOILED, p);
    expect(p.calls.map((c) => c.step)).not.toContain("pricing-fetch");
    const research = db.tables.product_research[0].dossier as { pricing: { price: number } };
    expect(research.pricing.price).toBe(69);
    expect((db.tables.analyses[0].validator as { citations: { pricingFetch: string } }).citations.pricingFetch).toBe("not-needed");
  });

  it("fetches the manufacturer page when the snippet had no price, and uses the page price", async () => {
    const p = new InstrumentedProvider(new FixtureProvider());
    await runAnalysis(db.client(), row(db, "price-missing spoiledchild e27", ["skin"]), SPOILED, p);
    const fetchCall = p.calls.find((c) => c.step === "pricing-fetch");
    expect(fetchCall).toBeDefined();
    const research = db.tables.product_research[0].dossier as { pricing: { available: boolean; price: number; sourceUrl: string; annualCost: number } };
    expect(research.pricing.available).toBe(true);
    expect(research.pricing.price).toBe(59);
    expect(research.pricing.sourceUrl).toContain("spoiledchild.com");
    expect(research.pricing.annualCost).toBe(663.72); // recomputed from 59 / 32 servings × 30 days × 12
    expect((db.tables.analyses[0].validator as { citations: { pricingFetch: string } }).citations.pricingFetch).toBe("used");
  });

  it("keeps pricing unavailable when the manufacturer page shows no price (never infers)", async () => {
    const p = new InstrumentedProvider(new FixtureProvider());
    await runAnalysis(db.client(), row(db, "price-missing page-no-price spoiledchild e27", ["skin"]), SPOILED, p);
    const research = db.tables.product_research[0].dossier as { pricing: { available: boolean; price: number } };
    expect(research.pricing.available).toBe(false);
    expect(research.pricing.price).toBe(0);
    expect((db.tables.analyses[0].validator as { citations: { pricingFetch: string } }).citations.pricingFetch).toBe("no-price-on-page");
  });

  it("discards a fetched price whose source URL was never actually fetched", async () => {
    const p = new InstrumentedProvider(new FixtureProvider());
    await runAnalysis(db.client(), row(db, "price-missing fetch-fabricate spoiledchild e27", ["skin"]), SPOILED, p);
    const research = db.tables.product_research[0].dossier as { pricing: { available: boolean; price: number } };
    expect(research.pricing.available).toBe(false);
    expect(research.pricing.price).toBe(0);
  });
});

describe("follow-up 2: regeneration check identifiers are logged, ids only", () => {
  it("records which check forced the regeneration and nothing else", async () => {
    const db = new MemoryDb();
    db.tables.profiles.push({ id: USER, hide_weight: true, first_name: "Simone", life_mode: "normal", tier: "beta", analysis_limit_override: null });
    await runAnalysis(db.client(), row(db, "scale-talk spoiledchild", ["body-composition"]), SPOILED);
    const validator = db.tables.analyses[0].validator as { personalizeAttempts: number; regenerationIssueIds: string[] };
    expect(validator.personalizeAttempts).toBe(2);
    expect(validator.regenerationIssueIds).toContain("weight:scale");
    // ids only: no excerpt text from the draft leaks into durable logs
    expect(JSON.stringify(validator)).not.toMatch(/weigh yourself/i);
  });
});
