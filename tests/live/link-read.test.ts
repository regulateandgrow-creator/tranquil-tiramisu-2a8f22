/**
 * Narrow live check (no model, no cost): can the server read a real manufacturer product page
 * and turn it into a typed-style query? Reports "blocked" when this environment's egress denies it.
 */
import { it, expect } from "vitest";
import { extractProductFromHtml, fetchProductPage, validateProductUrl } from "@/lib/intelligence/link";

it("reads a real product page into a query", async () => {
  const checked = validateProductUrl("https://www.spoiledchild.com/supplements/collagen-supplements/e27-extra-strength-liquid-collagen", false);
  expect("url" in checked).toBe(true);
  const html = await fetchProductPage((checked as { url: URL }).url);
  if (html === null) {
    console.log(JSON.stringify({ link: "blocked or unreachable from this environment" }));
    return;
  }
  const product = extractProductFromHtml(html);
  console.log(JSON.stringify({ query: product.query, brand: product.brand, title: product.title, bytes: html.length }));
  expect(product.query.toLowerCase()).toContain("e27");
});
