import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Magic-link landing. Two link shapes are accepted:
 *
 * 1. Supabase's default Magic Link email ({{ .ConfirmationURL }}). Supabase verifies the
 *    token itself and redirects here with `?code=…`, which we exchange for a session.
 *    Works with the built-in email sender; no template editing required.
 * 2. A custom template linking straight here with `?token_hash=…&type=email`.
 *    Verifies the token hash directly, so the link also works when opened in a
 *    different browser than the one that requested it.
 *
 * Either way the session lands in HTTP-only cookies.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(searchParams.get("next"));

  const failure = NextResponse.redirect(new URL("/sign-in?error=link", request.url));

  if (!code && !(tokenHash && type)) return failure;

  const supabase = await createClient();
  if (!supabase) return NextResponse.redirect(new URL("/", request.url));

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.verifyOtp({ token_hash: tokenHash as string, type: type as EmailOtpType });
  if (error) return failure;

  return NextResponse.redirect(new URL(next, request.url));
}

/** Only allow same-site relative paths as a post-login destination. */
function safeNext(value: string | null): string {
  if (!value) return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}
