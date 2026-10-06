import type { MyProductsView } from "@/lib/products/my-products";

/**
 * My Products demo shelf. Fictional products and verdicts so the page has a shape
 * before accounts are connected. Never real research.
 */
export const demoMyProducts: MyProductsView = {
  trying: [
    {
      key: "demo-1",
      analysisId: "demo",
      brand: "Meadowline",
      name: "Creatine Monohydrate",
      variant: null,
      category: "creatine supplement",
      decision: "try_track",
      decidedAt: "2026-09-28T10:00:00Z",
      lastAnalyzedAt: "2026-09-28T09:40:00Z",
      analysesCount: 1,
      headline: "A plain ingredient with a long evidence trail, sold without theatre.",
      evidenceFit: "Reasonable to consider",
      value: "Reasonable to consider",
      monthlyCost: 11,
      scripted: true,
    },
  ],
  saved: [
    {
      key: "demo-2",
      analysisId: "demo",
      brand: "Solstice Botanicals",
      name: "Evening Magnesium Glycinate",
      variant: "Lavender",
      category: "magnesium supplement",
      decision: "save",
      decidedAt: "2026-09-21T20:15:00Z",
      lastAnalyzedAt: "2026-09-21T20:00:00Z",
      analysesCount: 2,
      headline: "The magnesium is reasonable. The lavender is the part you're paying for.",
      evidenceFit: "Worth comparing",
      value: "Worth comparing",
      monthlyCost: 24,
      scripted: true,
    },
  ],
  notForMe: [
    {
      key: "demo-3",
      analysisId: "demo",
      brand: "Lumen & Co",
      name: "Youth Renewal Liquid Collagen",
      variant: "Extra Strength",
      category: "collagen supplement",
      decision: "not_for_me",
      decidedAt: "2026-09-14T08:30:00Z",
      lastAnalyzedAt: "2026-09-14T08:05:00Z",
      analysesCount: 1,
      headline: "The ingredient has evidence. The liquid does not.",
      evidenceFit: "Worth comparing",
      value: "Evidence does not clearly justify the premium",
      monthlyCost: 66,
      scripted: true,
    },
  ],
  undecided: [],
  total: 3,
};
