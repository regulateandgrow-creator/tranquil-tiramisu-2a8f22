/**
 * GROWN. Intelligence — contracts for the future AI layer.
 *
 * All AI calls run server-side (Route Handlers / Server Actions) using the
 * Anthropic Claude API. The client only ever sends a request shape and
 * receives a response shape; API keys never reach the browser.
 */

export type ProductInputKind = "image" | "text" | "url";

export interface ProductAnalysisRequest {
  kind: ProductInputKind;
  /** base64 image, free text, or URL depending on `kind` */
  payload: string;
  /** Optional user context (life mode, goals) to personalize the literacy lens */
  context?: {
    lifeMode?: "normal" | "maintenance" | "rebuild";
  };
}

export interface Citation {
  title: string;
  url: string;
}

export interface ProductAnalysisResponse {
  productName: string;
  /** What it actually is, in plain language */
  whatItIs: string;
  /** What the evidence does / does not support — always with citations */
  whatTheEvidenceSays: string;
  /** Marketing claims worth a second look */
  claimsToQuestion: string[];
  /** Is it worth your money? Framed as literacy, not a verdict */
  worthYourMoney: string;
  /** Safety: never diagnostic; always points to a clinician where relevant */
  talkToYourClinicianIf: string[];
  citations: Citation[];
}
