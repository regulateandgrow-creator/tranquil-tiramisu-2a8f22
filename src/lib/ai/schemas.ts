/**
 * Output contracts for GROWN. Intelligence.
 * TypeScript types + JSON Schemas (strict: every field required, no extras),
 * so the model's output always has the same shape.
 */

/* ── shared enums ──────────────────────────────────────────── */

export const EVIDENCE_RATINGS = ["strong", "moderate", "limited", "insufficient", "none-found"] as const;
export type EvidenceRating = (typeof EVIDENCE_RATINGS)[number];

export const VERDICT_PHRASES = [
  "Reasonable to consider",
  "Worth comparing",
  "Evidence does not clearly justify the premium",
  "May fit your goal",
  "Not well supported for your stated goal",
  "More information needed",
] as const;
export type VerdictPhrase = (typeof VERDICT_PHRASES)[number];

export const LIMITATION_TYPES = [
  "study-quality",
  "small-sample",
  "short-duration",
  "industry-funding",
  "conflict-of-interest",
  "proprietary-blend",
  "dose-mismatch",
  "missing-dosage",
  "unclear-clinical-significance",
  "no-product-specific-research",
  "other",
] as const;
export type LimitationType = (typeof LIMITATION_TYPES)[number];

export const SOURCE_KINDS = ["independent", "manufacturer", "retailer", "other"] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];

export const SIMPLER_OPTION_TYPES = ["food", "behavior", "simpler-formulation", "simpler-category", "no-product"] as const;

/* ── Resolve ───────────────────────────────────────────────── */

export interface ProductCandidate {
  brand: string;
  name: string;
  variant: string;
  form: string;
  category: string;
  note: string;
}

export interface ResolveResult {
  confidence: "high" | "medium" | "low";
  /** Best guess first. Empty when the query is not a product at all. */
  candidates: ProductCandidate[];
  /** One short line to show her when confidence is not high. */
  clarification: string;
}

const candidateSchema = {
  type: "object",
  additionalProperties: false,
  required: ["brand", "name", "variant", "form", "category", "note"],
  properties: {
    brand: { type: "string" },
    name: { type: "string" },
    variant: { type: "string", description: "Variant such as strength or flavor. Empty string if none." },
    form: { type: "string", description: "liquid, capsule, powder, gummy, tablet, softgel, other" },
    category: { type: "string", description: "e.g. collagen supplement, magnesium supplement, protein powder" },
    note: { type: "string", description: "One short line distinguishing this candidate. Empty string if none." },
  },
} as const;

export const resolveSchema = {
  type: "object",
  additionalProperties: false,
  required: ["confidence", "candidates", "clarification"],
  properties: {
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    candidates: { type: "array", items: candidateSchema, maxItems: 5 },
    clarification: { type: "string" },
  },
} as const;

/* ── Product Dossier (shared, cacheable facts) ─────────────── */

export interface DossierIngredient {
  name: string;
  amountPerServing: string; // "10 g" or "not disclosed"
  disclosed: boolean;
  role: string;
  proprietaryBlend: boolean;
  relevantTo: string[]; // benefit areas / goal keys
}

export interface EvidenceEntry {
  rating: EvidenceRating;
  summary: string;
  typicalStudiedDose: string;
  sourceUrls: string[];
}

export interface BenefitEvidence {
  benefit: string;
  ingredientEvidence: EvidenceEntry;
  productEvidence: EvidenceEntry;
}

export interface DossierLimitation {
  type: LimitationType;
  detail: string;
  sourceUrls: string[];
}

export interface DossierPricing {
  available: boolean;
  price: number;
  currency: string;
  retailer: string;
  sourceUrl: string;
  servingsPerContainer: number;
  servingsPerDay: number;
  monthlyCost: number;
  annualCost: number;
  note: string;
}

export interface DossierSource {
  url: string;
  title: string;
  kind: SourceKind;
}

export interface ProductDossier {
  identity: {
    brand: string;
    name: string;
    variant: string;
    form: string;
    servingSize: string;
    servingsPerContainer: string;
    formulationVersion: string;
    identityConfidence: "verified" | "likely" | "unverified";
    notes: string;
  };
  formulation: {
    verifiable: boolean;
    asOf: string;
    ingredients: DossierIngredient[];
    proprietaryBlendPresent: boolean;
    notes: string;
  };
  manufacturerClaims: Array<{ claim: string; sourceUrl: string }>;
  evidenceByBenefit: BenefitEvidence[];
  limitations: DossierLimitation[];
  deliveryFormat: {
    claim: string;
    whatEvidenceShows: string;
    rating: EvidenceRating;
    sourceUrls: string[];
  };
  pricing: DossierPricing;
  cautions: Array<{ caution: string; population: string; sourceUrls: string[] }>;
  sources: DossierSource[];
}

