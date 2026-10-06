import { aiDefaults } from "@/lib/ai/config";

/**
 * Paste a Link: turn a product page into the same short query a woman would type.
 * No model call. The page is read once, never stored, and only the product name,
 * brand and title are taken from it.
 */

export type LinkRejection = "invalid_url" | "unsupported_host";

const PRIVATE_HOST = /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.|\[?::1\]?$|\[?fc|\[?fd|\[?fe80)/i;
const PRIVATE_172 = /^172\.(1[6-9]|2\d|3[01])\./;

/** http(s) only, no credentials, no private or loopback hosts (unless explicitly allowed for tests). */
export function validateProductUrl(raw: string, allowLocal = process.env.GROWN_LINK_ALLOW_LOCAL === "1"): { url: URL } | { error: LinkRejection } {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { error: "invalid_url" };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return { error: "invalid_url" };
  if (url.username || url.password) return { error: "invalid_url" };
  const host = url.hostname;
  if (!allowLocal && (PRIVATE_HOST.test(host) || PRIVATE_172.test(host) || !host.includes("."))) return { error: "unsupported_host" };
  return { url };
}

export interface ExtractedProduct {
  /** Short query for the Resolve step, or "" when nothing usable was found. */
  query: string;
  brand: string;
  name: string;
  title: string;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, " ").trim();
}

function meta(html: string, key: string): string {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']*)["']`, "i");
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${key}["']`, "i");
  const m = html.match(re) ?? html.match(re2);
  return m ? decodeEntities(m[1]) : "";
}

interface JsonLdProduct { name?: unknown; brand?: unknown; "@type"?: unknown; "@graph"?: unknown }

function findProduct(node: unknown): JsonLdProduct | null {
  if (!node || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const n of node) { const p = findProduct(n); if (p) return p; }
    return null;
  }
  const obj = node as JsonLdProduct;
  const type = obj["@type"];
  const types = Array.isArray(type) ? type : [type];
  if (types.some((t) => typeof t === "string" && /product/i.test(t)) && typeof obj.name === "string") return obj;
  if (obj["@graph"]) return findProduct(obj["@graph"]);
  return null;
}

function brandName(brand: unknown): string {
  if (typeof brand === "string") return brand;
  if (brand && typeof brand === "object" && typeof (brand as { name?: unknown }).name === "string") return (brand as { name: string }).name;
  return "";
}

/** Strip a trailing " | Site" / " – Site" / " - Site" from a title. */
function stripSite(title: string, site: string): string {
  let t = title;
  if (site) {
    const esc = site.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    t = t.replace(new RegExp(`\\s*[|\\-–—:]\\s*${esc}\\s*$`, "i"), "").replace(new RegExp(`^${esc}\\s*[|\\-–—:]\\s*`, "i"), "");
  }
  return t.replace(/\s*[|–—]\s*[^|–—]{0,40}$/, "").trim();
}

export function extractProductFromHtml(html: string): ExtractedProduct {
  const site = meta(html, "og:site_name");
  const ogTitle = meta(html, "og:title");
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = decodeEntities(titleMatch?.[1] ?? "") || ogTitle;

  let brand = "";
  let name = "";
  const ldBlocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of ldBlocks) {
    try {
      const product = findProduct(JSON.parse(m[1].trim()));
      if (product) {
        name = decodeEntities(String(product.name));
        brand = decodeEntities(brandName(product.brand));
        break;
      }
    } catch {
      /* malformed JSON-LD: ignore this block */
    }
  }
  if (!name) {
    const candidate = stripSite(ogTitle || title, site);
    if (candidate) name = candidate;
    if (site && !brand && name && !name.toLowerCase().includes(site.toLowerCase())) brand = site;
  }
  const query = [brand, name].filter(Boolean).join(" ").replace(/\s+/g, " ").trim().slice(0, 200);
  return { query: brand && name.toLowerCase().startsWith(brand.toLowerCase()) ? name.slice(0, 200) : query, brand, name, title };
}

/** Read the page once, capped in size and time. Returns null when it cannot be read. */
export async function fetchProductPage(url: URL): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), aiDefaults.linkTimeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { accept: "text/html,application/xhtml+xml", "user-agent": "Mozilla/5.0 (compatible; GROWN. Intelligence product reader)" },
    });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (!/html|xml/i.test(type)) return null;
    const reader = res.body?.getReader();
    if (!reader) return null;
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (total < aiDefaults.maxLinkBytes) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      chunks.push(value);
      total += value.length;
    }
    void reader.cancel().catch(() => undefined);
    return new TextDecoder("utf-8", { fatal: false }).decode(Buffer.concat(chunks.map((c) => Buffer.from(c))));
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
