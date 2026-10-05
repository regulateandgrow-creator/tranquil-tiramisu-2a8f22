import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client.
 * Only the public URL and anon key are ever exposed to the client.
 * Returns null when Supabase isn't configured yet so the demo keeps working.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createBrowserClient(url, anonKey);
}
