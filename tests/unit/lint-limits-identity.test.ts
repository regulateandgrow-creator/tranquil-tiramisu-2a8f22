import { describe, expect, it } from "vitest";
import { lintAnalysis } from "@/lib/ai/lint";
import { decideUsage, parseLimitValue, resolveDailyLimit } from "@/lib/ai/limits";
import { brandSlug, formulationFingerprint, identityKey, normalizeText } from "@/lib/ai/identity";
import { FixtureProvider } from "@/lib/ai/provider/fixture";
import type { PersonalAnalysis } from "@/lib/ai/schemas";

async function fixtureAnalysis(key: string, user = "GOALS: skin"): Promise<PersonalAnalysis> {
  const p = new FixtureProvider();
  const res = await p.complete({ step: "personalize", model: "x", system: "", user, maxTokens: 1, fixtureKey: key });
  return res.json as PersonalAnalysis;
}

describe("language lint", () => {
  it("passes a clean analysis", async () => {
    expect(lintAnalysis(await fixtureAnalysis("spoiledchild"), true)).toEqual([]);
  });
  it("flags buy/don't-buy verdicts, shame, medication directives and promises", async () => {
    const a = await fixtureAnalysis("spoiledchild");
    a.whatItIs = "Honestly, don't buy it. You failed last time. Stop taking your thyroid medication. Clinically proven to work.";
    const ids = lintAnalysis(a, true).map((i) => i.id);
    expect(ids).toEqual(expect.arrayContaining(["verdict-buy", "shame", "medication-directive", "promise"]));
  });
  it("requires the no-product option to have been considered and cautions to exist", async () => {
    const a = await fixtureAnalysis("spoiledchild");
    a.consideredNoProduct = false;
    a.cautions = [];
    expect(lintAnalysis(a, true).map((i) => i.id)).toEqual(expect.arrayContaining(["no-product-not-considered", "missing-cautions"]));
  });
  it("applies the weight policy only when Hide Weight is on", async () => {
    const a = await fixtureAnalysis("scale-talk-forever");
    expect(lintAnalysis(a, true).some((i) => i.id.startsWith("weight:"))).toBe(true);
    expect(lintAnalysis(a, false).some((i) => i.id.startsWith("weight:"))).toBe(false);
  });
});

describe("usage limits", () => {
  it("resolves override → tier → default → code default", () => {
    expect(resolveDailyLimit({ override: 20, tier: "beta", tierLimit: 5, defaultLimit: 5 })).toBe(20);
    expect(resolveDailyLimit({ override: null, tier: "beta", tierLimit: 7, defaultLimit: 5 })).toBe(7);
    expect(resolveDailyLimit({ override: null, tier: "beta", tierLimit: null, defaultLimit: 3 })).toBe(3);
    expect(resolveDailyLimit({ override: null, tier: null, tierLimit: null, defaultLimit: null })).toBe(5);
    expect(resolveDailyLimit({ override: 0, tier: "beta", tierLimit: 5, defaultLimit: 5 })).toBe(0);
  });
  it("counts a rolling 24h window and reports when it resets", () => {
    const now = new Date("2026-10-05T12:00:00Z");
    const times = [new Date("2026-10-05T11:00:00Z"), new Date("2026-10-04T11:00:00Z"), new Date("2026-10-05T09:30:00Z")];
    const d = decideUsage(2, times, now);
    expect(d.used).toBe(2);
    expect(d.allowed).toBe(false);
    expect(d.resetsAt?.toISOString()).toBe("2026-10-06T09:30:00.000Z");
    expect(decideUsage(5, times, now).remaining).toBe(3);
  });
  it("parses config values defensively", () => {
    expect(parseLimitValue("5")).toBe(5);
    expect(parseLimitValue("-1")).toBeNull();
    expect(parseLimitValue("lots")).toBeNull();
    expect(parseLimitValue(undefined)).toBeNull();
  });
});

describe("product identity", () => {
  it("normalizes casing, punctuation, filler and trademarks", () => {
    expect(normalizeText("The SpoiledChild™ E27 — Liquid Collagen!")).toBe("spoiledchild e27 liquid collagen");
    expect(brandSlug("Spoiled Child")).toBe("spoiledchild");
  });
  it("gives the same key for the same product and variant, different keys across variants", () => {
    const a = identityKey({ brand: "SpoiledChild", name: "E27 Liquid Collagen", variant: "Extra Strength", form: "liquid" });
    const b = identityKey({ brand: "spoiled child", name: "e27 liquid collagen", variant: "extra-strength", form: "Liquid shot" });
    const c = identityKey({ brand: "SpoiledChild", name: "E27 Liquid Collagen", variant: "", form: "liquid" });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
  it("fingerprint changes when the formulation changes", () => {
    const base = [{ name: "Collagen", amountPerServing: "10 g", disclosed: true, role: "", proprietaryBlend: false, relevantTo: [] }];
    const changed = [{ ...base[0], amountPerServing: "8 g" }];
    expect(formulationFingerprint(base)).toBe(formulationFingerprint([...base].reverse()));
    expect(formulationFingerprint(base)).not.toBe(formulationFingerprint(changed));
  });
});
