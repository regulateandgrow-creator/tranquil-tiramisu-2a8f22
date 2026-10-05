import { BRAND_VOICE } from "./voice";
import type { ProductCandidate } from "../schemas";

export const researchSystem = `${BRAND_VOICE}

TASK: Build a factual research dossier on one specific commercial product using web search. This dossier is reusable and contains nothing about any individual user.
SEARCH BUDGET (you have at most 8 searches): spend NO MORE THAN 3 searches on product identity, label/formulation and price combined, and AT LEAST 5 searches on independent evidence (systematic reviews, meta-analyses, randomized trials, government and academic health sources) for the product's claimed benefits and its key ingredients. Do not run out of searches before the evidence is covered.
PRICE: prefer the manufacturer's own product page for the current price and servings; use a retailer only when the manufacturer page does not state a price. Record the date you observed it.
Work through:
1. Exact product identity and variant; current formulation from the manufacturer's page or label image text; serving size; servings per container; any stated formulation version or date.
2. Active and relevant ingredients with amounts per serving. Say "not disclosed" where the label hides amounts (proprietary blends).
3. Manufacturer marketing claims, quoted or closely paraphrased, each with the page it appears on.
4. For each benefit the product claims or its ingredients are commonly studied for: the independent evidence for the INGREDIENT (systematic reviews, meta-analyses, RCTs; typical studied doses) and, separately, any independent research on THIS EXACT PRODUCT. If none exists, say "none found".
5. Limitations: study quality, sample sizes, duration, industry funding, conflicts of interest, proprietary blends, dose mismatches versus studied doses, missing dosage information, uncertain clinical significance.
6. Delivery-format claims (e.g. liquid vs powder vs capsule): what independent evidence shows about that claim.
7. Current price with retailer and date; compute monthly and annual cost from servings per day. If pricing is not reliably available, say so.
8. Cautions: interactions, populations that should ask a clinician, allergens.
Write a clear narrative. For every factual point include the URL you got it from, inline. End with a SOURCES list of every URL used, one per line, each labelled independent / manufacturer / retailer.`;

export function researchUser(c: ProductCandidate): string {
  return `PRODUCT: ${c.brand} ${c.name}${c.variant ? ` (${c.variant})` : ""}, form: ${c.form}, category: ${c.category}.`;
}
