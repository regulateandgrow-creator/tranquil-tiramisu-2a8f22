import { createHash } from "node:crypto";
import type { ProductCandidate, DossierIngredient } from "./schemas";

/** Lowercase, strip accents and punctuation, collapse whitespace, drop filler words. */
export function normalizeText(input: string): string {
  return input
    .replace(/[™®©]/g, "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(the|by|from|with|and|a|an|of)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeForm(form: string): string {
  const f = normalizeText(form);
  if (/liquid|drink|shot|syrup/.test(f)) return "liquid";
  if (/capsule|cap\b|caps\b/.test(f)) return "capsule";
  if (/softgel/.test(f)) return "softgel";
  if (/tablet|tab\b/.test(f)) return "tablet";
  if (/gummy|gummies/.test(f)) return "gummy";
  if (/powder|scoop/.test(f)) return "powder";
  return f || "other";
}

export interface ProductIdentity {
  brand: string;
  name: string;
  variant: string;
  form: string;
}

/** Stable key for cache lookup: same product + variant + form → same key. */
export function identityKey(id: ProductIdentity): string {
  // Brand is compacted ("Spoiled Child" and "SpoiledChild" are the same maker).
  const parts = [brandSlug(id.brand), normalizeText(id.name), normalizeText(id.variant), normalizeForm(id.form)];
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 32);
}

export function identityFromCandidate(c: ProductCandidate): ProductIdentity {
  return { brand: c.brand, name: c.name, variant: c.variant, form: c.form };
}

/** Changes when the ingredient list or disclosed amounts change. */
export function formulationFingerprint(ingredients: DossierIngredient[]): string {
  const normalized = ingredients
    .map((i) => `${normalizeText(i.name)}=${normalizeText(i.amountPerServing)}`)
    .sort()
    .join(";");
  return createHash("sha256").update(normalized).digest("hex").slice(0, 32);
}

/** Lowercase brand slug used to recognise manufacturer domains. */
export function brandSlug(brand: string): string {
  return normalizeText(brand).replace(/\s+/g, "");
}
