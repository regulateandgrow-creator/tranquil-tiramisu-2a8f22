import { NextResponse, type NextRequest } from "next/server";
import { after } from "next/server";
import { aiDefaults } from "@/lib/ai/config";
import { goalKeys } from "@/lib/ai/goals";
import { limitedResponse, requireIntelligenceSession } from "@/lib/ai/http";
import { checkUsage } from "@/lib/ai/pipeline/usage";
import { runAnalysis } from "@/lib/ai/pipeline/run";
import { opsLine } from "@/lib/ai/logging";
import type { ProductCandidate } from "@/lib/ai/schemas";
import { getAnalysis, recordUsage, updateAnalysis } from "@/lib/db/intelligence";

export const maxDuration = 300;

/**
 * POST /api/intelligence/analyses/:id/confirm  { candidateIndex, goals, goalOther }
 * Records the confirmed product and her goals, counts the analysis against her
 * limit, then runs Research → Personalize after responding. The page polls.
 */
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await requireIntelligenceSession();
  if ("error" in session) return session.error;
  const { supabase, admin, userId } = session;

  const analysis = await getAnalysis(supabase, id);
  if (!analysis) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (analysis.status !== "needs_confirmation") return NextResponse.json({ error: "wrong_state", status: analysis.status }, { status: 409 });

  const body = (await request.json().catch(() => ({}))) as { candidateIndex?: unknown; goals?: unknown; goalOther?: unknown };
  const candidates = analysis.candidates ?? [];
  const index = typeof body.candidateIndex === "number" ? body.candidateIndex : -1;
  const candidate: ProductCandidate | undefined = candidates[index];
  if (!candidate) return NextResponse.json({ error: "invalid_candidate" }, { status: 400 });

  const goals = Array.isArray(body.goals) ? body.goals.filter((g): g is string => typeof g === "string" && goalKeys.has(g)) : [];
  if (goals.length === 0) return NextResponse.json({ error: "goals_required" }, { status: 400 });
  const goalOtherRaw = typeof body.goalOther === "string" ? body.goalOther.replace(/\s+/g, " ").trim() : "";
  if (goalOtherRaw.length > aiDefaults.maxGoalOtherLength) return NextResponse.json({ error: "goal_other_too_long" }, { status: 400 });
  const goalOther = goalOtherRaw || null;

  const usage = await checkUsage(admin, userId);
  if (!usage.allowed) {
    await updateAnalysis(supabase, id, { status: "limited", stage_message: null });
    return limitedResponse(usage.limit, usage.resetsAt);
  }

  await updateAnalysis(supabase, id, { status: "researching", stage_message: "Reading the research", goals, goal_other: goalOther, candidates: [candidate] });
  await recordUsage(admin, userId, id);
  opsLine("analysis.confirmed", { analysisId: id, goals: goals.length, remainingBefore: usage.remaining });

  const confirmed = { ...analysis, goals, goal_other: goalOther, status: "researching" as const };
  after(async () => {
    await runAnalysis(admin, confirmed, candidate);
  });

  return NextResponse.json({ id, status: "researching", usage: { limit: usage.limit, remaining: usage.remaining - 1 } }, { status: 202 });
}
