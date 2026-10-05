import { describe, expect, it } from "vitest";
import { normalizeDossier } from "@/lib/ai/pipeline/research";
import { normalizeGoalKeys } from "@/lib/ai/pipeline/personalize";
import { lintAnalysis } from "@/lib/ai/lint";
import { dossierCoreSchema, dossierSchema } from "@/lib/ai/schemas";
import { FixtureProvider } from "@/lib/ai/provider/fixture";
import type { PersonalAnalysis, ProductDossier } from "@/lib/ai/schemas";

async function fixture<T>(step: "extract" | "personalize", user = "GOALS: skin, joints"): Promise<T> {
  const p = new FixtureProvider();
  const res = await p.complete({ step, model: "x", system: "", user, maxTokens: 1, fixtureKey: "spoiledchild" });
  return res.json as T;
}

describe("correction 1: dossier extraction split", () => {
  it("core schema is the dossier schema minus pricing", () => {
    expect(Object.keys(dossierCoreSchema.properties)).not.toContain("pricing");
    expect(dossierCoreSchema.required).not.toContain("pricing");
    expect(Object.keys(dossierCoreSchema.properties).length).toBe(Object.keys(dossierSchema.properties).length - 1);
  });
});

describe("correction 5: undisclosed amounts are labelled", () => {
  it("writes 'not disclosed' for empty amounts and recomputes the money arithmetic", async () => {
    const d = await fixture<ProductDossier>("extract");
    d.formulation.ingredients.push({ name: "Xylitol", amountPerServing: "", disclosed: true, role: "sweetener", proprietaryBlend: false, relevantTo: [] });
    d.pricing = { ...d.pricing, price: 49, servingsPerContainer: 30, servingsPerDay: 1, monthlyCost: 1, annualCost: 1 };
    const n = normalizeDossier(d);
    const x = n.formulation.ingredients.find((i) => i.name === "Xylitol")!;
    expect(x.amountPerServing).toBe("not disclosed");
    expect(x.disclosed).toBe(false);
    expect(n.pricing.monthlyCost).toBe(49);
    expect(n.pricing.annualCost).toBe(588);
  });
});

describe("correction 6: goal keys and conditional cautions", () => {
  it("maps display labels back to goal keys", async () => {
    const a = await fixture<PersonalAnalysis>("personalize");
    a.goalFit[0].goal = "Skin";
    a.whatTheEvidenceSays[0].goal = "Body composition & weight support";
    const n = normalizeGoalKeys(a, ["skin", "body-composition", "joints"]);
    expect(n.goalFit[0].goal).toBe("skin");
    expect(n.whatTheEvidenceSays[0].goal).toBe("body-composition");
  });
  it("does not flag a conditional clinician caution as a diagnosis", async () => {
    const a = await fixture<PersonalAnalysis>("personalize");
    a.cautions.push("If you have a wheat allergy or celiac disease, confirm your bottle's label with your clinician.");
    expect(lintAnalysis(a, true).map((i) => i.id)).not.toContain("diagnosis");
    a.cautions.push("You clearly have a zinc deficiency.");
    expect(lintAnalysis(a, true).map((i) => i.id)).toContain("diagnosis");
  });
});
