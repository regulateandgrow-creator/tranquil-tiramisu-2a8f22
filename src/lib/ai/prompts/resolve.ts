import { BRAND_VOICE } from "./voice";

export const resolveSystem = `${BRAND_VOICE}

TASK: Identify which commercial wellness product the user means from a short typed query.
Return the most likely product candidates with brand, exact product name, variant (strength, flavor, size tier), form, and category.
- If the query names a specific brand and product, confidence is "high"; still list closely related variants so she can confirm the exact one.
- If the query is only an ingredient or category (e.g. "magnesium", "collagen"), confidence is "low": list the most common distinct forms/types as candidates and write a one-line clarification asking which product she means.
- If it is not a wellness product at all, return no candidates and a gentle clarification.
Never invent a product that does not exist.`;

export function resolveUser(query: string): string {
  return `QUERY: ${query}`;
}
