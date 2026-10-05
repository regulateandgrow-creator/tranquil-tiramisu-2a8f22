import { describe, expect, it } from "vitest";
import {
  buildPersonalContext,
  findWeightViolations,
  findWeightViolationsDeep,
  scrubWeightFromFreeText,
  weightPolicyPromptBlock,
} from "@/lib/preferences/weight-policy";
import { goalOptions, goalKeys } from "@/lib/ai/goals";

describe("Hide Weight Entirely: goal selection is independent of visibility", () => {
  it("offers Body composition & weight support regardless of the preference", () => {
    const label = goalOptions.find((g) => g.key === "body-composition")?.label;
    expect(label).toBe("Body composition & weight support");
    expect(goalKeys.has("body-composition")).toBe(true);
    // The list is static: there is no function that filters it by hideWeight.
    expect(goalOptions.map((g) => g.key)).toContain("body-composition");
  });

  it("keeps the goal in the AI context even when weight is hidden", () => {
    const ctx = buildPersonalContext({ hideWeight: true, goals: ["body-composition", "energy"] });
    expect(ctx.goals).toEqual(["body-composition", "energy"]);
    expect(ctx.hideWeight).toBe(true);
  });
});

describe("Hide Weight Entirely: AI context never carries weight", () => {
  it("allow-lists signals so a weight value cannot ride along", () => {
    const ctx = buildPersonalContext({
      hideWeight: true,
      goals: ["joints"],
      recentSignals: { energy: 3.5, sleep: 4, weight: 150, bmi: 24, movement: 2 } as Record<string, number>,
    });
    expect(ctx.recentSignals).toEqual({ energy: 3.5, sleep: 4, movement: 2 });
    expect(JSON.stringify(ctx)).not.toMatch(/weight"?:\s*150|bmi/i);
  });

  it("scrubs a weight she typed into free text when hidden", () => {
    const ctx = buildPersonalContext({
      hideWeight: true,
      goals: ["other"],
      goalOther: "I'm 168 lbs and want more energy, BMI 27 too",
    });
    expect(ctx.goalOther).not.toMatch(/168|lbs|bmi|27/i);
    expect(ctx.goalOther).toContain("more energy");
  });

  it("leaves free text alone when weight is not hidden", () => {
    const ctx = buildPersonalContext({ hideWeight: false, goals: ["other"], goalOther: "I weigh 70 kg" });
    expect(ctx.goalOther).toBe("I weigh 70 kg");
  });

  it("scrubber handles kg, pounds and BMI phrasing", () => {
    expect(scrubWeightFromFreeText("about 72.5 kilograms lately")).toBe("about [removed] lately");
    expect(scrubWeightFromFreeText("")).toBeNull();
  });
});

describe("Hide Weight Entirely: prompt policy", () => {
  it("includes the global override block when hidden", () => {
    const block = weightPolicyPromptBlock(true);
    expect(block).toMatch(/Hide Weight Entirely/);
    expect(block).toMatch(/NOT request, estimate, infer, mention, repeat, or use/);
    expect(block).toMatch(/non-scale context/);
  });

  it("still forbids asking for weight when not hidden", () => {
    expect(weightPolicyPromptBlock(false)).toMatch(/never ask for her weight/);
  });
});

describe("Hide Weight Entirely: output backstop", () => {
  it("flags scale-directed language aimed at the user", () => {
    const bad = [
      "Weigh yourself weekly to see progress.",
      "Depending on your weight, dosing may vary.",
      "You could lose 5 pounds in a month.",
      "Try tracking your weight alongside this.",
      "Your BMI suggests a higher dose.",
      "A few lbs down is a great sign.",
    ];
    for (const text of bad) expect(findWeightViolations(text).length, text).toBeGreaterThan(0);
  });

  it("does not flag study language about dosing per kilogram", () => {
    const fine = "Trials typically dosed 0.3 to 0.5 g per kg body weight per day in participants.";
    expect(findWeightViolations(fine)).toEqual([]);
  });

  it("does not flag neutral third-person study findings", () => {
    const fine = "Participants in the 12-week trial showed small changes in body composition versus placebo.";
    expect(findWeightViolations(fine)).toEqual([]);
  });

  it("scans nested JSON output", () => {
    const analysis = { sections: [{ title: "Goal fit", body: "Step on the scale each morning." }] };
    expect(findWeightViolationsDeep(analysis).map((v) => v.id)).toContain("scale");
    expect(findWeightViolationsDeep({ a: ["fine text"] })).toEqual([]);
  });
});
