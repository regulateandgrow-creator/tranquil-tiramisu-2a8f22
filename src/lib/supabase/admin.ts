import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "./config";

/**
 * Service-role client. SERVER ONLY. Bypasses row-level security, so it is used
 * solely for shared facts (products, research), usage events, config and logs.
 * Never import this from a client component.
 */
let cached: SupabaseClient | null = null;

export function createAdminClient(): SupabaseClient | null {
  if (cached) return cached;
  const env = getSupabaseEnv();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!env || !serviceKey) return null;
  cached = createSupabaseClient(env.url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return cached;
}
