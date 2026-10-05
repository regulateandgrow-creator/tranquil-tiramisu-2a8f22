import Anthropic from "@anthropic-ai/sdk";
import type { AiProvider, CompletionRequest, CompletionResult, SearchedUrl } from "./types";
import { AiProviderError } from "./types";

/**
 * Anthropic Claude adapter (server-side only).
 *
 * - Web search: server tool `web_search_20260209`; `pause_turn` is resumed.
 * - Structured output: `output_config.format` with a strict JSON schema.
 * - Thinking is adaptive by default on current models; depth via `effort`.
 * - Server-side refusal fallback is enabled (`fallbacks: "default"`) so a
 *   safety decline degrades gracefully instead of surfacing as an error.
 * - Model availability is checked against the Models endpoint, never assumed.
 */

const FALLBACK_BETA = "server-side-fallback-2026-07-01";
const MAX_PAUSE_RESUMES = 4;

export class AnthropicProvider implements AiProvider {
  readonly name = "anthropic";
  private client: Anthropic;
  private checked = new Set<string>();

  constructor(apiKey?: string) {
    // When the hosting environment injects the real key on outbound requests
    // (managed credential), no key exists in the process. The SDK still needs
    // a non-empty value to construct, so a placeholder is used in that case.
    const key = apiKey ?? process.env.ANTHROPIC_API_KEY ?? "managed-by-environment";
    this.client = new Anthropic({ apiKey: key, timeout: 10 * 60 * 1000, maxRetries: 2 });
  }

  async checkModel(model: string): Promise<void> {
    if (this.checked.has(model)) return;
    try {
      await this.client.models.retrieve(model);
      this.checked.add(model);
    } catch (err) {
      if (err instanceof Anthropic.NotFoundError) {
        throw new AiProviderError(`Model "${model}" is not available on this account`, "unavailable", false);
      }
      throw toProviderError(err);
    }
  }

  async complete(req: CompletionRequest): Promise<CompletionResult> {
    await this.checkModel(req.model);

    const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: req.user }];
    const tools: Anthropic.Beta.BetaToolUnion[] = req.webSearch
      ? [{ type: "web_search_20260209", name: "web_search", max_uses: req.webSearch.maxUses }]
      : [];

    const searched = new Map<string, SearchedUrl>();
    let text = "";
    let inputTokens = 0;
    let outputTokens = 0;
    let stopReason = "";
    let model = req.model;

    for (let round = 0; round <= MAX_PAUSE_RESUMES; round++) {
      let response: Anthropic.Beta.BetaMessage;
      try {
        response = await this.client.beta.messages.create({
          model: req.model,
          max_tokens: req.maxTokens,
          system: req.system,
          messages,
          ...(tools.length ? { tools } : {}),
          output_config: {
            effort: req.effort ?? "medium",
            ...(req.jsonSchema ? { format: { type: "json_schema", schema: req.jsonSchema } } : {}),
          },
          betas: [FALLBACK_BETA],
          fallbacks: "default",
        });
      } catch (err) {
        throw toProviderError(err);
      }

      inputTokens += response.usage.input_tokens;
      outputTokens += response.usage.output_tokens;
      stopReason = response.stop_reason ?? "";
      model = response.model;

      for (const block of response.content) {
        if (block.type === "text") {
          text += block.text;
          for (const c of block.citations ?? []) {
            if (c.type === "web_search_result_location") searched.set(c.url, { url: c.url, title: c.title ?? null });
          }
        } else if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
          for (const r of block.content) {
            if (r.type === "web_search_result") searched.set(r.url, { url: r.url, title: r.title ?? null });
          }
        }
      }

      if (stopReason === "refusal") {
        throw new AiProviderError("The model declined this request", "refusal", false);
      }
      if (stopReason === "pause_turn") {
        // Server tool loop hit its iteration cap; resume by replaying the assistant turn.
        messages.push({ role: "assistant", content: response.content });
        continue;
      }
      break;
    }

    if (stopReason === "pause_turn") {
      throw new AiProviderError("Research did not finish in time", "unknown", true);
    }
    if (stopReason === "max_tokens") {
      throw new AiProviderError("The model ran out of room for its answer", "bad_output", true);
    }

    let json: unknown | null = null;
    if (req.jsonSchema) {
      try {
        json = JSON.parse(text);
      } catch {
        throw new AiProviderError("Structured output was not valid JSON", "bad_output", true);
      }
    }

    return { text, json, searchedUrls: [...searched.values()], usage: { inputTokens, outputTokens }, stopReason, model };
  }
}

function toProviderError(err: unknown): AiProviderError {
  if (err instanceof AiProviderError) return err;
  if (err instanceof Anthropic.RateLimitError) return new AiProviderError("Rate limited", "rate_limited", true);
  if (err instanceof Anthropic.AuthenticationError) return new AiProviderError("AI credentials are invalid", "unavailable", false);
  if (err instanceof Anthropic.APIConnectionError) return new AiProviderError("Could not reach the AI service", "unavailable", true);
  if (err instanceof Anthropic.APIError) {
    return new AiProviderError(`AI service error ${err.status ?? ""}`.trim(), err.status && err.status >= 500 ? "unavailable" : "unknown", !!err.status && err.status >= 500);
  }
  return new AiProviderError(err instanceof Error ? err.message : "Unknown AI error", "unknown", false);
}
