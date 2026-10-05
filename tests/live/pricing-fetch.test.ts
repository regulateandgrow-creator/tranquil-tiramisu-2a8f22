/**
 * Narrow live check (founder-approved, negligible cost): does the manufacturer-page
 * fetch step open the SpoiledChild page and return a verifiable price, or honestly
 * report that no price is visible? Run: npx vitest run --config vitest.live.config.mts
 */
import { it, expect } from "vitest";
import { writeFileSync } from "node:fs";
import { AnthropicProvider } from "@/lib/ai/provider/anthropic";
import { pricingFetchSystem, pricingFetchUser } from "@/lib/ai/prompts/pricing";
import { pricingSchema, type DossierPricing } from "@/lib/ai/schemas";
import { aiModels } from "@/lib/ai/config";
import { classifySource, normalizeUrl } from "@/lib/ai/citations";

const KEY = process.env.GROWN_ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY;

it.skipIf(!KEY)("manufacturer-page price fetch on the real API", async () => {
  const provider = new AnthropicProvider(KEY);
  const url = "https://www.spoiledchild.com/supplements/collagen-supplements/e27-extra-strength-liquid-collagen";
  const candidate = { brand: "SpoiledChild", name: "E27 Extra Strength Liquid Collagen", variant: "", form: "liquid", category: "collagen supplement", note: "" };
  const started = Date.now();
  const res = await provider.complete({
    step: "pricing-fetch",
    model: aiModels.research,
    system: pricingFetchSystem,
    user: pricingFetchUser(candidate, [url]),
    webFetch: { maxUses: 2, allowedDomains: ["spoiledchild.com"] },
    jsonSchema: pricingSchema,
    maxTokens: 2000,
    effort: "low",
  });
  const p = res.json as DossierPricing;
  const fetched = res.searchedUrls.map((s) => normalizeUrl(s.url));
  const src = p.sourceUrl ? normalizeUrl(p.sourceUrl) : "";
  const verified = p.available && p.price > 0 && !!src && fetched.includes(src) && classifySource(src, "spoiledchild").kind === "manufacturer";
  const summary = {
    model: res.model, stopReason: res.stopReason, latencyMs: Date.now() - started,
    usage: res.usage, fetchedUrls: fetched, pricing: p, verifiedManufacturerPrice: verified,
  };
  writeFileSync("acceptance-output/live-pricing-fetch.json", JSON.stringify(summary, null, 2));
  // The fetch tool must have actually retrieved the page, and the result must be either a verified
  // manufacturer price or an honest "unavailable". A price citing an unfetched URL is a failure.
  expect(fetched.length).toBeGreaterThan(0);
  expect(verified || !p.available).toBe(true);
});
