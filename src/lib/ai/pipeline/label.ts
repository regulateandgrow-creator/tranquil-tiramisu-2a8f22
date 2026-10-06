import type { AiProvider, ImageMediaType } from "../provider/types";
import { aiModels } from "../config";
import { labelSchema, type LabelResult } from "../schemas";
import { labelSystem, labelUser } from "../prompts/label";

export interface LabelOutcome {
  result: LabelResult;
  /** The typed-style query the rest of the pipeline understands. Empty when unreadable. */
  query: string;
  usage: { inputTokens: number; outputTokens: number };
  model: string;
  /** Prompt and output text only. The image is never logged. */
  raw: { prompt: string; output: string };
}

const CONF = new Set(["high", "medium", "low"]);

export function cleanLabel(raw: Partial<LabelResult>): LabelResult {
  const s = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "");
  const result: LabelResult = {
    readable: raw.readable === true,
    brand: s(raw.brand),
    name: s(raw.name),
    variant: s(raw.variant),
    form: s(raw.form),
    category: s(raw.category),
    confidence: CONF.has(raw.confidence as string) ? (raw.confidence as LabelResult["confidence"]) : "low",
    note: s(raw.note),
  };
  if (!result.name) result.readable = false;
  return result;
}

/** Pack sizes, counts and volumes are not identity; keep them out of the lookup query. */
const SIZE_RE = /\b\d+(?:\.\d+)?\s?(?:fl\.?\s?oz|oz|ml|l|g|kg|mg|lb|lbs|ct|count|capsules|tablets|softgels|gummies|servings|pack)\b\.?/gi;

export function stripSizes(s: string): string {
  return s.replace(SIZE_RE, "").replace(/\s*[,·|/]\s*(?=[,·|/]|$)/g, "").replace(/^[\s,·|/]+|[\s,·|/]+$/g, "").replace(/\s+/g, " ").trim();
}

export function labelQuery(r: LabelResult): string {
  if (!r.readable) return "";
  return [r.brand, r.name, stripSizes(r.variant)].filter(Boolean).join(" ").slice(0, 200);
}

export async function readLabel(
  provider: AiProvider,
  image: { base64: string; mediaType: ImageMediaType },
  hint = "",
): Promise<LabelOutcome> {
  const res = await provider.complete({
    step: "label",
    model: aiModels.label,
    system: labelSystem,
    user: labelUser,
    image,
    jsonSchema: labelSchema,
    maxTokens: 1000,
    effort: "low",
    fixtureKey: hint,
  });
  const result = cleanLabel((res.json ?? {}) as Partial<LabelResult>);
  return {
    result,
    query: labelQuery(result),
    usage: res.usage,
    model: res.model,
    raw: { prompt: `${labelSystem}\n\n${labelUser}\n[image omitted]`, output: res.text },
  };
}
