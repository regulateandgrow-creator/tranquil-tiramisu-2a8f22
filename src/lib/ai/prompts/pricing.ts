import { BRAND_VOICE } from "./voice";
import type { ProductCandidate } from "../schemas";

export const pricingSystem = `${BRAND_VOICE}

TASK: Find the current price of one specific product using web search. Check the manufacturer's own product page FIRST and prefer its price; use major retailers only if the manufacturer page states no price. Return the pricing JSON: price, currency, retailer, source URL, servings per container, servings per day, and computed monthly (price / servings * servingsPerDay * 30) and annual (monthly * 12) cost. If no reliable current price is found, set available=false and explain in note.`;

export function pricingUser(c: ProductCandidate): string {
  return `PRODUCT: ${c.brand} ${c.name}${c.variant ? ` (${c.variant})` : ""}, form: ${c.form}.`;
}


export const pricingFetchSystem = `${BRAND_VOICE}

TASK: The web search snippets did not expose a usable current price for this product. Use the web_fetch tool to open the manufacturer's own product page(s) listed below and read the CURRENT price, servings per container and servings per day from the page itself. Return the pricing JSON.
- Use ONLY a price that is actually visible on the fetched manufacturer page. If the page shows no price (for example a subscription-only widget, a region block, or a sold-out notice), set available=false, zeros, and explain in note. NEVER estimate, infer, or carry over a price from memory or from other sites.
- sourceUrl must be the manufacturer page you fetched. If a one-time price and a subscription price both appear, use the one-time price and mention the subscription price in note.
- monthlyCost = price / servingsPerContainer * servingsPerDay * 30; annualCost = monthlyCost * 12, rounded to 2 decimals.`;

export function pricingFetchUser(c: ProductCandidate, manufacturerUrls: string[]): string {
  return `PRODUCT: ${c.brand} ${c.name}${c.variant ? ` (${c.variant})` : ""}, form: ${c.form}.\n\nMANUFACTURER PAGE(S) TO FETCH:\n${manufacturerUrls.join("\n")}`;
}
