import type { AiProvider, CompletionRequest, CompletionResult } from "@/lib/ai/provider/types";

export interface RecordedCall {
  step: string;
  requestedModel: string;
  servedModel: string;
  inputTokens: number;
  outputTokens: number;
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
        latencyMs: Date.now() - started, webSearch: !!req.webSearch, searchedUrls: res.searchedUrls.map((s) => s.url), stopReason: res.stopReason,
      });
      return res;
    } catch (err) {
      this.calls.push({ step: req.step, requestedModel: req.model, servedModel: "", inputTokens: 0, outputTokens: 0, latencyMs: Date.now() - started, webSearch: !!req.webSearch, searchedUrls: [], stopReason: "error", error: err instanceof Error ? err.message : String(err) });
      throw err;
    }
  }
}

/** USD per million tokens, Anthropic first-party rates (cached 2026-09-25). Model tokens only; web search is billed per request separately. */
export const PRICE_PER_MTOK: Record<string, { input: number; output: number }> = {
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-opus-5": { input: 5, output: 25 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-sonnet-5": { input: 2, output: 10 },
  "claude-fable-5-1": { input: 10, output: 50 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

export function estimateCostUsd(calls: RecordedCall[]): { tokensUsd: number; priced: boolean; webSearches: number } {
  let usd = 0;
  let priced = true;
  for (const c of calls) {
    const key = Object.keys(PRICE_PER_MTOK).find((k) => c.servedModel.startsWith(k));
    if (!key) { priced = false; continue; }
    usd += (c.inputTokens / 1e6) * PRICE_PER_MTOK[key].input + (c.outputTokens / 1e6) * PRICE_PER_MTOK[key].output;
  }
  return { tokensUsd: usd, priced, webSearches: calls.filter((c) => c.webSearch).length };
}
