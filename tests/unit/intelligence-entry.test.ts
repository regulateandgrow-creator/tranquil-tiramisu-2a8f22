import { describe, expect, it } from "vitest";
import { extractProductFromHtml, validateProductUrl } from "@/lib/intelligence/link";
import { sniffImageType } from "@/lib/intelligence/image";
import { cleanLabel, labelQuery, stripSizes } from "@/lib/ai/pipeline/label";

describe("validateProductUrl", () => {
  it("accepts public http(s) product pages", () => {
    expect("url" in validateProductUrl("https://www.spoiledchild.com/products/e27", false)).toBe(true);
    expect("url" in validateProductUrl("http://example.com/x", false)).toBe(true);
  });
  it("rejects non-http schemes, credentials, and private or loopback hosts", () => {
    expect(validateProductUrl("ftp://example.com/x", false)).toEqual({ error: "invalid_url" });
    expect(validateProductUrl("javascript:alert(1)", false)).toEqual({ error: "invalid_url" });
    expect(validateProductUrl("https://user:pw@example.com/x", false)).toEqual({ error: "invalid_url" });
    expect(validateProductUrl("not a url", false)).toEqual({ error: "invalid_url" });
    for (const h of ["http://localhost:3000/", "http://127.0.0.1/", "http://10.1.2.3/", "http://192.168.1.1/", "http://172.16.0.1/", "http://169.254.169.254/latest", "http://[::1]/", "http://intranet/"]) {
      expect(validateProductUrl(h, false)).toEqual({ error: "unsupported_host" });
    }
  });
  it("allows local hosts only when explicitly enabled for tests", () => {
    expect("url" in validateProductUrl("http://localhost:54322/page", true)).toBe(true);
  });
});

describe("extractProductFromHtml", () => {
  it("prefers JSON-LD Product name and brand", () => {
    const html = `<html><head><title>Buy now | Shop</title><script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"E27 Extra Strength Liquid Collagen","brand":{"@type":"Brand","name":"SpoiledChild"}}</script></head></html>`;
    expect(extractProductFromHtml(html)).toMatchObject({ query: "SpoiledChild E27 Extra Strength Liquid Collagen", brand: "SpoiledChild", title: "Buy now | Shop" });
  });
  it("finds a Product inside an @graph array and does not double the brand", () => {
    const html = `<script type="application/ld+json">{"@graph":[{"@type":"WebPage"},{"@type":["Product","Thing"],"name":"SpoiledChild E27 Liquid Collagen","brand":"SpoiledChild"}]}</script>`;
    expect(extractProductFromHtml(html).query).toBe("SpoiledChild E27 Liquid Collagen");
  });
  it("falls back to og:title with the site name stripped, adding the site as brand", () => {
    const html = `<meta property="og:site_name" content="Solstice Botanicals"><meta property="og:title" content="Evening Magnesium Glycinate – Solstice Botanicals">`;
    expect(extractProductFromHtml(html)).toMatchObject({ query: "Solstice Botanicals Evening Magnesium Glycinate", name: "Evening Magnesium Glycinate" });
  });
  it("falls back to the title tag and decodes entities", () => {
    const html = `<title>Lumen &amp; Co Youth Renewal | Lumen &amp; Co</title>`;
    expect(extractProductFromHtml(html).query).toBe("Lumen & Co Youth Renewal");
  });
  it("returns an empty query for a page with nothing usable", () => {
    expect(extractProductFromHtml("<html><body>hello</body></html>").query).toBe("");
  });
  it("ignores malformed JSON-LD", () => {
    const html = `<script type="application/ld+json">{not json</script><title>Fallback Product</title>`;
    expect(extractProductFromHtml(html).query).toBe("Fallback Product");
  });
});

describe("sniffImageType", () => {
  const pad = (bytes: number[]) => new Uint8Array([...bytes, ...new Array(16).fill(0)]);
  it("recognises jpeg, png, gif and webp by magic bytes", () => {
    expect(sniffImageType(pad([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffImageType(pad([0x89, 0x50, 0x4e, 0x47]))).toBe("image/png");
    expect(sniffImageType(pad([0x47, 0x49, 0x46, 0x38]))).toBe("image/gif");
    expect(sniffImageType(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0, 0]))).toBe("image/webp");
  });
  it("rejects anything else, including declared-but-false images", () => {
    expect(sniffImageType(new TextEncoder().encode("<html>not an image</html>"))).toBeNull();
    expect(sniffImageType(new Uint8Array(4))).toBeNull();
  });
});

describe("cleanLabel / labelQuery", () => {
  it("builds the typed-style query from a readable label", () => {
    const r = cleanLabel({ readable: true, brand: " SpoiledChild ", name: "E27 Liquid  Collagen", variant: "Extra Strength", form: "liquid", category: "collagen", confidence: "high", note: "" });
    expect(labelQuery(r)).toBe("SpoiledChild E27 Liquid Collagen Extra Strength");
  });
  it("keeps flavor but drops pack size, count and volume from the variant", () => {
    expect(stripSizes("Mixed berry, 16 fl oz")).toBe("Mixed berry");
    expect(stripSizes("60 capsules")).toBe("");
    expect(stripSizes("Lavender · 120 ct")).toBe("Lavender");
    expect(stripSizes("Unflavored 1 lb")).toBe("Unflavored");
    const r = cleanLabel({ readable: true, brand: "SpoiledChild", name: "E27 Extra Strength Liquid Collagen", variant: "Mixed berry, 16 fl oz", confidence: "high" });
    expect(labelQuery(r)).toBe("SpoiledChild E27 Extra Strength Liquid Collagen Mixed berry");
  });
  it("treats a label with no name as unreadable and defaults confidence", () => {
    const r = cleanLabel({ readable: true, brand: "X", name: "", confidence: "very" as never });
    expect(r.readable).toBe(false);
    expect(r.confidence).toBe("low");
    expect(labelQuery(r)).toBe("");
  });
});
