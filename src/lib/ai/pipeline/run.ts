import type { SupabaseClient } from "@supabase/supabase-js";
import { getAiProvider } from "../provider";
import { AiProviderError, type AiProvider } from "../provider/types";
import { getTtls } from "../settings";
import { logOps, logRaw, opsLine } from "../logging";
import { researchProduct } from "./research";
import { personalizeAnalysis, PersonalizeRejected } from "./personalize";
import { buildPersonalContext } from "@/lib/preferences/weight-policy";
import { getProfileLimits, recentSignalAverages, updateAnalysis, type AnalysisRow } from "@/lib/db/intelligence";
import type { ProductCandidate } from "../schemas";

export type AnalysisErrorCode =
  | "no_provider" | "provider_unavailable" | "provider_refused" | "research_failed" | "validation_failed" | "unknown";

/**
 * Runs Research → Personalize for a confirmed analysis. Writes progress to the
 * analysis row so the page can poll, and never throws: failures land on the
 * row as an honest `failed` status with an error code.
 */
export async function runAnalysis(
  admin: SupabaseClient,
  analysis: AnalysisRow,
  candidate: ProductCandidate,
  providerOverride?: AiProvider,
): Promise<void> {
  const started = Date.now();
  const provider = providerOverride ?? getAiProvider();
  const fixtureKey = `${analysis.query_text} ${candidate.brand} ${candidate.name}`;
  const ttls = await getTtls(admin);
  const fail = async (code: AnalysisErrorCode, extra: Record<string, unknown> = {}) => {
    await updateAnalysis(admin, analysis.id, { status: "failed", error_code: code, stage_message: null });
    await logOps(admin, analysis.id, { error_code: code, latency_ms: Date.now() - started, validator: extra });
    opsLine("analysis.failed", { analysisId: analysis.id, code, latencyMs: Date.now() - started });
  };

  if (!provider) return fail("no_provider");

  try {
    await updateAnalysis(admin, analysis.id, { status: "researching", stage_message: "Reading the research" });
    const research = await researchProduct(provider, admin, candidate, ttls, fixtureKey);
    for (const r of research.raw) await logRaw(admin, analysis.id, r.step, r.prompt, r.output, ttls.rawLogRetentionDays);

    await updateAnalysis(admin, analysis.id, {
      status: "personalizing",
      stage_message: "Fitting it to your goals",
      product_id: research.productId,
      research_id: research.research.id,
      research_cached: research.cached,
    });

    const profile = await getProfileLimits(admin, analysis.user_id);
    const signals = await recentSignalAverages(admin, analysis.user_id);
    const ctx = buildPersonalContext({
      firstName: profile.firstName,
      hideWeight: profile.hideWeight,
      lifeMode: profile.lifeMode,
      goals: analysis.goals,
      goalOther: analysis.goal_other,
      recentSignals: signals,
    });

    const personal = await personalizeAnalysis(provider, research.dossier, ctx, fixtureKey);
    for (const r of personal.raw) await logRaw(admin, analysis.id, r.step, r.prompt, r.output, ttls.rawLogRetentionDays);

    await updateAnalysis(admin, analysis.id, { status: "complete", stage_message: null, result: personal.analysis });
    await logOps(admin, analysis.id, {
      model: personal.model,
      input_tokens: research.usage.inputTokens + personal.usage.inputTokens,
      output_tokens: research.usage.outputTokens + personal.usage.outputTokens,
      latency_ms: Date.now() - started,
      research_cached: research.cached,
      validator: {
        citations: research.report,
        pricingRefreshed: research.pricingRefreshed,
        personalizeAttempts: personal.attempts,
        regenerationIssueIds: personal.regenerationIssueIds,
        droppedAnalysisCitations: personal.droppedCitations.length,
        hideWeight: ctx.hideWeight,
      },
    });
    opsLine("analysis.complete", {
      analysisId: analysis.id,
      cached: research.cached,
      attempts: personal.attempts,
      regenerationIssueIds: personal.regenerationIssueIds.join(",") || null,
      pricingFetch: research.report?.pricingFetch ?? null,
      latencyMs: Date.now() - started,
      model: personal.model,
    });
  } catch (err) {
    if (err instanceof PersonalizeRejected) return fail("validation_failed", { issues: err.issues.map((i) => i.id) });
    if (err instanceof AiProviderError) {
      if (err.code === "refusal") return fail("provider_refused");
      return fail(err.code === "unavailable" || err.code === "rate_limited" ? "provider_unavailable" : "research_failed", { providerCode: err.code });
    }
    return fail("unknown");
  }
}
