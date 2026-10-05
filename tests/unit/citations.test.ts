import { describe, expect, it } from "vitest";
import { classifySource, normalizeUrl, validateAnalysisCitations, validateDossierCitations } from "@/lib/ai/citations";
import { FixtureProvider } from "@/lib/ai/provider/fixture";
import type { PersonalAnalysis, ProductDossier } from "@/lib/ai/schemas";

async function fixtureDossier(key = "spoiledchild"): Promise<{ dossier: ProductDossier; searched: string[] }> {
  const p = new FixtureProvider();
  const research = await p.complete({ step: "research", model: "x", system: "", user: "", maxTokens: 1, fixtureKey: key });
  const extract = await p.complete({ step: "extract", model: "x", system: "", user: "", maxTokens: 1, fixtureKey: key });
  return { dossier: extract.json as ProductDossier, searched: research.searchedUrls.map((s) => s.url) };
}

describe("citation integrity", () => {
  it("normalizes tracking params, www and trailing slashes", () => {
    expect(normalizeUrl("https://www.Example.com/?utm_source=x")).toBe("https://example.com");
    expect(normalizeUrl("https://pubmed.ncbi.nlm.nih.gov/123/#top")).toBe("https://pubmed.ncbi.nlm.nih.gov/123/");
  });

  it("classifies government, academic, manufacturer and retailer sources", () => {
    expect(classifySource("https://ods.od.nih.gov/factsheets/x", "spoiledchild")).toEqual({ kind: "independent", tier: 1 });
    expect(classifySource("https://www.spoiledchild.com/products/e27", "spoiledchild")).toEqual({ kind: "manufacturer", tier: 3 });
    expect(classifySource("https://www.amazon.com/dp/x", "spoiledchild")).toEqual({ kind: "retailer", tier: 2 });
    expect(classifySource("https://examine.com/supplements/collagen/", "spoiledchild")).toEqual({ kind: "independent", tier: 2 });
  });

  it("drops a fabricated URL that web search never returned", async () => {
    const { dossier, searched } = await fixtureDossier();
    const before = JSON.stringify(dossier);
    expect(before).toContain("example-fake-journal.org");
    const { dossier: clean, report } = validateDossierCitations(dossier, searched, "spoiledchild");
    expect(JSON.stringify(clean)).not.toContain("example-fake-journal.org");
    expect(report.dropped).toContain("https://example-fake-journal.org/collagen-liquid-superiority");
  });

  it("keeps confirmed independent evidence and does not require a quota", async () => {
    const { dossier, searched } = await fixtureDossier();
    const { dossier: clean, report } = validateDossierCitations(dossier, searched, "spoiledchild");
    const skin = clean.evidenceByBenefit.find((b) => b.benefit === "skin")!;
    expect(skin.ingredientEvidence.rating).toBe("moderate");
    expect(skin.ingredientEvidence.sourceUrls.length).toBe(2);
    expect(report.downgraded).toEqual([]);
    // No minimum tier-1 count is enforced anywhere; the report only informs.
    expect(report.tier1Count).toBeGreaterThan(0);
  });

  it("downgrades an evidence claim whose only source was unconfirmed", async () => {
    const { dossier, searched } = await fixtureDossier();
    dossier.evidenceByBenefit[0].ingredientEvidence.sourceUrls = ["https://example-fake-journal.org/only"];
    const { dossier: clean, report } = validateDossierCitations(dossier, searched, "spoiledchild");
    expect(clean.evidenceByBenefit[0].ingredientEvidence.rating).toBe("insufficient");
    expect(report.downgraded).toContain("skin:ingredient");
  });

  it("keeps legitimate journal hosts the tier list does not know in evidence sections", async () => {
    const { dossier, searched } = await fixtureDossier();
    const journal = "https://www.amjmed.com/article/S0002-9343(20)30000-1/fulltext";
    dossier.evidenceByBenefit[0].ingredientEvidence.sourceUrls.push(journal);
    const { dossier: clean, report } = validateDossierCitations(dossier, [...searched, journal], "spoiledchild");
    expect(clean.evidenceByBenefit[0].ingredientEvidence.sourceUrls.some((u) => u.includes("amjmed.com"))).toBe(true);
    expect(report.manufacturerInEvidence).toEqual([]);
  });

  it("removes manufacturer URLs from evidence sections but keeps them for claims and pricing", async () => {
    const { dossier, searched } = await fixtureDossier();
    dossier.evidenceByBenefit[0].ingredientEvidence.sourceUrls.push("https://www.spoiledchild.com/products/e27-extra-strength-liquid-collagen");
    const { dossier: clean, report } = validateDossierCitations(dossier, searched, "spoiledchild");
    expect(report.manufacturerInEvidence.length).toBe(1);
    expect(clean.evidenceByBenefit[0].ingredientEvidence.sourceUrls.some((u) => u.includes("spoiledchild"))).toBe(false);
    expect(clean.manufacturerClaims[0].sourceUrl).toContain("spoiledchild.com");
    expect(clean.pricing.available).toBe(true);
  });

  it("marks pricing unavailable when its source was not searched", async () => {
    const { dossier, searched } = await fixtureDossier();
    dossier.pricing.sourceUrl = "https://nowhere.example/price";
    const { dossier: clean } = validateDossierCitations(dossier, searched, "spoiledchild");
    expect(clean.pricing.available).toBe(false);
  });

  it("strips unknown citations from the personal analysis and relabels their markers", async () => {
    const { dossier, searched } = await fixtureDossier();
    const { dossier: clean } = validateDossierCitations(dossier, searched, "spoiledchild");
    const p = new FixtureProvider();
    const personal = await p.complete({ step: "personalize", model: "x", system: "", user: "GOALS: skin, nails", maxTokens: 1, fixtureKey: "spoiledchild" });
    const analysis = personal.json as PersonalAnalysis;
    analysis.whatItIs = analysis.whatItIs + " As shown in [9].";
    const { analysis: out, dropped } = validateAnalysisCitations(analysis, clean);
    expect(dropped).toEqual(["https://example-fake-journal.org/collagen-liquid-superiority"]);
    expect(out.citations.some((c) => c.n === 9)).toBe(false);
    expect(out.whatItIs).toContain("[source not confirmed]");
    expect(out.citations.length).toBe(4);
  });
});
