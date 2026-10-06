/**
 * Supabase configuration.
 * Only the public URL and the anon/publishable key are ever read on the client.
 * When either is missing the app runs in demo mode on local data.
 */
export function getSupabaseEnv(): { url: string; anonKey: string } | null {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

/**
 * The dashboard shows the project URL in several places, some with a `/rest/v1/` or
 * `/auth/v1` suffix. The clients want the bare origin, so tolerate the common copies.
 */
export function normalizeSupabaseUrl(raw: string | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, "").replace(/\/(rest|auth|storage|realtime|functions)\/v1$/, "").replace(/\/+$/, "");
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseEnv() !== null;
}
