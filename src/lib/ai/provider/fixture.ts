import type { AiProvider, CompletionRequest, CompletionResult } from "./types";
import { AiProviderError } from "./types";
import type { PersonalAnalysis, ProductDossier, ResolveResult } from "../schemas";

/**
 * Scripted provider for automated tests and local development without an API
 * key. It exercises every pipeline path (confirmation, caching, citation
 * validation, lint regeneration, failures) with deterministic content.
 *
 * Everything here is TEST SCAFFOLDING, not research. Analyses produced by it
 * are tagged model="fixture" and the UI shows a "scripted test data" badge.
 */

const NIH_ODS = "https://ods.od.nih.gov/factsheets/Collagen-HealthProfessional/";
const PUBMED_SR = "https://pubmed.ncbi.nlm.nih.gov/33742704/";
const PUBMED_RCT = "https://pubmed.ncbi.nlm.nih.gov/30681787/";
const PUBMED_JOINT = "https://pubmed.ncbi.nlm.nih.gov/18416885/";
const EXAMINE = "https://examine.com/supplements/collagen/";
const MFR = "https://www.spoiledchild.com/products/e27-extra-strength-liquid-collagen";
const RETAILER = "https://www.amazon.com/dp/B0EXAMPLE";
const FAKE = "https://example-fake-journal.org/collagen-liquid-superiority";

function collagenDossier(): ProductDossier {
  return {
    identity: {
      brand: "SpoiledChild",
      name: "E27 Liquid Collagen",
      variant: "Extra Strength",
      form: "liquid",
      servingSize: "1 fl oz (30 ml)",
      servingsPerContainer: "32",
      formulationVersion: "",
      identityConfidence: "verified",
      notes: "Fixture: the Extra Strength variant, distinct from the regular E27 formula.",
    },
    formulation: {
      verifiable: true,
      asOf: "2026-10-05",
      ingredients: [
        { name: "Hydrolyzed collagen peptides (bovine)", amountPerServing: "10 g", disclosed: true, role: "primary active", proprietaryBlend: false, relevantTo: ["skin", "joints", "hair", "nails"] },
        { name: "Hyaluronic acid", amountPerServing: "not disclosed", disclosed: false, role: "supporting", proprietaryBlend: false, relevantTo: ["skin"] },
        { name: "Vitamin C", amountPerServing: "90 mg", disclosed: true, role: "cofactor", proprietaryBlend: false, relevantTo: ["skin"] },
        { name: "Biotin", amountPerServing: "2500 mcg", disclosed: true, role: "supporting", proprietaryBlend: false, relevantTo: ["hair", "nails"] },
      ],
      proprietaryBlendPresent: false,
      notes: "Fixture formulation for testing.",
    },
    manufacturerClaims: [
      { claim: "Visibly improves skin elasticity and hydration", sourceUrl: MFR },
      { claim: "Liquid form absorbs faster than powders or capsules", sourceUrl: MFR },
      { claim: "Supports hair, nails and joints", sourceUrl: MFR },
    ],
    evidenceByBenefit: [
      {
        benefit: "skin",
        ingredientEvidence: { rating: "moderate", summary: "Systematic reviews of hydrolyzed collagen peptides report modest improvements in skin hydration and elasticity over 8 to 12 weeks, with many trials industry-funded.", typicalStudiedDose: "2.5 to 10 g/day", sourceUrls: [PUBMED_SR, NIH_ODS] },
        productEvidence: { rating: "none-found", summary: "No independent study of this exact product was found.", typicalStudiedDose: "", sourceUrls: [] },
      },
      {
        benefit: "joints",
        ingredientEvidence: { rating: "limited", summary: "Some trials suggest reduced activity-related joint discomfort with collagen peptides; effects are small and inconsistent.", typicalStudiedDose: "10 g/day", sourceUrls: [PUBMED_JOINT] },
        productEvidence: { rating: "none-found", summary: "No product-specific research found.", typicalStudiedDose: "", sourceUrls: [] },
      },
      {
        benefit: "hair",
        ingredientEvidence: { rating: "insufficient", summary: "Evidence for collagen peptides and hair growth is scarce; biotin helps only in deficiency.", typicalStudiedDose: "", sourceUrls: [NIH_ODS] },
        productEvidence: { rating: "none-found", summary: "None found.", typicalStudiedDose: "", sourceUrls: [] },
      },
      {
        benefit: "nails",
        ingredientEvidence: { rating: "limited", summary: "One small open-label study reported faster nail growth with 2.5 g/day collagen peptides; no control group.", typicalStudiedDose: "2.5 g/day", sourceUrls: [PUBMED_RCT, FAKE] },
        productEvidence: { rating: "none-found", summary: "None found.", typicalStudiedDose: "", sourceUrls: [] },
      },
    ],
    limitations: [
      { type: "industry-funding", detail: "Several key collagen trials were funded by ingredient manufacturers.", sourceUrls: [PUBMED_SR] },
      { type: "short-duration", detail: "Most trials run 8 to 12 weeks; longer-term effects are unknown.", sourceUrls: [PUBMED_SR] },
      { type: "small-sample", detail: "Typical trial sizes are under 100 participants.", sourceUrls: [PUBMED_SR] },
      { type: "no-product-specific-research", detail: "No independent research on this exact product.", sourceUrls: [] },
      { type: "missing-dosage", detail: "Hyaluronic acid amount is not disclosed on the label.", sourceUrls: [MFR] },
    ],
    deliveryFormat: {
      claim: "Liquid delivery absorbs faster and works better than powders or capsules.",
      whatEvidenceShows: "No independent trials compare liquid collagen against ordinary hydrolyzed collagen powder for outcomes; peptides are absorbed similarly once dissolved.",
      rating: "insufficient",
      sourceUrls: [EXAMINE],
    },
    pricing: { available: true, price: 69, currency: "USD", retailer: "SpoiledChild.com", sourceUrl: MFR, servingsPerContainer: 32, servingsPerDay: 1, monthlyCost: 64.69, annualCost: 787, note: "Fixture price; subscription discounts exist." },
    cautions: [
      { caution: "Bovine collagen; not suitable for vegans or those avoiding beef products.", population: "everyone", sourceUrls: [NIH_ODS] },
      { caution: "Biotin at this dose can interfere with some lab tests, including thyroid and troponin assays.", population: "anyone having blood tests", sourceUrls: [NIH_ODS] },
    ],
    sources: [
      { url: PUBMED_SR, title: "Effects of hydrolyzed collagen supplementation on skin: systematic review", kind: "independent" },
      { url: NIH_ODS, title: "NIH Office of Dietary Supplements fact sheet", kind: "independent" },
      { url: PUBMED_JOINT, title: "Collagen hydrolysate and activity-related joint pain", kind: "independent" },
      { url: EXAMINE, title: "Examine: collagen", kind: "independent" },
      { url: MFR, title: "SpoiledChild product page", kind: "manufacturer" },
      { url: RETAILER, title: "Retail listing", kind: "retailer" },
    ],
  };
}

