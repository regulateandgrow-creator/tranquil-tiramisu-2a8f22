import type { SupabaseClient } from "@supabase/supabase-js";
import { aiDefaults, settingEnvOverrides } from "./config";

/**
 * Settings resolution: env override → app_config row → code default.
 */
export async function getSetting(admin: SupabaseClient | null, key: string, fallback: number): Promise<number> {
  const envName = settingEnvOverrides[key];
  const fromEnv = envName ? process.env[envName] : undefined;
  if (fromEnv !== undefined && fromEnv.trim() !== "") {
    const n = Number.parseInt(fromEnv, 10);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  if (admin) {
    const { data } = await admin.from("app_config").select("value").eq("key", key).maybeSingle();
    const raw = (data as { value?: string } | null)?.value;
    if (raw !== undefined) {
      const n = Number.parseInt(raw, 10);
      if (Number.isFinite(n) && n >= 0) return n;
    }
  }
  return fallback;
}

export async function getTierLimit(admin: SupabaseClient | null, tier: string | null): Promise<number | null> {
  if (!admin || !tier) return null;
  const { data } = await admin.from("app_config").select("value").eq("key", `limit:${tier}`).maybeSingle();
  const raw = (data as { value?: string } | null)?.value;
  if (raw === undefined) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export async function getTtls(admin: SupabaseClient | null) {
  const [researchTtlDays, pricingTtlDays, goalSupplementTtlDays, rawLogRetentionDays] = await Promise.all([
    getSetting(admin, "research_ttl_days", aiDefaults.researchTtlDays),
    getSetting(admin, "pricing_ttl_days", aiDefaults.pricingTtlDays),
    getSetting(admin, "goal_supplement_ttl_days", aiDefaults.goalSupplementTtlDays),
    getSetting(admin, "ai_raw_log_retention_days", aiDefaults.aiRawLogRetentionDays),
  ]);
  return { researchTtlDays, pricingTtlDays, goalSupplementTtlDays, rawLogRetentionDays };
}
