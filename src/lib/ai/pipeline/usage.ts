import type { SupabaseClient } from "@supabase/supabase-js";
import { aiDefaults } from "../config";
import { decideUsage, resolveDailyLimit, USAGE_WINDOW_MS, type UsageDecision } from "../limits";
import { getSetting, getTierLimit } from "../settings";
import { getProfileLimits, recentUsageTimes } from "@/lib/db/intelligence";

/** Resolves her limit (override → tier → default) and counts the rolling 24h window. */
export async function checkUsage(admin: SupabaseClient, userId: string): Promise<UsageDecision> {
  const profile = await getProfileLimits(admin, userId);
  const [tierLimit, defaultLimit] = await Promise.all([
    getTierLimit(admin, profile.tier),
    getSetting(admin, "analysis_daily_limit", aiDefaults.analysisDailyLimit),
  ]);
  const limit = resolveDailyLimit({ override: profile.override, tier: profile.tier, tierLimit, defaultLimit });
  const since = new Date(Date.now() - USAGE_WINDOW_MS).toISOString();
  const times = await recentUsageTimes(admin, userId, since);
  return decideUsage(limit, times);
}