function problendDossier(): ProductDossier {
  const d = collagenDossier();
  d.identity = { ...d.identity, brand: "FocusCo", name: "ProBlend Focus Complex", variant: "", form: "capsule", servingSize: "2 capsules", servingsPerContainer: "30", notes: "Fixture proprietary-blend product." };
  d.formulation = {
    verifiable: true,
    asOf: "2026-10-05",
    ingredients: [
      { name: "Focus Matrix (bacopa, rhodiola, L-theanine)", amountPerServing: "not disclosed (blend total 650 mg)", disclosed: false, role: "primary active", proprietaryBlend: true, relevantTo: ["energy"] },
      { name: "Caffeine", amountPerServing: "not disclosed", disclosed: false, role: "stimulant", proprietaryBlend: true, relevantTo: ["energy"] },
    ],
    proprietaryBlendPresent: true,
    notes: "Individual amounts hidden inside a proprietary blend.",
  };
  d.manufacturerClaims = [{ claim: "Clinically dosed focus and energy", sourceUrl: "https://www.focusco.com/problend" }];
  d.evidenceByBenefit = [{
    benefit: "energy",
    ingredientEvidence: { rating: "limited", summary: "L-theanine with caffeine shows modest attention effects at known doses; blend doses here are undisclosed.", typicalStudiedDose: "200 mg L-theanine", sourceUrls: [PUBMED_SR] },
    productEvidence: { rating: "none-found", summary: "None found.", typicalStudiedDose: "", sourceUrls: [] },
  }];
  d.limitations = [
    { type: "proprietary-blend", detail: "Doses are hidden in a proprietary blend, so studied doses cannot be compared.", sourceUrls: [] },
    { type: "missing-dosage", detail: "Caffeine amount is not disclosed.", sourceUrls: [] },
    { type: "no-product-specific-research", detail: "No research on this product.", sourceUrls: [] },
  ];
  d.deliveryFormat = { claim: "", whatEvidenceShows: "No delivery claim made.", rating: "none-found", sourceUrls: [] };
  d.pricing = { available: false, price: 0, currency: "USD", retailer: "", sourceUrl: "", servingsPerContainer: 30, servingsPerDay: 1, monthlyCost: 0, annualCost: 0, note: "Pricing not reliably available." };
  d.cautions = [{ caution: "Undisclosed caffeine; avoid stacking with other stimulants.", population: "everyone", sourceUrls: [NIH_ODS] }];
  d.sources = [{ url: PUBMED_SR, title: "L-theanine and caffeine review (fixture)", kind: "independent" }, { url: NIH_ODS, title: "NIH ODS", kind: "independent" }, { url: "https://www.focusco.com/problend", title: "FocusCo", kind: "manufacturer" }];
  return d;
}

