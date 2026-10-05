"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export interface SignInState {
  status: "idle" | "sent" | "error";
  email?: string;
  message?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Where magic links should land. Prefer an explicit site URL in production. */
async function siteOrigin(): Promise<string> {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export async function sendMagicLink(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!EMAIL_RE.test(email)) {
    return { status: "error", email, message: "That email doesn't look quite right. Mind checking it?" };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { status: "error", email, message: "Accounts aren't connected yet. You can keep exploring in demo mode." };
  }

  const origin = await siteOrigin();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/confirm`,
      shouldCreateUser: true,
    },
  });

  if (error) {
    // Supabase rate-limits magic links; keep the message calm and useful.
    const tooMany = /rate|too many|seconds/i.test(error.message);
    return {
      status: "error",
      email,
      message: tooMany
        ? "We just sent a link a moment ago. Give it a minute, then try again."
        : "We couldn't send your link just now. Please try again in a moment.",
    };
  }

  return { status: "sent", email };
}
