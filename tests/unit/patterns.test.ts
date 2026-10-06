import { describe, expect, it } from "vitest";
import { CAUSAL_WORDS, findPatterns, shiftDay } from "@/lib/patterns/engine";
import type { DayCheckIn } from "@/lib/demo/types";

const TODAY = "2026-10-28";
function days(n: number, make: (i: number, day: string) => Partial<DayCheckIn> | null): Record<string, DayCheckIn> {
  const out: Record<string, DayCheckIn> = {};
  for (let i = 0; i < n; i++) {
    const day = shiftDay(TODAY, -i);
    const c = make(i, day);
    if (c) out[day] = { day, signals: {}, ...c };
  }
  return out;
}

describe("findPatterns", () => {
  it("reports nothing on an empty month and counts logged days honestly", () => {
    const r = findPatterns({ checkIns: {}, today: TODAY });
    expect(r.insights).toEqual([]);
    expect(r.loggedDays).toBe(0);
    expect(r.windowDays).toBe(28);
  });

  it("needs at least three logged days on each side before mentioning anything", () => {
    // Two protein-breakfast days with high energy, three without with low energy: not enough.
    const ci = days(5, (i) => ({ signals: { energy: i < 2 ? 5 : 2 }, nourish: { meals: { breakfast: i < 2 ? ["protein"] : ["sweet"] } } }));
    expect(findPatterns({ checkIns: ci, today: TODAY }).insights.filter((x) => x.id.startsWith("co:"))).toEqual([]);
  });

  it("finds a same-day association and words it as a tendency", () => {
    const ci = days(14, (i) => ({ signals: { hunger: i % 2 === 0 ? 2 : 4 }, nourish: { meals: { breakfast: i % 2 === 0 ? ["protein"] : ["grains"] } } }));
    const r = findPatterns({ checkIns: ci, today: TODAY });
    const hit = r.insights.find((x) => x.id === "co:protein_breakfast:hunger");
    expect(hit).toBeDefined();
    expect(hit!.text).toBe("On days with a protein anchor at breakfast, your hunger ratings have tended to sit lower (7 of 14 logged days).");
    expect(hit!.confidence).toBe("consistent");
    expect(hit!.category).toBe("meals");
  });

  it("pairs evening behaviors with the following night's sleep", () => {
    // A drink on even days; sleep rated low the morning after (odd days back), high otherwise.
    const ci = days(16, (i) => {
      const drinkDay = i % 2 === 1; // day i has a drink
      const nextDayLow = (i + 1) % 2 === 1; // day i follows a drink day (i+1 is odd)
      return { signals: { sleep: nextDayLow ? 2 : 5 }, nourish: { meals: { dinner: drinkDay ? ["drink"] : ["protein"] } } };
    });
    const r = findPatterns({ checkIns: ci, today: TODAY });
    const hit = r.insights.find((x) => x.id === "co:drink:sleep");
    expect(hit).toBeDefined();
    expect(hit!.text).toMatch(/^On days you noted a drink, the following night's sleep ratings have tended to sit lower/);
  });

  it("marks small samples as emerging", () => {
    const ci = days(7, (i) => ({ signals: { energy: i < 3 ? 5 : 2 }, move: { kinds: i < 3 ? ["walk"] : ["rest"] } }));
    const r = findPatterns({ checkIns: ci, today: TODAY });
    const hit = r.insights.find((x) => x.id === "co:walk:energy");
    expect(hit?.confidence).toBe("emerging");
  });

  it("ignores days where the relevant log is missing instead of treating them as 'without'", () => {
    // Only 3 days have any meal logged (all with protein); the rest have signals only.
    const ci = days(12, (i) => ({ signals: { energy: i < 3 ? 5 : 1 }, ...(i < 3 ? { nourish: { meals: { breakfast: ["protein"] } } } : {}) }));
    const r = findPatterns({ checkIns: ci, today: TODAY });
    expect(r.insights.find((x) => x.id === "co:protein_breakfast:energy")).toBeUndefined();
  });

  it("notices steadiness in a single signal", () => {
    const ci = days(12, () => ({ signals: { energy: 4 } }));
    const r = findPatterns({ checkIns: ci, today: TODAY });
    const hit = r.insights.find((x) => x.id === "steady:energy");
    expect(hit?.text).toBe("Energy has been Steady or better on 12 of your last 12 logged days.");
    expect(hit?.confidence).toBe("consistent");
  });

  it("compares before and since a product she is trying, as an association", () => {
    const since = shiftDay(TODAY, -6);
    const ci = days(14, (i, day) => ({ signals: { energy: day >= since ? 4 : 2 } }));
    const r = findPatterns({ checkIns: ci, today: TODAY, products: [{ title: "Meadowline Creatine Monohydrate", since }] });
    const hit = r.insights.find((x) => x.id.startsWith("product:"));
    expect(hit?.category).toBe("products");
    expect(hit?.text).toMatch(/^Since you started trying Meadowline Creatine Monohydrate \(Oct 22\), your energy ratings have averaged higher than in the 7 logged days before\. Early days; keep noting\.$/);
  });

  it("never uses causal language", () => {
    const ci = days(28, (i) => ({
      signals: { energy: i % 2 ? 5 : 2, sleep: i % 3 ? 4 : 2, mood: i % 2 ? 4 : 2, digestion: 4, hunger: i % 2 ? 2 : 4, cravings: 2 },
      nourish: { plants: i % 2 ? 4 : 1, water: i % 2 ? 7 : 2, meals: { breakfast: i % 2 ? ["protein"] : ["sweet", "caffeine"], dinner: i % 3 ? ["plants"] : ["drink", "skipped"] } },
      move: { kinds: i % 2 ? ["walk", "strength"] : ["rest"], duration: "medium" },
    }));
    const r = findPatterns({ checkIns: ci, today: TODAY, products: [{ title: "Solstice Magnesium", since: shiftDay(TODAY, -10) }] });
    expect(r.insights.length).toBeGreaterThan(0);
    expect(r.insights.length).toBeLessThanOrEqual(8);
    for (const i of r.insights) expect(CAUSAL_WORDS.test(i.text)).toBe(false);
    expect(/\b(failed|bad|behind|cheat|guilty|lazy)\b/i.test(r.insights.map((i) => i.text).join(" "))).toBe(false);
  });
});
