import type { ProductDossier, PersonalAnalysis, SourceKind } from "./schemas";

/**
 * Citation integrity.
 *
 * Rule 1: a citation URL must have been returned by web search in the same
 *         pipeline run. Anything else is dropped and reported.
 * Rule 2: manufacturer and retailer domains may support claims, product facts
 *         and pricing, never evidence. Any other host (including journals the
 *         tier list does not know) may support evidence; tiering is reporting only.
 * Rule 3: an evidence entry left with no confirmed independent source cannot
 *         keep a rating above "insufficient".
 * There is no numeric quota: the strongest relevant evidence available wins.
 */

const TIER1_HOSTS = [
  "nih.gov", "ncbi.nlm.nih.gov", "pubmed.ncbi.nlm.nih.gov", "cochranelibrary.com", "cochrane.org",
  "who.int", "nhs.uk", "fda.gov", "cdc.gov", "medlineplus.gov", "clinicaltrials.gov",
  "mayoclinic.org", "health.harvard.edu", "hopkinsmedicine.org", "clevelandclinic.org", "my.clevelandclinic.org",
  "jamanetwork.com", "thelancet.com", "bmj.com", "nejm.org", "nature.com", "sciencedirect.com",
  "link.springer.com", "onlinelibrary.wiley.com", "tandfonline.com", "biomedcentral.com", "academic.oup.com",
  "cambridge.org", "ahajournals.org", "aad.org", "arthritis.org", "eatright.org", "acsm.org", "ods.od.nih.gov",
  "nccih.nih.gov", "efsa.europa.eu", "ema.europa.eu", "ncbi.nlm.nih.gov",
];
const TIER2_HOSTS = [
  "examine.com", "consumerlab.com", "labdoor.com", "healthline.com", "webmd.com", "medicalnewstoday.com",
  "mdpi.com", "frontiersin.org", "hindawi.com", "sciencedaily.com", "nutrition.org", "aafp.org",
];
const RETAILER_HOSTS = [
  "amazon.", "target.com", "walmart.com", "costco.com", "sephora.com", "ulta.com", "iherb.com", "vitacost.com",
  "cvs.com", "walgreens.com", "thrivemarket.com", "gnc.com", "vitaminshoppe.com", "ebay.", "shop.app",
];

export function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw.trim());
    u.hash = "";
    for (const key of [...u.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|ref$|ref_|tag$)/i.test(key)) u.searchParams.delete(key);
    }
    u.hostname = u.hostname.toLowerCase().replace(/^www\./, "");
    let out = u.toString();
    if (out.endsWith("/") && u.pathname === "/" && !u.search) out = out.slice(0, -1);
    return out;
  } catch {
    return raw.trim();
  }
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function hostMatches(host: string, pattern: string): boolean {
  if (pattern.endsWith(".")) return host.includes(pattern); // e.g. "amazon."
  return host === pattern || host.endsWith("." + pattern);
}

export interface SourceClass {
  kind: SourceKind;
  tier: 1 | 2 | 3;
}

export function classifySource(url: string, brandSlug: string): SourceClass {
  const host = hostOf(url);
  if (!host) return { kind: "other", tier: 3 };
  const compactHost = host.replace(/[^a-z0-9]/g, "");
  if (brandSlug && brandSlug.length >= 4 && compactHost.includes(brandSlug)) return { kind: "manufacturer", tier: 3 };
  if (RETAILER_HOSTS.some((p) => hostMatches(host, p))) return { kind: "retailer", tier: 2 };
  if (host.endsWith(".gov") || host.endsWith(".edu") || host.endsWith(".ac.uk") || host.endsWith(".nhs.uk")) {
    return { kind: "independent", tier: 1 };
  }
  if (TIER1_HOSTS.some((p) => hostMatches(host, p))) return { kind: "independent", tier: 1 };
  if (TIER2_HOSTS.some((p) => hostMatches(host, p))) return { kind: "independent", tier: 2 };
  return { kind: "other", tier: 3 };
}

export interface CitationReport {
  allowedCount: number;
  dropped: string[];                 // URLs not returned by search
  manufacturerInEvidence: string[];  // manufacturer/retailer URLs removed from evidence sections
  downgraded: string[];              // evidence entries downgraded to "insufficient"
  tier1Count: number;
  /** Set by the research pipeline: outcome of the manufacturer-page price fetch fallback. */
  pricingFetch?: "not-needed" | "skipped-no-manufacturer-url" | "used" | "no-price-on-page" | "failed";
}

/**
 * Validates every URL in a dossier against the set of URLs web search actually
 * returned. Mutates and returns a cleaned copy. Deterministic and side-effect free.
 */
