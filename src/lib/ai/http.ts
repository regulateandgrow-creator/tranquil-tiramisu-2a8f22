import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAiProvider } from "./provider";

/** Shared guards for the Intelligence routes. */
export async function requireIntelligenceSession() {
  const supabase = await createClient();
  if (!supabase) return { error: NextResponse.json({ error: "accounts_not_connected" }, { status: 503 }) } as const;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "unauthenticated" }, { status: 401 }) } as const;
  const admin = createAdminClient();
  if (!admin) return { error: NextResponse.json({ error: "server_not_configured" }, { status: 503 }) } as const;
  if (!getAiProvider()) return { error: NextResponse.json({ error: "ai_not_configured" }, { status: 503 }) } as const;
  return { supabase, admin, userId: user.id } as const;
}

export function limitedResponse(limit: number, resetsAt: Date | null) {
  return NextResponse.json({ error: "limit_reached", limit, resetsAt: resetsAt?.toISOString() ?? null }, { status: 429 });
}