const urlList = { type: "array", items: { type: "string" } } as const;
const evidenceEntrySchema = {
  type: "object",
  additionalProperties: false,
  required: ["rating", "summary", "typicalStudiedDose", "sourceUrls"],
  properties: {
    rating: { type: "string", enum: EVIDENCE_RATINGS },
    summary: { type: "string" },
    typicalStudiedDose: { type: "string", description: "Dose used in the cited research, or empty string" },
    sourceUrls: urlList,
  },
} as const;

export const dossierSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "identity",
    "formulation",
    "manufacturerClaims",
    "evidenceByBenefit",
    "limitations",
    "deliveryFormat",
    "pricing",
    "cautions",
    "sources",
  ],
  properties: {
    identity: {
      type: "object",
      additionalProperties: false,
      required: ["brand", "name", "variant", "form", "servingSize", "servingsPerContainer", "formulationVersion", "identityConfidence", "notes"],
      properties: {
        brand: { type: "string" },
        name: { type: "string" },
        variant: { type: "string" },
        form: { type: "string" },
        servingSize: { type: "string" },
        servingsPerContainer: { type: "string" },
        formulationVersion: { type: "string", description: "Version/date if the maker states one, else empty" },
        identityConfidence: { type: "string", enum: ["verified", "likely", "unverified"] },
        notes: { type: "string" },
      },
    },
    formulation: {
      type: "object",
      additionalProperties: false,
      required: ["verifiable", "asOf", "ingredients", "proprietaryBlendPresent", "notes"],
      properties: {
        verifiable: { type: "boolean" },
        asOf: { type: "string", description: "Date the formulation was observed, ISO or empty" },
        ingredients: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["name", "amountPerServing", "disclosed", "role", "proprietaryBlend", "relevantTo"],
            properties: {
              name: { type: "string" },
              amountPerServing: { type: "string" },
              disclosed: { type: "boolean" },
              role: { type: "string" },
              proprietaryBlend: { type: "boolean" },
              relevantTo: { type: "array", items: { type: "string" } },
            },
          },
        },
        proprietaryBlendPresent: { type: "boolean" },
        notes: { type: "string" },
      },
    },
    manufacturerClaims: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["claim", "sourceUrl"],
        properties: { claim: { type: "string" }, sourceUrl: { type: "string" } },
      },
    },
    evidenceByBenefit: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["benefit", "ingredientEvidence", "productEvidence"],
        properties: {
          benefit: { type: "string" },
          ingredientEvidence: evidenceEntrySchema,
          productEvidence: evidenceEntrySchema,
        },
      },
    },
    limitations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "detail", "sourceUrls"],
        properties: {
          type: { type: "string", enum: LIMITATION_TYPES },
          detail: { type: "string" },
          sourceUrls: urlList,
        },
      },
    },
    deliveryFormat: {
      type: "object",
      additionalProperties: false,
      required: ["claim", "whatEvidenceShows", "rating", "sourceUrls"],
      properties: {
        claim: { type: "string" },
        whatEvidenceShows: { type: "string" },
        rating: { type: "string", enum: EVIDENCE_RATINGS },
        sourceUrls: urlList,
      },
    },
    pricing: {
      type: "object",
      additionalProperties: false,
      required: ["available", "price", "currency", "retailer", "sourceUrl", "servingsPerContainer", "servingsPerDay", "monthlyCost", "annualCost", "note"],
      properties: {
        available: { type: "boolean" },
        price: { type: "number" },
        currency: { type: "string" },
        retailer: { type: "string" },
        sourceUrl: { type: "string" },
        servingsPerContainer: { type: "number" },
        servingsPerDay: { type: "number" },
        monthlyCost: { type: "number" },
        annualCost: { type: "number" },
        note: { type: "string" },
      },
    },
    cautions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["caution", "population", "sourceUrls"],
        properties: { caution: { type: "string" }, population: { type: "string" }, sourceUrls: urlList },
      },
    },
    sources: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["url", "title", "kind"],
        properties: { url: { type: "string" }, title: { type: "string" }, kind: { type: "string", enum: SOURCE_KINDS } },
      },
    },
  },
} as const;

