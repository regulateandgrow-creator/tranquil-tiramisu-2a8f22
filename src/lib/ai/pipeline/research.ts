import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiProvider } from "../provider/types";
import { aiDefaults, aiModels } from "../config";
import { dossierSchema, pricingSchema, type DossierPricing, type ProductCandidate, type ProductDossier } from "../schemas";
import { researchSystem, researchUser } from "../prompts/research";
import { extractSystem, extractUser } from "../prompts/extract";
import { pricingSystem, pricingUser } from "../prompts/pricing";
import { validateDossierCitations, type CitationReport, normalizeUrl } from "../citations";
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

  // 2. Extract into the strict dossier schema, allowing only searched URLs.
  const allowed = narrative.searchedUrls.map((s) => normalizeUrl(s.url));
  const extractPrompt = extractUser(narrative.text, allowed);
  const extracted = await provider.complete({
    step: "extract",
    model: aiModels.extract,
    system: extractSystem,
    user: extractPrompt,
    jsonSchema: dossierSchema,
    maxTokens: 16000,
    effort: "medium",
    fixtureKey,
  });
  usage = add(usage, extracted.usage);
  raw.push({ step: "extract", prompt: `${extractSystem}\n\n${extractPrompt}`, output: extracted.text });

  // 3. Validate citations: fabricated or unsearched URLs cannot survive.
  const { dossier, report } = validateDossierCitations(extracted.json as ProductDossier, allowed, slug);

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

  return { productId: product.id, research, dossier, cached: false, pricingRefreshed: false, report, usage, model: extracted.model, raw };
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

function add(a: { inputTokens: number; outputTokens: number }, b: { inputTokens: number; outputTokens: number }) {
  return { inputTokens: a.inputTokens + b.inputTokens, outputTokens: a.outputTokens + b.outputTokens };
}
