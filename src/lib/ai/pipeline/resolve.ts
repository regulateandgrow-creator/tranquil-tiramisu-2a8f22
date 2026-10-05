import type { AiProvider } from "../provider/types";
import { aiModels } from "../config";
import { resolveSchema, type ResolveResult, type ProductCandidate } from "../schemas";
import { resolveSystem, resolveUser } from "../prompts/resolve";

export interface ResolveOutcome {
  result: ResolveResult;
  usage: { inputTokens: number; outputTokens: number };
  model: string;
  raw: { prompt: string; output: string };
}

function cleanCandidate(c: Partial<ProductCandidate>): ProductCandidate {
  const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  return { brand: s(c.brand), name: s(c.name), variant: s(c.variant), form: s(c.form), category: s(c.category), note: s(c.note) };
}

export async function resolveProduct(provider: AiProvider, query: string): Promise<ResolveOutcome> {
  const user = resolveUser(query);
  const res = await provider.complete({
    step: "resolve",
    model: aiModels.resolve,
    system: resolveSystem,
    user,
    jsonSchema: resolveSchema,
    maxTokens: 2000,
    effort: "low",
    fixtureKey: query,
  });
  const raw = (res.json ?? {}) as Partial<ResolveResult>;
  const candidates = Array.isArray(raw.candidates) ? raw.candidates.map(cleanCandidate).filter((c) => c.name) : [];
  const confidence = raw.confidence === "high" || raw.confidence === "medium" || raw.confidence === "low" ? raw.confidence : "low";
  return {
    result: { confidence, candidates: candidates.slice(0, 5), clarification: typeof raw.clarification === "string" ? raw.clarification : "" },
    usage: res.usage,
    model: res.model,
    raw: { prompt: `${resolveSystem}\n\n${user}`, output: res.text },
  };
}