function analysisFor(key: string, goals: string[], scaleTalk: boolean): PersonalAnalysis {
  const isBlend = key === "problend";
  const goalFit = goals.map((goal) => ({
    goal,
    verdict: goal === "skin" ? ("May fit your goal" as const) : goal === "joints" ? ("Worth comparing" as const) : goal === "hair" ? ("Not well supported for your stated goal" as const) : ("More information needed" as const),
    reasoning: goal === "skin" ? "Collagen peptides have moderate evidence for hydration and elasticity at 2.5 to 10 g/day; this product's 10 g is in range [1]." : goal === "joints" ? "Limited evidence for activity-related discomfort; a plain collagen powder at the same dose costs far less [3]." : goal === "hair" ? "Evidence is insufficient; biotin only helps if you're deficient [2]." : "Not enough evidence to say.",
  }));
  const scale = scaleTalk ? " Weigh yourself weekly to see if it's working." : "";
  return {
    headline: isBlend ? "A focus blend that hides its doses." : "Here's the part worth noticing: the ingredient has evidence. The liquid does not.",
    whatItIs: isBlend ? "A capsule 'focus' supplement built on a proprietary blend of herbs plus undisclosed caffeine." : "A daily one-ounce liquid shot of hydrolyzed bovine collagen peptides with vitamin C, biotin and an undisclosed amount of hyaluronic acid.",
    whatsInIt: isBlend ? "A 650 mg 'Focus Matrix' of bacopa, rhodiola and L-theanine, with the individual amounts hidden, plus an undisclosed caffeine dose." : "10 g of hydrolyzed collagen peptides is doing the work. Vitamin C is a sensible cofactor. Biotin is along for the ride, and the hyaluronic acid amount isn't disclosed.",
    whatTheyreSellingYou: isBlend ? "'Clinically dosed' is the claim, but you can't check a dose they won't tell you." : "Let's separate the ingredient from the marketing. The brand says the liquid absorbs faster and visibly firms skin. The first is a delivery claim with no independent comparison; the second borrows from ingredient research, not product research.",
    whatTheEvidenceSays: goals.map((goal) => ({
      goal,
      rating: goal === "skin" ? "moderate" : goal === "joints" ? "limited" : goal === "hair" ? "insufficient" : "limited",
      summary: goal === "skin" ? "Systematic reviews find modest gains in skin hydration and elasticity over 8 to 12 weeks [1]." : goal === "joints" ? "Small, inconsistent effects on activity-related joint discomfort [3]." : goal === "hair" ? "Very little research; biotin helps only in deficiency [2]." : "Limited.",
    })),
    theCatch: isBlend
      ? ["Now here's the catch: the doses are hidden in a proprietary blend, so none of the ingredient research can be matched to what's in the capsule.", "Caffeine amount undisclosed."]
      : ["Now here's the catch: much of the collagen research is industry-funded and short, with fewer than 100 participants per trial [1].", "No independent study has tested this exact product.", "The hyaluronic acid amount isn't on the label."],
    productVsIngredientEvidence: isBlend ? "There is no product-specific research. Ingredient research exists at known doses, which this product does not disclose." : "The evidence is for the ingredient, hydrolyzed collagen peptides in general, at 2.5 to 10 g/day. No independent study has tested this SpoiledChild product, and no trial shows liquid collagen outperforming an ordinary collagen powder [4]." + scale,
    moneyTest: isBlend
      ? { summary: "Pricing couldn't be reliably confirmed, so the money test stays open.", monthlyCost: 0, annualCost: 0, pricingAvailable: false, premiumAssessment: "More information needed" }
      : { summary: "About $65 a month, roughly $787 a year at the listed price. A plain hydrolyzed collagen powder at the same 10 g dose typically runs a fraction of that. The evidence does not show the liquid earning its premium.", monthlyCost: 64.69, annualCost: 787, pricingAvailable: true, premiumAssessment: "Evidence does not clearly justify the premium" },
    yourGoal: `You're hoping for help with ${goals.join(", ")}.`,
    goalFit,
    simplerOptions: isBlend
      ? [{ option: "A cup of green tea or coffee with a known caffeine amount", type: "food", why: "You get the same stimulant with a dose you can see." }, { option: "No product: protect sleep and regular meals first", type: "no-product", why: "Energy follows sleep more reliably than any blend." }]
      : [{ option: "Plain hydrolyzed collagen peptide powder, 10 g/day", type: "simpler-formulation", why: "Same ingredient at the studied dose, far lower cost." }, { option: "Protein-rich meals plus daily sun protection", type: "food", why: "Protein supports skin and hair structure; sunscreen has stronger skin-aging evidence than any supplement." }, { option: "No product", type: "no-product", why: "Reasonable if you'd rather spend on strength training or sleep." }],
    consideredNoProduct: true,
    cautions: isBlend ? ["Undisclosed caffeine; avoid stacking with other stimulants.", "Talk with your clinician if you take medication for blood pressure or anxiety."] : ["Bovine-sourced; not for vegans or anyone avoiding beef products.", "Biotin at this dose can interfere with some lab tests. Tell your clinician before blood work, and ask if you have kidney concerns."],
    grownTake: {
      evidenceFit: { verdict: isBlend ? "More information needed" : "May fit your goal", reasoning: isBlend ? "Doses unknown." : "Ingredient evidence is moderate for skin, limited elsewhere." },
      goalFit: { verdict: isBlend ? "More information needed" : "Worth comparing", reasoning: isBlend ? "Can't assess without doses." : "Fits skin best, joints somewhat, hair and nails weakly." },
      value: { verdict: isBlend ? "More information needed" : "Evidence does not clearly justify the premium", reasoning: isBlend ? "No reliable price." : "Same ingredient costs far less as powder." },
      formulaTransparency: { verdict: isBlend ? "Not well supported for your stated goal" : "Worth comparing", reasoning: isBlend ? "Proprietary blend hides every dose." : "Collagen dose disclosed; hyaluronic acid is not." },
      marketingEvidenceGap: { verdict: isBlend ? "Evidence does not clearly justify the premium" : "Evidence does not clearly justify the premium", reasoning: isBlend ? "'Clinically dosed' can't be checked." : "The liquid-absorbs-better claim has no independent support." },
    },
    oneThingLearned: isBlend ? "A proprietary blend means you're paying without knowing the dose." : "Evidence for an ingredient is not evidence for a product. Check the dose, then check the price.",
    citations: isBlend
      ? [{ n: 1, url: PUBMED_SR, title: "Review (fixture)" }]
      : [{ n: 1, url: PUBMED_SR, title: "Systematic review of collagen for skin" }, { n: 2, url: NIH_ODS, title: "NIH ODS fact sheet" }, { n: 3, url: PUBMED_JOINT, title: "Collagen and joint pain" }, { n: 4, url: EXAMINE, title: "Examine: collagen" }, { n: 9, url: FAKE, title: "Fabricated source" }],
  };
}

