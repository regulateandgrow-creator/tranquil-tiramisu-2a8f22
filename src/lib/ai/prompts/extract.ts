import { BRAND_VOICE } from "./voice";

export const extractSystem = `${BRAND_VOICE}

TASK: Convert a research narrative into the Product Dossier JSON exactly matching the provided schema.
- Use ONLY URLs from the ALLOWED URLS list. Any other URL will be discarded by a validator, and the claim it supported will be treated as unsupported.
- Put manufacturer/retailer URLs only in manufacturerClaims, pricing, identity/formulation facts, or the sources list. Never in evidence sections.
- Ratings: strong / moderate / limited / insufficient / none-found. Product-specific evidence is "none-found" when no independent study of this exact product exists.
- Numbers: pricing.monthlyCost = price / servingsPerContainer * servingsPerDay * 30; annualCost = monthlyCost * 12, rounded to 2 decimals. If pricing is unavailable, set available=false and zeros.
- Leave strings empty ("") rather than inventing values.`;

export function extractUser(narrative: string, allowedUrls: string[]): string {
  return `RESEARCH NARRATIVE:\n${narrative}\n\nALLOWED URLS (only these may be cited):\n${allowedUrls.join("\n")}`;
}
