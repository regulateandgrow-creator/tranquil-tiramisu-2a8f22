import { NextResponse, type NextRequest } from "next/server";
import { aiDefaults } from "@/lib/ai/config";
import { limitedResponse, requireIntelligenceSession } from "@/lib/ai/http";
import { checkUsage } from "@/lib/ai/pipeline/usage";
import { startAnalysis, StartAnalysisError } from "@/lib/ai/pipeline/start";

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

  try {
    const started = await startAnalysis(supabase, admin, userId, query, "typed");
    return NextResponse.json({ ...started, usage: { limit: usage.limit, remaining: usage.remaining } });
  } catch (err) {
    if (err instanceof StartAnalysisError) return NextResponse.json({ id: err.id, status: "failed", error: err.code }, { status: 502 });
    throw err;
  }
}
