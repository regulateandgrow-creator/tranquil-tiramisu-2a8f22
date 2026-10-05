import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { demoUser } from "@/lib/demo/user";

export interface CurrentUser {
  /** "demo" when Supabase isn't configured; "live" for a real signed-in account */
  mode: "demo" | "live";
  id: string | null;
  email: string | null;
  firstName: string;
}

function firstNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  const word = local.split(/[._\-+0-9]/)[0] ?? "";
  if (!word) return "there";
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * The user for this request. Cached per request so layout and page share one lookup.
 * In Stage 2 the first name will come from the profiles table; for now it comes
 * from auth metadata or the email address.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const supabase = await createClient();
  if (!supabase) {
    return { mode: "demo", id: null, email: null, firstName: demoUser.firstName };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // The proxy redirects unauthenticated requests; this is a defensive fallback.
    return { mode: "live", id: null, email: null, firstName: "there" };
  }

  const metaName =
    typeof user.user_metadata?.first_name === "string" ? user.user_metadata.first_name.trim() : "";
  const email = user.email ?? null;

  return {
    mode: "live",
    id: user.id,
    email,
    firstName: metaName || (email ? firstNameFromEmail(email) : "there"),
  };
});
