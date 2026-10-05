import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnalysis } from "@/lib/db/intelligence";

/** GET /api/intelligence/analyses/:id — status for polling (RLS scopes it to her). */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "accounts_not_connected" }, { status: 503 });
  const analysis = await getAnalysis(supabase, id);
  if (!analysis) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({
    id: analysis.id,
    status: analysis.status,
    stageMessage: analysis.stage_message,
    errorCode: analysis.error_code,
    decision: analysis.decision,
    hasResult: analysis.result !== null,
  });
}
