import { describe, expect, it } from "vitest";
import { parseNourish } from "@/lib/db/validate";
import { computeFoundation } from "@/lib/foundation/compute";
import { foodThoughtForDay, foodThoughts } from "@/lib/demo/nourish";

describe("parseNourish", () => {
  it("accepts nothing, an empty object and a full valid shape", () => {
    expect(parseNourish(undefined)).toEqual({});
    expect(parseNourish({})).toEqual({});
    expect(parseNourish({ plants: 3, water: 5, meals: { breakfast: ["protein", "plants"], snacks: ["sweet"] } })).toEqual({ plants: 3, water: 5, meals: { breakfast: ["protein", "plants"], snacks: ["sweet"] } });
  });
  it("rejects unknown keys, including anything weight-shaped", () => {
    expect(parseNourish({ weight: 150 })).toBeNull();
    expect(parseNourish({ calories: 1800 })).toBeNull();
  });
  it("rejects out-of-range or fractional counts", () => {
    expect(parseNourish({ plants: 9 })).toBeNull();
    expect(parseNourish({ water: 2.5 })).toBeNull();
    expect(parseNourish({ water: -1 })).toBeNull();
    expect(parseNourish({ plants: "3" })).toBeNull();
  });
  it("rejects unknown slots and tags, and collapses duplicates", () => {
    expect(parseNourish({ meals: { brunch: ["protein"] } })).toBeNull();
    expect(parseNourish({ meals: { lunch: ["calories"] } })).toBeNull();
    expect(parseNourish({ meals: { lunch: ["protein", "protein"] } })).toBeNull();
    expect(parseNourish({ meals: { lunch: "protein" } })).toBeNull();
  });
});

describe("computeFoundation", () => {
  const base = { day: "2026-10-07", signals: {} as const };

  it("is Not logged yet everywhere on an empty day", () => {
    const p = computeFoundation({ ...base });
    expect(p.map((x) => x.status)).toEqual(["not-logged", "not-logged", "not-logged", "not-logged", "not-logged"]);
    expect(p.every((x) => x.progress === undefined)).toBe(true);
  });

  it("builds protein from protein anchors across meals", () => {
    expect(computeFoundation({ ...base, nourish: { meals: { breakfast: ["protein"] } } })[0].status).toBe("building");
    expect(computeFoundation({ ...base, nourish: { meals: { breakfast: ["protein"], dinner: ["protein", "plants"] } } })[0].status).toBe("steady");
  });

  it("gently flags two meals with no anchor, but not one", () => {
    expect(computeFoundation({ ...base, nourish: { meals: { breakfast: ["sweet"] } } })[0].status).toBe("building");
    expect(computeFoundation({ ...base, nourish: { meals: { breakfast: ["sweet"], lunch: ["grains"] } } })[0].status).toBe("needs-attention");
  });

  it("maps plants and water to fiber and hydration", () => {
    const p = computeFoundation({ ...base, nourish: { plants: 2, water: 6 } });
    expect(p[1].status).toBe("building");
    expect(p[1].progress).toBeCloseTo(0.4);
    expect(p[2].status).toBe("steady");
    expect(p[2].progress).toBeCloseTo(0.75);
  });

  it("reads movement and sleep from the body signals", () => {
    const p = computeFoundation({ ...base, signals: { movement: 2, sleep: 5 } });
    expect(p[3].status).toBe("building");
    expect(p[4].status).toBe("steady");
  });

  it("never uses banned language", () => {
    const all = [
      computeFoundation({ ...base }),
      computeFoundation({ ...base, nourish: { meals: { breakfast: ["sweet"], lunch: ["grains"] }, plants: 1, water: 1 }, signals: { movement: 1, sleep: 1 } }),
    ].flat().map((x) => x.detail).join(" ");
    expect(/\b(failed|bad|behind|over limit|cheat|guilty|lazy)\b/i.test(all)).toBe(false);
  });
});

describe("foodThoughtForDay", () => {
  it("is deterministic per day and drawn from the list", () => {
    expect(foodThoughtForDay("2026-10-07")).toBe(foodThoughtForDay("2026-10-07"));
    expect(foodThoughts).toContain(foodThoughtForDay("2026-10-08"));
    expect(/\b(failed|bad|behind|cheat|guilty|lazy)\b/i.test(foodThoughts.join(" "))).toBe(false);
  });
});