function resolveFor(query: string): ResolveResult {
  const q = query.toLowerCase();
  if (q.includes("fail-me")) throw new AiProviderError("Simulated provider outage", "unavailable", true);
  if (q.includes("refuse-me")) throw new AiProviderError("The model declined this request", "refusal", false);
  if (q.includes("spoiled") || q.includes("e27")) {
    return {
      confidence: "high",
      candidates: [
        { brand: "SpoiledChild", name: "E27 Liquid Collagen", variant: "Extra Strength", form: "liquid", category: "collagen supplement", note: "Higher-dose version of the E27 formula" },
        { brand: "SpoiledChild", name: "E27 Liquid Collagen", variant: "", form: "liquid", category: "collagen supplement", note: "Original strength" },
      ],
      clarification: "",
    };
  }
  if (q.includes("problend") || q.includes("proprietary")) {
    return { confidence: "high", candidates: [{ brand: "FocusCo", name: "ProBlend Focus Complex", variant: "", form: "capsule", category: "nootropic blend", note: "" }], clarification: "" };
  }
  if (q.includes("scale-talk")) {
    return { confidence: "high", candidates: [{ brand: "SpoiledChild", name: "E27 Liquid Collagen", variant: "Extra Strength", form: "liquid", category: "collagen supplement", note: "" }], clarification: "" };
  }
  if (q.trim() === "magnesium" || q.includes("magnesium")) {
    return {
      confidence: "low",
      candidates: [
        { brand: "Various", name: "Magnesium glycinate", variant: "", form: "capsule", category: "magnesium supplement", note: "Often chosen for sleep and relaxation" },
        { brand: "Various", name: "Magnesium citrate", variant: "", form: "powder", category: "magnesium supplement", note: "Often chosen for digestion" },
        { brand: "Various", name: "Magnesium L-threonate", variant: "", form: "capsule", category: "magnesium supplement", note: "Marketed for cognition" },
      ],
      clarification: "Magnesium comes in several forms and hundreds of brands. Which product did you have in mind?",
    };
  }
  return { confidence: "low", candidates: [], clarification: "We couldn't tell which product you mean. Try adding the brand name." };
}

