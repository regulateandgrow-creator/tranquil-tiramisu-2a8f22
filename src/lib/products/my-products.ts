import type { Decision } from "@/lib/db/intelligence";
import type { ProductCandidate, VerdictPhrase } from "@/lib/ai/schemas";

/**
 * My Products is a view over her completed analyses. Nothing new is stored:
 * the decision on each analysis (TRY IT & TRACK IT / SAVE IT / NOT FOR ME) is the source of truth.
 * One entry per product; several analyses of the same product fold into one.
 */

export type ProductShelf = "trying" | "saved" | "not_for_me" | "undecided";

export interface MyProductEntry {
  /** Stable key: the shared product id when known, else the analysis id. */
  key: string;
  /** The most recent complete analysis of this product; the Breakdown link. */
  analysisId: string;
  brand: string;
  name: string;
  variant: string | null;
  category: string | null;
  decision: Decision | null;
  decidedAt: string | null;
  lastAnalyzedAt: string;
  analysesCount: number;
  headline: string | null;
  evidenceFit: VerdictPhrase | null;
  value: VerdictPhrase | null;
  /** Monthly cost at the labelled serving, only when pricing was confirmed. */
  monthlyCost: number | null;
  scripted: boolean;
}

export interface MyProductsView {
  trying: MyProductEntry[];
  saved: MyProductEntry[];
  notForMe: MyProductEntry[];
  undecided: MyProductEntry[];
  total: number;
}

/** The subset of an analysis row this view needs. */
export interface MyProductsSource {
  id: string;
  product_id: string | null;
  candidates: ProductCandidate[] | null;
  decision: Decision | null;
  decided_at: string | null;
  created_at: string;
  model: string | null;
  result: {
    headline?: string;
    grownTake?: { evidenceFit?: { verdict: VerdictPhrase }; value?: { verdict: VerdictPhrase } };
    moneyTest?: { monthlyCost?: number; pricingAvailable?: boolean };
  } | null;
}

export const SHELF_LABEL: Record<ProductShelf, string> = {
  trying: "Trying & tracking",
  saved: "Saved for later",
  not_for_me: "Not for me",
  undecided: "Still deciding",
};

export function shelfFor(decision: Decision | null): ProductShelf {
  if (decision === "try_track") return "trying";
  if (decision === "save") return "saved";
  if (decision === "not_for_me") return "not_for_me";
  return "undecided";
}

function keyFor(row: MyProductsSource): string {
  if (row.product_id) return row.product_id;
  const c = row.candidates?.[0];
  if (c) return `c:${[c.brand, c.name, c.variant, c.form].map((s) => (s ?? "").trim().toLowerCase()).join("|")}`;
  return row.id;
}

/**
 * Folds complete analyses (newest first or any order) into one entry per product.
 * The Breakdown link always points at the newest analysis. The decision is the newest
 * decision she made for that product, even if a later re-analysis is still undecided.
 */
export function buildMyProducts(rows: MyProductsSource[]): MyProductsView {
  const byKey = new Map<string, MyProductEntry>();
  const sorted = [...rows].sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0));

  for (const row of sorted) {
    const c = row.candidates?.[0];
    if (!c) continue;
    const key = keyFor(row);
    const existing = byKey.get(key);
    if (existing) {
      existing.analysesCount += 1;
      if (row.decision && row.decided_at && (!existing.decidedAt || row.decided_at > existing.decidedAt)) {
        existing.decision = row.decision;
        existing.decidedAt = row.decided_at;
      }
      continue;
    }
    byKey.set(key, {
      key,
      analysisId: row.id,
      brand: c.brand,
      name: c.name,
      variant: c.variant?.trim() ? c.variant : null,
      category: c.category?.trim() ? c.category : null,
      decision: row.decision,
      decidedAt: row.decision ? row.decided_at : null,
      lastAnalyzedAt: row.created_at,
      analysesCount: 1,
      headline: row.result?.headline ?? null,
      evidenceFit: row.result?.grownTake?.evidenceFit?.verdict ?? null,
      value: row.result?.grownTake?.value?.verdict ?? null,
      monthlyCost: row.result?.moneyTest?.pricingAvailable && typeof row.result.moneyTest.monthlyCost === "number" ? row.result.moneyTest.monthlyCost : null,
      scripted: row.model === "fixture",
    });
  }

  const view: MyProductsView = { trying: [], saved: [], notForMe: [], undecided: [], total: byKey.size };
  for (const entry of byKey.values()) {
    const shelf = shelfFor(entry.decision);
    if (shelf === "trying") view.trying.push(entry);
    else if (shelf === "saved") view.saved.push(entry);
    else if (shelf === "not_for_me") view.notForMe.push(entry);
    else view.undecided.push(entry);
  }
  // Decided shelves: most recent decision first. Undecided: most recent look first.
  const byDecided = (a: MyProductEntry, b: MyProductEntry) => ((a.decidedAt ?? "") < (b.decidedAt ?? "") ? 1 : -1);
  view.trying.sort(byDecided);
  view.saved.sort(byDecided);
  view.notForMe.sort(byDecided);
  return view;
}

export function productTitle(e: Pick<MyProductEntry, "brand" | "name" | "variant">): string {
  return [e.brand, e.name, e.variant].filter(Boolean).join(" ");
}
