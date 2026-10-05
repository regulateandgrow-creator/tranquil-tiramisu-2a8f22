import { aiDefaults } from "./config";

/**
 * Usage limits — resolved in this order:
 *   per-profile override → tier limit (app_config limit:<tier>) → env/app_config default → code default.
 * Never hard-code the number in product code.
 */

export interface LimitInputs {
  override: number | null;
  tier: string | null;
  tierLimit: number | null;     // app_config limit:<tier>
  defaultLimit: number | null;  // env GROWN_ANALYSIS_DAILY_LIMIT or app_config analysis_daily_limit
}

export function resolveDailyLimit(input: LimitInputs): number {
  if (input.override !== null && input.override >= 0) return input.override;
  if (input.tier && input.tierLimit !== null && input.tierLimit >= 0) return input.tierLimit;
  if (input.defaultLimit !== null && input.defaultLimit >= 0) return input.defaultLimit;
  return aiDefaults.analysisDailyLimit;
}

export const USAGE_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface UsageDecision {
  allowed: boolean;
  limit: number;
  used: number;
  remaining: number;
  /** When the oldest counted analysis leaves the rolling window. */
  resetsAt: Date | null;
}

export function decideUsage(limit: number, eventTimes: Date[], now: Date = new Date()): UsageDecision {
  const windowStart = now.getTime() - USAGE_WINDOW_MS;
  const inWindow = eventTimes.filter((t) => t.getTime() > windowStart).sort((a, b) => a.getTime() - b.getTime());
  const used = inWindow.length;
  const remaining = Math.max(0, limit - used);
  const resetsAt = inWindow.length > 0 ? new Date(inWindow[0].getTime() + USAGE_WINDOW_MS) : null;
  return { allowed: used < limit, limit, used, remaining, resetsAt };
}

export function parseLimitValue(value: string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
