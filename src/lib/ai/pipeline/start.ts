import type { SupabaseClient } from "@supabase/supabase-js";
import { getAiProvider } from "../provider";
import { AiProviderError } from "../provider/types";
import { resolveProduct } from "./resolve";
import { logRaw, opsLine } from "../logging";
import { getTtls } from "../settings";
import { createAnalysis, updateAnalysis } from "@/lib/db/intelligence";

export type AnalysisSource = "typed" | "scan" | "link";

export interface StartedAnalysis {
  id: string;
  status: "needs_confirmation";
  confidence: string;
  candidates: unknown[];
  clarification: string;
}

export class StartAnalysisError extends Error {
  constructor(public readonly id: string, public readonly code: string) {
    super(code);
  }
}

/**
 * Creates an analysis for a query (typed, read from a label, or taken from a link)
 * and runs the Resolve step. Nothing expensive runs until she confirms a candidate.
 * `extraRawLogs` lets the caller attach the step that produced the query (e.g. the
 * label read) to the same analysis, prompt and output text only.
 */
export async function startAnalysis(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  userId: string,
  query: string,
  source: AnalysisSource,
  extraRawLogs: Array<{ step: string; prompt: string; output: string }> = [],
): Promise<StartedAnalysis> {
  const analysis = await createAnalysis(supabase, userId, query);
  const provider = getAiProvider()!;
  const { rawLogRetentionDays } = await getTtls(admin);
  for (const log of extraRawLogs) await logRaw(admin, analysis.id, log.step, log.prompt, log.output, rawLogRetentionDays);

  try {
    const resolved = await resolveProduct(provider, query);
    await logRaw(admin, analysis.id, "resolve", resolved.raw.prompt, resolved.raw.output, rawLogRetentionDays);
    await updateAnalysis(supabase, analysis.id, {
      status: "needs_confirmation",
      stage_message: null,
      candidates: resolved.result.candidates,
      model: resolved.model,
    });
    opsLine("analysis.resolved", { analysisId: analysis.id, source, confidence: resolved.result.confidence, candidates: resolved.result.candidates.length });
    return {
      id: analysis.id,
      status: "needs_confirmation",
      confidence: resolved.result.confidence,
      candidates: resolved.result.candidates,
      clarification: resolved.result.clarification,
    };
  } catch (err) {
    const code = err instanceof AiProviderError ? (err.code === "refusal" ? "provider_refused" : "provider_unavailable") : "unknown";
    await updateAnalysis(supabase, analysis.id, { status: "failed", error_code: code, stage_message: null });
    opsLine("analysis.resolve_failed", { analysisId: analysis.id, source, code });
    throw new StartAnalysisError(analysis.id, code);
  }
}
