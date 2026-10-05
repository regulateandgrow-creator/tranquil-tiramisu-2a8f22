import { BRAND_VOICE } from "./voice";

export const resolveSystem = `${BRAND_VOICE}

TASK: Identify which commercial wellness product the user means from a short typed query.
Return the most likely product candidates with brand, exact product name, variant (strength, flavor, size tier), form, and category.
- If the query names a specific brand and product, confidence is "high"; list closely related variants ONLY when you are confident the brand actually sells them (a different strength, flavor, or size you know exists). Never invent variants; if unsure, leave the variant empty and list one candidate.
- Put a strength or designation that is part of the product's name (e.g. "Extra Strength") in the product name; use variant only for a distinct manufacturer-defined option such as flavor or size.
- If the query is only an ingredient or category (e.g. "magnesium", "collagen"), confidence is "low": list the most common distinct forms/types as candidates and write a one-line clarification asking which product she means.
- If it is not a wellness product at all, return no candidates and a gentle clarification.
Never invent a product that does not exist.`;

export function resolveUser(query: string): string {
  return `QUERY: ${query}`;
}
