import type { SupabaseClient } from "@supabase/supabase-js";
import { rawLogsEnabled } from "./config";

/**
 * Two kinds of logs, by design:
 *  - structured operational fields on the analysis row (no free text, no wellness detail)
 *  - raw prompt/output rows in ai_raw_logs with expires_at, purged on a schedule
 *    and opportunistically here. Off entirely with GROWN_AI_RAW_LOGS=off.
 */

export interface OpsFields {
  model?: string | null;
  input_tokens?: number;
  output_tokens?: number;
  latency_ms?: number;
  research_cached?: boolean;
  validator?: Record<string, unknown>;
  error_code?: string | null;
}

export async function logOps(admin: SupabaseClient, analysisId: string, fields: OpsFields): Promise<void> {
  await admin.from("analyses").update(fields).eq("id", analysisId);
}

export async function logRaw(
  admin: SupabaseClient,
  analysisId: string,
  step: string,
  prompt: string,
  rawOutput: string,
  retentionDays: number,
): Promise<void> {
  if (!rawLogsEnabled() || retentionDays <= 0) return;
  const expiresAt = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000).toISOString();
  await admin.from("ai_raw_logs").insert({ analysis_id: analysisId, step, prompt, raw_output: rawOutput, expires_at: expiresAt });
  // Opportunistic purge keeps retention honest even without pg_cron.
  await admin.from("ai_raw_logs").delete().lt("expires_at", new Date().toISOString());
}

/** Structured console line for server logs. Never includes prompts or wellness detail. */
export function opsLine(event: string, fields: Record<string, string | number | boolean | null | undefined>): void {
  const safe = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
  console.info(JSON.stringify({ event, ...safe, at: new Date().toISOString() }));
}