export class FixtureProvider implements AiProvider {
  readonly name = "fixture";
  /** How many personalize calls have returned scale talk; lets tests exercise regeneration. */
  private scaleTalkCount = 0;

  async checkModel(): Promise<void> {
    /* fixture models are always available */
  }

  async complete(req: CompletionRequest): Promise<CompletionResult> {
    const key = (req.fixtureKey ?? "").toLowerCase();
    const base = { usage: { inputTokens: 1200, outputTokens: 800 }, stopReason: "end_turn", model: "fixture" };
    const searched = [PUBMED_SR, NIH_ODS, PUBMED_JOINT, PUBMED_RCT, EXAMINE, MFR, RETAILER].map((url) => ({ url, title: null }));

    switch (req.step) {
      case "resolve": {
        const json = resolveFor(key);
        return { ...base, text: JSON.stringify(json), json, searchedUrls: [] };
      }
      case "research": {
        if (key.includes("fail-research")) throw new AiProviderError("Simulated research outage", "unavailable", true);
        return { ...base, usage: { ...base.usage, webSearchRequests: 8 }, text: "Fixture research narrative with sources.", json: null, searchedUrls: searched };
      }
      case "extract": {
        const json = key.includes("problend") ? problendDossier() : collagenDossier();
        return { ...base, text: JSON.stringify(json), json, searchedUrls: [] };
      }
      case "pricing": {
        const json = collagenDossier().pricing;
        return { ...base, text: JSON.stringify(json), json, searchedUrls: [MFR].map((url) => ({ url, title: null })) };
      }
      case "personalize": {
        const goals = (req.user.match(/GOALS:\s*([a-z\-, ]+)/i)?.[1] ?? "skin").split(",").map((g) => g.trim()).filter(Boolean);
        let scaleTalk = false;
        if (key.includes("scale-talk-forever")) scaleTalk = true;
        else if (key.includes("scale-talk")) {
          scaleTalk = this.scaleTalkCount === 0; // first attempt violates, regeneration is clean
          this.scaleTalkCount += 1;
        }
        const json = analysisFor(key.includes("problend") ? "problend" : "collagen", goals, scaleTalk);
        return { ...base, text: JSON.stringify(json), json, searchedUrls: [] };
      }
    }
  }
}
