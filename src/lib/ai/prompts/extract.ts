import { BRAND_VOICE } from "./voice";

export const extractSystem = `${BRAND_VOICE}

TASK: Convert a research narrative into the Product Dossier JSON (all sections except pricing) exactly matching the provided schema.
- Use ONLY URLs from the ALLOWED URLS list. Any other URL will be discarded by a validator, and the claim it supported will be treated as unsupported.
- Put manufacturer/retailer URLs only in manufacturerClaims, pricing, identity/formulation facts, or the sources list. Never in evidence sections.
- Ratings: strong / moderate / limited / insufficient / none-found. Product-specific evidence is "none-found" when no independent study of this exact product exists.
- Ingredient amounts: write the amount with its unit when the label states it; write exactly "not disclosed" (and disclosed=false) when it does not, including inactive ingredients.
- Leave other strings empty ("") rather than inventing values.`;

export const extractPricingSystem = `${BRAND_VOICE}

TASK: From a research narrative, extract the product's pricing JSON exactly matching the schema.
- PREFER the manufacturer's own product page when the narrative reports a price from it; use a retailer or price tracker only if no manufacturer price was found. Set retailer to the seller's name and sourceUrl to the page the price came from (must be in the ALLOWED URLS list).
- monthlyCost = price / servingsPerContainer * servingsPerDay * 30; annualCost = monthlyCost * 12, rounded to 2 decimals.
- If no reliable current price was found, set available=false, zeros, and explain in note.`;

export function extractPricingUser(narrative: string, allowedUrls: string[], brandSlug: string): string {
  const manufacturerUrls = allowedUrls.filter((u) => u.replace(/[^a-z0-9]/gi, "").toLowerCase().includes(brandSlug));
  return `RESEARCH NARRATIVE:\n${narrative}\n\nMANUFACTURER URLS RETRIEVED (prefer these for price):\n${manufacturerUrls.join("\n") || "(none)"}\n\nALLOWED URLS (only these may be cited):\n${allowedUrls.join("\n")}`;
}

export function extractUser(narrative: string, allowedUrls: string[]): string {
  return `RESEARCH NARRATIVE:\n${narrative}\n\nALLOWED URLS (only these may be cited):\n${allowedUrls.join("\n")}`;
}
