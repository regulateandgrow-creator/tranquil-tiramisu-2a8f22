/**
 * GROWN. Intelligence configuration — the one place model names and AI
 * settings live. Everything can be overridden by environment variables so a
 * model change is a config change, not a code change.
 *
 * Model availability is verified at runtime by the provider's checkModel()
 * against the Models endpoint; never assume a name is valid.
 */

export type AiProviderName = "anthropic" | "fixture" | "none";

const DEFAULT_MODEL = "claude-opus-5-5";

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

/**
 * The Anthropic key, server-side only. `GROWN_ANTHROPIC_API_KEY` is read first
 * because some hosting environments reserve the standard `ANTHROPIC_API_KEY`
 * name for their own use and never pass it to the app.
 */
export function getAnthropicApiKey(): string | undefined {
  return env("GROWN_ANTHROPIC_API_KEY") ?? env("ANTHROPIC_API_KEY");
}

export function getAiProviderName(): AiProviderName {
  const explicit = env("GROWN_AI_PROVIDER");
  if (explicit === "fixture" || explicit === "anthropic" || explicit === "none") return explicit;
  return getAnthropicApiKey() ? "anthropic" : "none";
}

export const aiModels = {
  resolve: env("GROWN_AI_MODEL_RESOLVE") ?? env("GROWN_AI_MODEL") ?? DEFAULT_MODEL,
  research: env("GROWN_AI_MODEL_RESEARCH") ?? env("GROWN_AI_MODEL") ?? DEFAULT_MODEL,
  extract: env("GROWN_AI_MODEL_EXTRACT") ?? env("GROWN_AI_MODEL") ?? DEFAULT_MODEL,
  personalize: env("GROWN_AI_MODEL_PERSONALIZE") ?? env("GROWN_AI_MODEL") ?? DEFAULT_MODEL,
} as const;

/** Code defaults. app_config (database) overrides these; env vars override both. */
export const aiDefaults = {
  analysisDailyLimit: 5,
  researchTtlDays: 30,
  pricingTtlDays: 7,
  goalSupplementTtlDays: 30,
  aiRawLogRetentionDays: 14,
  maxQueryLength: 200,
  maxGoalOtherLength: 200,
  webSearchMaxUses: 8,
} as const;

/** Setting keys → environment variable override names. */
export const settingEnvOverrides: Record<string, string> = {
  analysis_daily_limit: "GROWN_ANALYSIS_DAILY_LIMIT",
  research_ttl_days: "GROWN_RESEARCH_TTL_DAYS",
  pricing_ttl_days: "GROWN_PRICING_TTL_DAYS",
  goal_supplement_ttl_days: "GROWN_GOAL_SUPPLEMENT_TTL_DAYS",
  ai_raw_log_retention_days: "GROWN_AI_RAW_LOG_RETENTION_DAYS",
};

/**
 * Prompt caching on research calls. Measured live on 2026-10-05 (same gold case,
 * off vs on): first-analysis cost $3.07 → $1.26, research input tokens 490,638 →
 * 24 fresh + 211,232 cache reads, same latency, equal-or-better research quality,
 * no reliability change. Kept ON by default; GROWN_AI_PROMPT_CACHE=off disables it.
 */
export function promptCacheEnabled(): boolean {
  return env("GROWN_AI_PROMPT_CACHE") !== "off";
}

export function rawLogsEnabled(): boolean {
  return env("GROWN_AI_RAW_LOGS") !== "off";
}
