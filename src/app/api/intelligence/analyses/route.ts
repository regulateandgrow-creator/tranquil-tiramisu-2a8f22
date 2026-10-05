import { NextResponse, type NextRequest } from "next/server";
import { aiDefaults } from "@/lib/ai/config";
import { limitedResponse, requireIntelligenceSession } from "@/lib/ai/http";
import { getAiProvider } from "@/lib/ai/provider";
import { AiProviderError } from "@/lib/ai/provider/types";
import { resolveProduct } from "@/lib/ai/pipeline/resolve";
import { checkUsage } from "@/lib/ai/pipeline/usage";
import { logRaw, opsLine } from "@/lib/ai/logging";
import { getTtls } from "@/lib/ai/settings";
import { createAnalysis, updateAnalysis } from "@/lib/db/intelligence";

export const maxDuration = 120;

/**
 * POST /api/intelligence/analyses  { query }
 * Creates an analysis and runs the Resolve step. Always returns candidates for
 * her to confirm; nothing expensive runs until she does.
 */
export async function POST(request: NextRequest) {
  const session = await requireIntelligenceSession();
  if ("error" in session) return session.error;
  const { supabase, admin, userId } = session;

  const body = (await request.json().catch(() => ({}))) as { query?: unknown };
  const query = typeof body.query === "string" ? body.query.replace(/\s+/g, " ").trim() : "";
  if (query.length < 2 || query.length > aiDefaults.maxQueryLength) {
    return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  }

  const usage = await checkUsage(admin, userId);
  if (!usage.allowed) return limitedResponse(usage.limit, usage.resetsAt);

  const analysis = await createAnalysis(supabase, userId, query);
  const provider = getAiProvider()!;

  try {
    const resolved = await resolveProduct(provider, query);
    const { rawLogRetentionDays } = await getTtls(admin);
    await logRaw(admin, analysis.id, "resolve", resolved.raw.prompt, resolved.raw.output, rawLogRetentionDays);
    await updateAnalysis(supabase, analysis.id, {
      status: "needs_confirmation",
      stage_message: null,
      candidates: resolved.result.candidates,
      model: resolved.model,
    });
    opsLine("analysis.resolved", { analysisId: analysis.id, confidence: resolved.result.confidence, candidates: resolved.result.candidates.length });
    return NextResponse.json({
      id: analysis.id,
      status: "needs_confirmation",
      confidence: resolved.result.confidence,
      candidates: resolved.result.candidates,
      clarification: resolved.result.clarification,
      usage: { limit: usage.limit, remaining: usage.remaining },
    });
  } catch (err) {
    const code = err instanceof AiProviderError ? (err.code === "refusal" ? "provider_refused" : "provider_unavailable") : "unknown";
    await updateAnalysis(supabase, analysis.id, { status: "failed", error_code: code, stage_message: null });
    opsLine("analysis.resolve_failed", { analysisId: analysis.id, code });
    return NextResponse.json({ id: analysis.id, status: "failed", error: code }, { status: 502 });
  }
}