/* ── Personal Analysis (per woman, never shared) ───────────── */

export interface VerdictWithReason {
  verdict: VerdictPhrase;
  reasoning: string;
}

export interface PersonalAnalysis {
  headline: string;
  whatItIs: string;
  whatsInIt: string;
  whatTheyreSellingYou: string;
  whatTheEvidenceSays: Array<{ goal: string; rating: EvidenceRating; summary: string }>;
  theCatch: string[];
  productVsIngredientEvidence: string;
  moneyTest: {
    summary: string;
    monthlyCost: number;
    annualCost: number;
    pricingAvailable: boolean;
    premiumAssessment: VerdictPhrase;
  };
  yourGoal: string;
  goalFit: Array<{ goal: string; verdict: VerdictPhrase; reasoning: string }>;
  simplerOptions: Array<{ option: string; type: (typeof SIMPLER_OPTION_TYPES)[number]; why: string }>;
  consideredNoProduct: boolean;
  cautions: string[];
  grownTake: {
    evidenceFit: VerdictWithReason;
    goalFit: VerdictWithReason;
    value: VerdictWithReason;
    formulaTransparency: VerdictWithReason;
    marketingEvidenceGap: VerdictWithReason;
  };
  oneThingLearned: string;
  /** Numbered sources referenced in prose as [n]. Validated against the dossier. */
  citations: Array<{ n: number; url: string; title: string }>;
}

const verdictWithReasonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["verdict", "reasoning"],
  properties: { verdict: { type: "string", enum: VERDICT_PHRASES }, reasoning: { type: "string" } },
} as const;

export const personalAnalysisSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "headline", "whatItIs", "whatsInIt", "whatTheyreSellingYou", "whatTheEvidenceSays", "theCatch",
    "productVsIngredientEvidence", "moneyTest", "yourGoal", "goalFit", "simplerOptions", "consideredNoProduct",
    "cautions", "grownTake", "oneThingLearned", "citations",
  ],
  properties: {
    headline: { type: "string" },
    whatItIs: { type: "string" },
    whatsInIt: { type: "string" },
    whatTheyreSellingYou: { type: "string" },
    whatTheEvidenceSays: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["goal", "rating", "summary"],
        properties: { goal: { type: "string" }, rating: { type: "string", enum: EVIDENCE_RATINGS }, summary: { type: "string" } },
      },
    },
    theCatch: { type: "array", items: { type: "string" } },
    productVsIngredientEvidence: { type: "string" },
    moneyTest: {
      type: "object",
      additionalProperties: false,
      required: ["summary", "monthlyCost", "annualCost", "pricingAvailable", "premiumAssessment"],
      properties: {
        summary: { type: "string" },
        monthlyCost: { type: "number" },
        annualCost: { type: "number" },
        pricingAvailable: { type: "boolean" },
        premiumAssessment: { type: "string", enum: VERDICT_PHRASES },
      },
    },
    yourGoal: { type: "string" },
    goalFit: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["goal", "verdict", "reasoning"],
        properties: { goal: { type: "string" }, verdict: { type: "string", enum: VERDICT_PHRASES }, reasoning: { type: "string" } },
      },
    },
    simplerOptions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["option", "type", "why"],
        properties: { option: { type: "string" }, type: { type: "string", enum: SIMPLER_OPTION_TYPES }, why: { type: "string" } },
      },
    },
    consideredNoProduct: { type: "boolean" },
    cautions: { type: "array", items: { type: "string" } },
    grownTake: {
      type: "object",
      additionalProperties: false,
      required: ["evidenceFit", "goalFit", "value", "formulaTransparency", "marketingEvidenceGap"],
      properties: {
        evidenceFit: verdictWithReasonSchema,
        goalFit: verdictWithReasonSchema,
        value: verdictWithReasonSchema,
        formulaTransparency: verdictWithReasonSchema,
        marketingEvidenceGap: verdictWithReasonSchema,
      },
    },
    oneThingLearned: { type: "string" },
    citations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["n", "url", "title"],
        properties: { n: { type: "integer" }, url: { type: "string" }, title: { type: "string" } },
      },
    },
  },
} as const;

/* ── Pricing refresh (small, cacheable) ─────────────────────── */

export const pricingSchema = dossierSchema.properties.pricing;
