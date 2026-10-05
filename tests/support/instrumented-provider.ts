import type { AiProvider, CompletionRequest, CompletionResult } from "@/lib/ai/provider/types";

export interface RecordedCall {
  step: string;
  requestedModel: string;
  servedModel: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  webSearchRequests: number;
  latencyMs: number;
  webSearch: boolean;
  searchedUrls: string[];
  stopReason: string;
  error?: string;
}

/** Wraps a provider and records every call, for acceptance reporting. */
export class InstrumentedProvider implements AiProvider {
  readonly name: string;
  readonly calls: RecordedCall[] = [];
  constructor(private inner: AiProvider) {
    this.name = inner.name;
  }
  checkModel(model: string) {
    return this.inner.checkModel(model);
  }
  async complete(req: CompletionRequest): Promise<CompletionResult> {
    const started = Date.now();
    try {
      const res = await this.inner.complete(req);
      this.calls.push({
        step: req.step, requestedModel: req.model, servedModel: res.model, inputTokens: res.usage.inputTokens, outputTokens: res.usage.outputTokens,
        cacheReadTokens: res.usage.cacheReadTokens ?? 0, cacheWriteTokens: res.usage.cacheWriteTokens ?? 0, webSearchRequests: res.usage.webSearchRequests ?? 0,
        latencyMs: Date.now() - started, webSearch: !!req.webSearch, searchedUrls: res.searchedUrls.map((s) => s.url), stopReason: res.stopReason,
      });
      return res;
    } catch (err) {
      this.calls.push({ step: req.step, requestedModel: req.model, servedModel: "", inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, webSearchRequests: 0, latencyMs: Date.now() - started, webSearch: !!req.webSearch, searchedUrls: [], stopReason: "error", error: err instanceof Error ? err.message : String(err) });
      throw err;
    }
  }
}

/**
 * USD per million tokens, Anthropic first-party rates verified 2026-10-05 against the pricing page
 * (Opus 5.5: $4 in / $20 out; cache read $0.20; cache write 1.25x input). Web search: $10 per 1,000 searches.
 */
export const PRICE_PER_MTOK: Record<string, { input: number; output: number; cacheRead: number; cacheWrite: number }> = {
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
  "claude-opus-5": { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  "claude-sonnet-5": { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  "claude-fable-5-1": { input: 10, output: 50, cacheRead: 0.25, cacheWrite: 12.5 },
  "claude-haiku-4-5": { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 },
};
export const WEB_SEARCH_USD_PER_REQUEST = 0.01;

export interface CostEstimate {
  tokensUsd: number;
  searchUsd: number;
  totalUsd: number;
  priced: boolean;
  webSearches: number;
  searchCalls: number;
}

export function estimateCostUsd(calls: RecordedCall[]): CostEstimate {
  let usd = 0;
  let priced = true;
  let webSearches = 0;
  for (const c of calls) {
    webSearches += c.webSearchRequests;
    const key = Object.keys(PRICE_PER_MTOK).find((k) => c.servedModel.startsWith(k));
    if (!key) { priced = false; continue; }
    const p = PRICE_PER_MTOK[key];
    usd += (c.inputTokens / 1e6) * p.input + (c.outputTokens / 1e6) * p.output + (c.cacheReadTokens / 1e6) * p.cacheRead + (c.cacheWriteTokens / 1e6) * p.cacheWrite;
  }
  const searchUsd = webSearches * WEB_SEARCH_USD_PER_REQUEST;
  return { tokensUsd: usd, searchUsd, totalUsd: usd + searchUsd, priced, webSearches, searchCalls: calls.filter((c) => c.webSearch).length };
}
