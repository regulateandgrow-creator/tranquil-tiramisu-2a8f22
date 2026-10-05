import { BRAND_VOICE } from "./voice";
import type { ProductCandidate } from "../schemas";

export const pricingSystem = `${BRAND_VOICE}

TASK: Find the current price of one specific product using web search (manufacturer page first, then major retailers). Return the pricing JSON: price, currency, retailer, source URL, servings per container, servings per day, and computed monthly (price / servings * servingsPerDay * 30) and annual (monthly * 12) cost. If no reliable current price is found, set available=false and explain in note.`;

export function pricingUser(c: ProductCandidate): string {
  return `PRODUCT: ${c.brand} ${c.name}${c.variant ? ` (${c.variant})` : ""}, form: ${c.form}.`;
}
