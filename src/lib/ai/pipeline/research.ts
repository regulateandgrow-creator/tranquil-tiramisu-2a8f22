import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiProvider } from "../provider/types";
import { aiDefaults, aiModels } from "../config";
import { dossierCoreSchema, pricingSchema, type DossierPricing, type ProductCandidate, type ProductDossier, type ProductDossierCore } from "../schemas";
import { researchSystem, researchUser } from "../prompts/research";
import { extractSystem, extractUser, extractPricingSystem, extractPricingUser } from "../prompts/extract";
import { pricingSystem, pricingUser, pricingFetchSystem, pricingFetchUser } from "../prompts/pricing";
import { validateDossierCitations, type CitationReport, normalizeUrl, classifySource, hostOf } from "../citations";
import { brandSlug, formulationFingerprint, identityFromCandidate, identityKey } from "../identity";
import { findProductByKey, insertResearch, latestResearch, updateResearchPricing, upsertProduct, type ResearchRow } from "@/lib/db/intelligence";

export interface ResearchOutcome {
  productId: string;
  research: ResearchRow;
  dossier: ProductDossier;
  cached: boolean;
  pricingRefreshed: boolean;
  report: CitationReport | null;
  usage: { inputTokens: number; outputTokens: number };
  model: string | null;
  raw: Array<{ step: string; prompt: string; output: string }>;
}

