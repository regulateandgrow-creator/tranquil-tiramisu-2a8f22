import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnalysis, updateAnalysis, type Decision } from "@/lib/db/intelligence";

const DECISIONS = new Set<Decision>(["try_track", "save", "not_for_me"]);

/** POST /api/intelligence/analyses/:id/decision  { decision } — TRY IT & TRACK IT / SAVE IT / NOT FOR ME */
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "accounts_not_connected" }, { status: 503 });
  const body = (await request.json().catch(() => ({}))) as { decision?: unknown };
  const decision = body.decision as Decision;
  if (!DECISIONS.has(decision)) return NextResponse.json({ error: "invalid_decision" }, { status: 400 });

  const analysis = await getAnalysis(supabase, id);
  if (!analysis) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (analysis.status !== "complete") return NextResponse.json({ error: "not_complete" }, { status: 409 });

  await updateAnalysis(supabase, id, { decision, decided_at: new Date().toISOString() });
  return NextResponse.json({ id, decision });
}
