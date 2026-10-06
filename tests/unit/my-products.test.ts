import { describe, expect, it } from "vitest";
import { buildMyProducts, productTitle, type MyProductsSource } from "@/lib/products/my-products";

const cand = (variant = "Extra Strength") => [{ brand: "SpoiledChild", name: "E27 Liquid Collagen", variant, form: "liquid", category: "collagen supplement", note: "" }];
const result = { headline: "H", grownTake: { evidenceFit: { verdict: "Worth comparing" as const }, value: { verdict: "Evidence does not clearly justify the premium" as const } }, moneyTest: { monthlyCost: 66, pricingAvailable: true } };
const row = (over: Partial<MyProductsSource>): MyProductsSource => ({ id: "a", product_id: "p1", candidates: cand(), decision: null, decided_at: null, created_at: "2026-10-01T00:00:00Z", model: "fixture", result, ...over });

describe("buildMyProducts", () => {
  it("is empty with no analyses", () => {
    const v = buildMyProducts([]);
    expect(v.total).toBe(0);
    expect(v.trying).toEqual([]);
  });

  it("puts each decision on its shelf and undecided ones on their own", () => {
    const v = buildMyProducts([
      row({ id: "a", product_id: "p1", decision: "try_track", decided_at: "2026-10-01T01:00:00Z" }),
      row({ id: "b", product_id: "p2", decision: "save", decided_at: "2026-10-02T01:00:00Z", candidates: cand("") }),
      row({ id: "c", product_id: "p3", decision: "not_for_me", decided_at: "2026-10-03T01:00:00Z" }),
      row({ id: "d", product_id: "p4" }),
    ]);
    expect(v.total).toBe(4);
    expect(v.trying.map((e) => e.analysisId)).toEqual(["a"]);
    expect(v.saved.map((e) => e.analysisId)).toEqual(["b"]);
    expect(v.notForMe.map((e) => e.analysisId)).toEqual(["c"]);
    expect(v.undecided.map((e) => e.analysisId)).toEqual(["d"]);
    expect(v.saved[0].variant).toBeNull();
  });

  it("folds repeat analyses of one product into one entry, linking the newest and keeping the newest decision", () => {
    const v = buildMyProducts([
      row({ id: "old", created_at: "2026-09-01T00:00:00Z", decision: "save", decided_at: "2026-09-01T01:00:00Z" }),
      row({ id: "new", created_at: "2026-10-01T00:00:00Z" }),
    ]);
    expect(v.total).toBe(1);
    expect(v.saved).toHaveLength(1);
    expect(v.saved[0].analysisId).toBe("new");
    expect(v.saved[0].analysesCount).toBe(2);
    expect(v.saved[0].decision).toBe("save");
  });

  it("a newer decision replaces an older one for the same product", () => {
    const v = buildMyProducts([
      row({ id: "old", created_at: "2026-09-01T00:00:00Z", decision: "save", decided_at: "2026-09-01T01:00:00Z" }),
      row({ id: "new", created_at: "2026-10-01T00:00:00Z", decision: "not_for_me", decided_at: "2026-10-01T01:00:00Z" }),
    ]);
    expect(v.notForMe[0].decision).toBe("not_for_me");
    expect(v.saved).toHaveLength(0);
  });

  it("groups by candidate identity when no shared product id exists", () => {
    const v = buildMyProducts([row({ id: "a", product_id: null }), row({ id: "b", product_id: null, created_at: "2026-10-02T00:00:00Z" })]);
    expect(v.total).toBe(1);
    expect(v.undecided[0].analysisId).toBe("b");
  });

  it("skips analyses without a confirmed candidate and hides unconfirmed pricing", () => {
    const v = buildMyProducts([
      row({ id: "a", candidates: null }),
      row({ id: "b", product_id: "p9", result: { ...result, moneyTest: { monthlyCost: 66, pricingAvailable: false } } }),
    ]);
    expect(v.total).toBe(1);
    expect(v.undecided[0].monthlyCost).toBeNull();
    expect(v.undecided[0].evidenceFit).toBe("Worth comparing");
    expect(v.undecided[0].scripted).toBe(true);
  });

  it("orders decided shelves by most recent decision", () => {
    const v = buildMyProducts([
      row({ id: "a", product_id: "p1", decision: "try_track", decided_at: "2026-10-01T01:00:00Z" }),
      row({ id: "b", product_id: "p2", decision: "try_track", decided_at: "2026-10-05T01:00:00Z" }),
    ]);
    expect(v.trying.map((e) => e.analysisId)).toEqual(["b", "a"]);
  });

  it("builds a readable title", () => {
    expect(productTitle({ brand: "SpoiledChild", name: "E27 Liquid Collagen", variant: "Extra Strength" })).toBe("SpoiledChild E27 Liquid Collagen Extra Strength");
    expect(productTitle({ brand: "Various", name: "Magnesium glycinate", variant: null })).toBe("Various Magnesium glycinate");
  });
});
