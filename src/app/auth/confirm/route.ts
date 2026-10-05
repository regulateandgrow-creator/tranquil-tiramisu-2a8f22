import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Magic-link landing. The Supabase email template must link to:
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
 * Verifying the token hash here keeps the session in HTTP-only cookies.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(searchParams.get("next"));

  const failure = NextResponse.redirect(new URL("/sign-in?error=link", request.url));

  if (!tokenHash || !type) return failure;

  const supabase = await createClient();
  if (!supabase) return NextResponse.redirect(new URL("/", request.url));

  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) return failure;

  return NextResponse.redirect(new URL(next, request.url));
}

/** Only allow same-site relative paths as a post-login destination. */
function safeNext(value: string | null): string {
  if (!value) return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}
