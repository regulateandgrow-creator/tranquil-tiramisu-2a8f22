/**
 * Provider adapter. The pipeline only talks to this interface, so the model
 * vendor can change without touching product code.
 */

export type AiStep = "resolve" | "research" | "extract" | "personalize" | "pricing";

export interface CompletionRequest {
  step: AiStep;
  model: string;
  system: string;
  user: string;
  /** Enables server-side web search for this call. */
  webSearch?: { maxUses: number };
  /** Forces a strict JSON output matching this schema. */
  jsonSchema?: Record<string, unknown>;
  maxTokens: number;
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
  /** Opaque hint the fixture provider uses to pick a script; ignored by real providers. */
  fixtureKey?: string;
}

export interface SearchedUrl {
  url: string;
  title: string | null;
}

export interface CompletionResult {
  text: string;
  json: unknown | null;
  /** Every URL the web search tool actually returned or cited during this call. */
  searchedUrls: SearchedUrl[];
  usage: { inputTokens: number; outputTokens: number };
  stopReason: string;
  model: string;
}

export interface AiProvider {
  readonly name: string;
  complete(req: CompletionRequest): Promise<CompletionResult>;
  /** Throws if the configured model is not available. */
  checkModel(model: string): Promise<void>;
}

export class AiProviderError extends Error {
  constructor(
    message: string,
    public readonly code: "refusal" | "rate_limited" | "unavailable" | "bad_output" | "unknown",
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = "AiProviderError";
  }
}
