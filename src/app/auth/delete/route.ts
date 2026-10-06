import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { opsLine } from "@/lib/ai/logging";

/**
 * POST /auth/delete — deletes the signed-in account and everything tied to it.
 * The database cascades profile, check-ins, meetings, analyses, usage events
 * and raw logs. Shared product facts contain nothing about her and stay.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.redirect(new URL("/", request.url), { status: 303 });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/sign-in", request.url), { status: 303 });

  const form = await request.formData().catch(() => null);
  if (form?.get("confirm") !== "delete") return NextResponse.redirect(new URL("/settings?delete=confirm", request.url), { status: 303 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.redirect(new URL("/settings?delete=unavailable", request.url), { status: 303 });

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    opsLine("account.delete_failed", { code: error.status ?? null });
    return NextResponse.redirect(new URL("/settings?delete=failed", request.url), { status: 303 });
  }
  opsLine("account.deleted", { userId: user.id });
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/sign-in?deleted=1", request.url), { status: 303 });
}