interface Ttls {
  researchTtlDays: number;
  pricingTtlDays: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function isFresh(row: ResearchRow, now: Date): boolean {
  return !row.stale && new Date(row.expires_at).getTime() > now.getTime();
}

function pricingFresh(row: ResearchRow, ttlDays: number, now: Date): boolean {
  if (!row.price_observed_at) return false;
  return new Date(row.price_observed_at).getTime() + ttlDays * DAY_MS > now.getTime();
}

/**
 * Returns a fresh dossier for the product: from cache when a non-stale,
 * unexpired version exists; otherwise researches, validates citations, and
 * stores a new version. Pricing has its own shorter lifetime.
 */
export async function researchProduct(
  provider: AiProvider,
  admin: SupabaseClient,
  candidate: ProductCandidate,
  ttls: Ttls,
  fixtureKey: string,
  now: Date = new Date(),
): Promise<ResearchOutcome> {
  const key = identityKey(identityFromCandidate(candidate));
  const slug = brandSlug(candidate.brand);
  const raw: ResearchOutcome["raw"] = [];
  let usage = { inputTokens: 0, outputTokens: 0 };

  const product = (await findProductByKey(admin, key)) ?? (await upsertProduct(admin, key, candidate));
  const existing = await latestResearch(admin, product.id);

  if (existing && isFresh(existing, now)) {
    let dossier = existing.dossier;
    let pricingRefreshed = false;
    if (!pricingFresh(existing, ttls.pricingTtlDays, now)) {
      const refreshed = await refreshPricing(provider, candidate, slug, fixtureKey);
      if (refreshed) {
        dossier = { ...dossier, pricing: refreshed.pricing };
        await updateResearchPricing(admin, existing.id, refreshed.pricing, dossier);
        usage = refreshed.usage;
        raw.push(refreshed.raw);
        pricingRefreshed = true;
      }
    }
    return { productId: product.id, research: { ...existing, dossier }, dossier, cached: true, pricingRefreshed, report: null, usage, model: existing.model, raw };
  }

  // 1. Research narrative with web search.
  const researchPrompt = researchUser(candidate);
  const narrative = await provider.complete({
    step: "research",
    model: aiModels.research,
    system: researchSystem,
    user: researchPrompt,
    webSearch: { maxUses: aiDefaults.webSearchMaxUses },
    maxTokens: 16000,
    effort: "high",
    fixtureKey,
  });
  usage = add(usage, narrative.usage);
  raw.push({ step: "research", prompt: `${researchSystem}\n\n${researchPrompt}`, output: narrative.text });

  // 2. Extract into strict schemas, allowing only searched URLs. Two calls:
  //    the dossier core and the pricing block (the full schema is too large
  //    for the structured-output compiler; verified live).
  const allowed = narrative.searchedUrls.map((s) => normalizeUrl(s.url));
  const extractPrompt = extractUser(narrative.text, allowed);
  const extracted = await provider.complete({
    step: "extract",
    model: aiModels.extract,
    system: extractSystem,
    user: extractPrompt,
    jsonSchema: dossierCoreSchema,
    maxTokens: 16000,
    effort: "medium",
    fixtureKey,
  });
  usage = add(usage, extracted.usage);
  raw.push({ step: "extract", prompt: `${extractSystem}\n\n${extractPrompt}`, output: extracted.text });

  const pricingPrompt = extractPricingUser(narrative.text, allowed, slug);
  const extractedPricing = await provider.complete({
    step: "pricing",
    model: aiModels.extract,
    system: extractPricingSystem,
    user: pricingPrompt,
    jsonSchema: pricingSchema,
    maxTokens: 2000,
    effort: "low",
    fixtureKey,
  });
  usage = add(usage, extractedPricing.usage);
  raw.push({ step: "extract-pricing", prompt: `${extractPricingSystem}\n\n${pricingPrompt}`, output: extractedPricing.text });

  let pricing = extractedPricing.json as DossierPricing;

  // Manufacturer-page fetch fallback (founder-approved): when the brand page was
  // retrieved but the search snippet exposed no usable manufacturer price, open the
  // page directly and read the price from it. Never infers; keeps the existing
  // fallback when the page still shows no verifiable price.
  const manufacturerUrls = allowed.filter((u) => classifySource(u, slug).kind === "manufacturer");
  const priceFromManufacturer = pricing.available && !!pricing.sourceUrl && classifySource(normalizeUrl(pricing.sourceUrl), slug).kind === "manufacturer";
  let pricingFetchOutcome: "not-needed" | "skipped-no-manufacturer-url" | "used" | "no-price-on-page" | "failed" = "not-needed";
  if (!priceFromManufacturer) {
    if (manufacturerUrls.length === 0) {
      pricingFetchOutcome = "skipped-no-manufacturer-url";
    } else {
      const fetched = await fetchManufacturerPrice(provider, candidate, manufacturerUrls, slug, fixtureKey);
      usage = add(usage, fetched.usage);
      if (fetched.raw) raw.push(fetched.raw);
      if (fetched.pricing) {
        pricing = fetched.pricing;
        pricingFetchOutcome = "used";
      } else {
        pricingFetchOutcome = fetched.failed ? "failed" : "no-price-on-page";
      }
    }
  }

  const merged: ProductDossier = normalizeDossier({
    ...(extracted.json as ProductDossierCore),
    pricing,
  });

  // 3. Validate citations: fabricated or unsearched URLs cannot survive.
  const { dossier, report } = validateDossierCitations(merged, allowed, slug);

  const fingerprint = formulationFingerprint(dossier.formulation.ingredients);
  const version = (existing?.version ?? 0) + 1;
  const research = await insertResearch(admin, {
    product_id: product.id,
    version,
    dossier,
    sources: dossier.sources,
    formulation_fingerprint: fingerprint,
    price_snapshot: dossier.pricing.available ? dossier.pricing : null,
    price_observed_at: dossier.pricing.available ? now.toISOString() : null,
    model: extracted.model,
    expires_at: new Date(now.getTime() + ttls.researchTtlDays * DAY_MS).toISOString(),
    stale: false,
  });

  return { productId: product.id, research, dossier, cached: false, pricingRefreshed: false, report: { ...report, pricingFetch: pricingFetchOutcome }, usage, model: extracted.model, raw };
}

/**
 * Opens the manufacturer page(s) with the web fetch tool and reads the price.
 * Returns pricing only when the model cites a fetched manufacturer URL; anything
 * else is discarded so a price can never be inferred or fabricated.
 */
async function fetchManufacturerPrice(
  provider: AiProvider,
  candidate: ProductCandidate,
  manufacturerUrls: string[],
  slug: string,
  fixtureKey: string,
): Promise<{ pricing: DossierPricing | null; failed: boolean; usage: { inputTokens: number; outputTokens: number }; raw: { step: string; prompt: string; output: string } | null }> {
  const prompt = pricingFetchUser(candidate, manufacturerUrls.slice(0, 2));
  try {
    const res = await provider.complete({
      step: "pricing-fetch",
      model: aiModels.research,
      system: pricingFetchSystem,
      user: prompt,
      webFetch: { maxUses: 2, allowedDomains: [...new Set(manufacturerUrls.map(hostOf).filter(Boolean))] },
      jsonSchema: pricingSchema,
      maxTokens: 2000,
      effort: "low",
      fixtureKey,
    });
    const p = res.json as DossierPricing;
    const fetchedUrls = new Set(res.searchedUrls.map((s) => normalizeUrl(s.url)));
    const src = p.sourceUrl ? normalizeUrl(p.sourceUrl) : "";
    const ok = p.available && p.price > 0 && !!src && fetchedUrls.has(src) && classifySource(src, slug).kind === "manufacturer";
    return { pricing: ok ? { ...p, sourceUrl: src } : null, failed: false, usage: res.usage, raw: { step: "pricing-fetch", prompt: `${pricingFetchSystem}\n\n${prompt}`, output: res.text } };
  } catch {
    return { pricing: null, failed: true, usage: { inputTokens: 0, outputTokens: 0 }, raw: null };
  }
}

async function refreshPricing(
  provider: AiProvider,
  candidate: ProductCandidate,
  slug: string,
  fixtureKey: string,
): Promise<{ pricing: DossierPricing; usage: { inputTokens: number; outputTokens: number }; raw: { step: string; prompt: string; output: string } } | null> {
  try {
    const prompt = pricingUser(candidate);
    const res = await provider.complete({
      step: "pricing",
      model: aiModels.research,
      system: pricingSystem,
      user: prompt,
      webSearch: { maxUses: 3 },
      jsonSchema: pricingSchema,
      maxTokens: 2000,
      effort: "low",
      fixtureKey,
    });
    const pricing = res.json as DossierPricing;
    const allowed = new Set(res.searchedUrls.map((s) => normalizeUrl(s.url)));
    const sourceOk = pricing.sourceUrl && allowed.has(normalizeUrl(pricing.sourceUrl));
    const clean: DossierPricing = sourceOk
      ? { ...pricing, sourceUrl: normalizeUrl(pricing.sourceUrl) }
      : { ...pricing, available: false, sourceUrl: "", note: pricing.note || "Pricing source could not be confirmed." };
    void slug;
    return { pricing: clean, usage: res.usage, raw: { step: "pricing", prompt: `${pricingSystem}\n\n${prompt}`, output: res.text } };
  } catch {
    return null; // stale pricing is shown with its observed date rather than failing the analysis
  }
}

/**
 * Deterministic clean-up after extraction:
 *  - an ingredient with no amount is labelled "not disclosed" (and marked undisclosed)
 *  - string fields are never undefined
 */
export function normalizeDossier(d: ProductDossier): ProductDossier {
  const ingredients = (d.formulation?.ingredients ?? []).map((i) => {
    const amount = (i.amountPerServing ?? "").trim();
    const disclosed = amount !== "" && !/not disclosed|undisclosed|n\/a/i.test(amount) && i.disclosed !== false;
    return { ...i, amountPerServing: disclosed ? amount : "not disclosed", disclosed };
  });
  const pricing: DossierPricing = {
    available: !!d.pricing?.available,
    price: Number(d.pricing?.price ?? 0) || 0,
    currency: d.pricing?.currency || "USD",
    retailer: d.pricing?.retailer ?? "",
    sourceUrl: d.pricing?.sourceUrl ?? "",
    servingsPerContainer: Number(d.pricing?.servingsPerContainer ?? 0) || 0,
    servingsPerDay: Number(d.pricing?.servingsPerDay ?? 0) || 0,
    monthlyCost: Number(d.pricing?.monthlyCost ?? 0) || 0,
    annualCost: Number(d.pricing?.annualCost ?? 0) || 0,
    note: d.pricing?.note ?? "",
  };
  // Recompute the arithmetic from the inputs so a model slip cannot mis-state the money test.
  if (pricing.available && pricing.price > 0 && pricing.servingsPerContainer > 0 && pricing.servingsPerDay > 0) {
    pricing.monthlyCost = Math.round(((pricing.price / pricing.servingsPerContainer) * pricing.servingsPerDay * 30) * 100) / 100;
    pricing.annualCost = Math.round(pricing.monthlyCost * 12 * 100) / 100;
  }
  return { ...d, formulation: { ...d.formulation, ingredients }, pricing };
}

function add(a: { inputTokens: number; outputTokens: number }, b: { inputTokens: number; outputTokens: number }) {
  return { inputTokens: a.inputTokens + b.inputTokens, outputTokens: a.outputTokens + b.outputTokens };
}