export function validateDossierCitations(
  dossier: ProductDossier,
  searchedUrls: string[],
  brandSlug: string,
): { dossier: ProductDossier; report: CitationReport } {
  const allowed = new Map<string, string>(); // normalized → original
  for (const u of searchedUrls) allowed.set(normalizeUrl(u), u);
  const report: CitationReport = { allowedCount: allowed.size, dropped: [], manufacturerInEvidence: [], downgraded: [], tier1Count: 0 };

  const keep = (urls: string[], evidence: boolean): string[] => {
    const out: string[] = [];
    for (const raw of urls) {
      const n = normalizeUrl(raw);
      if (!allowed.has(n)) {
        report.dropped.push(raw);
        continue;
      }
      const cls = classifySource(n, brandSlug);
      if (evidence && (cls.kind === "manufacturer" || cls.kind === "retailer")) {
        report.manufacturerInEvidence.push(raw);
        continue;
      }
      if (!out.includes(n)) out.push(n);
    }
    return out;
  };

  const d: ProductDossier = JSON.parse(JSON.stringify(dossier));

  d.manufacturerClaims = d.manufacturerClaims.map((c) => ({ ...c, sourceUrl: keep([c.sourceUrl], false)[0] ?? "" }));

  d.evidenceByBenefit = d.evidenceByBenefit.map((b) => {
    const ing = { ...b.ingredientEvidence, sourceUrls: keep(b.ingredientEvidence.sourceUrls, true) };
    const prod = { ...b.productEvidence, sourceUrls: keep(b.productEvidence.sourceUrls, true) };
    for (const [label, e] of [["ingredient", ing], ["product", prod]] as const) {
      if (e.sourceUrls.length === 0 && e.rating !== "insufficient" && e.rating !== "none-found") {
        report.downgraded.push(`${b.benefit}:${label}`);
        e.rating = "insufficient";
        e.summary = `${e.summary} (No confirmed independent source for this point; treated as insufficient.)`.trim();
      }
    }
    return { ...b, ingredientEvidence: ing, productEvidence: prod };
  });

  d.limitations = d.limitations.map((l) => ({ ...l, sourceUrls: keep(l.sourceUrls, false) }));

  const df = { ...d.deliveryFormat, sourceUrls: keep(d.deliveryFormat.sourceUrls, true) };
  if (df.sourceUrls.length === 0 && df.rating !== "insufficient" && df.rating !== "none-found") {
    report.downgraded.push("deliveryFormat");
    df.rating = "insufficient";
  }
  d.deliveryFormat = df;

  d.pricing = { ...d.pricing, sourceUrl: keep([d.pricing.sourceUrl], false)[0] ?? "" };
  if (!d.pricing.sourceUrl) d.pricing = { ...d.pricing, available: false, note: d.pricing.note || "Pricing source could not be confirmed." };

  d.cautions = d.cautions.map((c) => ({ ...c, sourceUrls: keep(c.sourceUrls, false) }));

  d.sources = d.sources
    .filter((s) => allowed.has(normalizeUrl(s.url)))
    .map((s) => {
      const n = normalizeUrl(s.url);
      const cls = classifySource(n, brandSlug);
      if (cls.tier === 1) report.tier1Count += 1;
      return { url: n, title: s.title, kind: cls.kind };
    });
  // Any confirmed URL used in the body but missing from the source list gets added.
  const used = new Set<string>();
  const collect = (urls: string[]) => urls.forEach((u) => used.add(u));
  d.evidenceByBenefit.forEach((b) => { collect(b.ingredientEvidence.sourceUrls); collect(b.productEvidence.sourceUrls); });
  d.limitations.forEach((l) => collect(l.sourceUrls));
  d.cautions.forEach((c) => collect(c.sourceUrls));
  collect(d.deliveryFormat.sourceUrls);
  d.manufacturerClaims.forEach((c) => c.sourceUrl && used.add(c.sourceUrl));
  if (d.pricing.sourceUrl) used.add(d.pricing.sourceUrl);
  for (const u of used) {
    if (!d.sources.some((s) => s.url === u)) {
      const cls = classifySource(u, brandSlug);
      if (cls.tier === 1) report.tier1Count += 1;
      d.sources.push({ url: u, title: u, kind: cls.kind });
    }
  }

  return { dossier: d, report };
}

/**
 * The personal analysis may only cite URLs that survived dossier validation.
 * Unknown citations are removed and their [n] markers replaced in prose.
 */
export function validateAnalysisCitations(
  analysis: PersonalAnalysis,
  dossier: ProductDossier,
): { analysis: PersonalAnalysis; dropped: string[] } {
  const allowed = new Set(dossier.sources.map((s) => normalizeUrl(s.url)));
  const dropped: string[] = [];
  const kept = analysis.citations.filter((c) => {
    const ok = allowed.has(normalizeUrl(c.url));
    if (!ok) dropped.push(c.url);
    return ok;
  }).map((c) => ({ ...c, url: normalizeUrl(c.url) }));
  const droppedNumbers = new Set(analysis.citations.filter((c) => !allowed.has(normalizeUrl(c.url))).map((c) => c.n));

  const fix = (text: string) =>
    droppedNumbers.size === 0
      ? text
      : text.replace(/\[(\d+)\]/g, (m, n) => (droppedNumbers.has(Number(n)) ? "[source not confirmed]" : m));

  const a: PersonalAnalysis = JSON.parse(JSON.stringify(analysis));
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") return fix(v);
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  const cleaned = walk({ ...a, citations: [] }) as PersonalAnalysis;
  cleaned.citations = kept;
  return { analysis: cleaned, dropped };
}
