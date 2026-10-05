import type { SupabaseClient } from "@supabase/supabase-js";
import type { PersonalAnalysis, ProductCandidate, ProductDossier, DossierPricing } from "@/lib/ai/schemas";

/** Row shapes for the Stage 3 tables. Keep in sync with supabase/migrations. */

export type AnalysisStatus =
  | "pending" | "resolving" | "needs_confirmation" | "researching" | "personalizing" | "complete" | "failed" | "limited";

export type Decision = "try_track" | "save" | "not_for_me";

export interface AnalysisRow {
  id: string;
  user_id: string;
  product_id: string | null;
  research_id: string | null;
  query_text: string;
  goals: string[];
  goal_other: string | null;
  status: AnalysisStatus;
  stage_message: string | null;
  candidates: ProductCandidate[] | null;
  result: PersonalAnalysis | null;
  error_code: string | null;
  decision: Decision | null;
  decided_at: string | null;
  model: string | null;
  research_cached: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface ProductRow {
  id: string;
  identity_key: string;
  brand: string;
  name: string;
  variant: string | null;
  form: string | null;
  category: string | null;
}

export interface ResearchRow {
  id: string;
  product_id: string;
  version: number;
  dossier: ProductDossier;
  sources: unknown[];
  formulation_fingerprint: string | null;
  price_snapshot: DossierPricing | null;
  price_observed_at: string | null;
  model: string | null;
  researched_at: string;
  expires_at: string;
  stale: boolean;
}

/* ── analyses (as the user, RLS enforced) ───────────────────── */

export async function createAnalysis(
  supabase: SupabaseClient,
  userId: string,
  queryText: string,
): Promise<AnalysisRow> {
  const { data, error } = await supabase
    .from("analyses")
    .insert({ user_id: userId, query_text: queryText, status: "resolving", stage_message: "Finding the product" })
    .select("*")
    .single();
  if (error) throw new Error(`create analysis failed: ${error.message}`);
  return data as AnalysisRow;
}

export async function getAnalysis(supabase: SupabaseClient, id: string): Promise<AnalysisRow | null> {
  const { data, error } = await supabase.from("analyses").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`read analysis failed: ${error.message}`);
  return (data as AnalysisRow | null) ?? null;
}

export async function listAnalyses(supabase: SupabaseClient, userId: string, limit = 10): Promise<AnalysisRow[]> {
  const { data, error } = await supabase
    .from("analyses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`list analyses failed: ${error.message}`);
  return (data ?? []) as AnalysisRow[];
}

export async function updateAnalysis(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<Omit<AnalysisRow, "id" | "user_id" | "created_at" | "updated_at">> & Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.from("analyses").update(patch).eq("id", id);
  if (error) throw new Error(`update analysis failed: ${error.message}`);
}

/* ── shared facts (service role) ────────────────────────────── */

export async function findProductByKey(admin: SupabaseClient, identityKey: string): Promise<ProductRow | null> {
  const { data, error } = await admin.from("products").select("*").eq("identity_key", identityKey).maybeSingle();
  if (error) throw new Error(`product lookup failed: ${error.message}`);
  return (data as ProductRow | null) ?? null;
}

export async function upsertProduct(admin: SupabaseClient, identityKey: string, c: ProductCandidate): Promise<ProductRow> {
  const existing = await findProductByKey(admin, identityKey);
  if (existing) return existing;
  const { data, error } = await admin
    .from("products")
    .upsert(
      { identity_key: identityKey, brand: c.brand, name: c.name, variant: c.variant || null, form: c.form || null, category: c.category || null },
      { onConflict: "identity_key" },
    )
    .select("*")
    .single();
  if (error) throw new Error(`product upsert failed: ${error.message}`);
  return data as ProductRow;
}

export async function latestResearch(admin: SupabaseClient, productId: string): Promise<ResearchRow | null> {
  const { data, error } = await admin
    .from("product_research")
    .select("*")
    .eq("product_id", productId)
    .order("version", { ascending: false })
    .limit(1);
  if (error) throw new Error(`research lookup failed: ${error.message}`);
  const row = (data ?? [])[0] as ResearchRow | undefined;
  return row ?? null;
}

export async function insertResearch(
  admin: SupabaseClient,
  row: Omit<ResearchRow, "id" | "researched_at">,
): Promise<ResearchRow> {
  const { data, error } = await admin.from("product_research").insert(row).select("*").single();
  if (error) throw new Error(`research insert failed: ${error.message}`);
  return data as ResearchRow;
}

export async function updateResearchPricing(
  admin: SupabaseClient,
  researchId: string,
  pricing: DossierPricing,
  dossier: ProductDossier,
): Promise<void> {
  const { error } = await admin
    .from("product_research")
    .update({ price_snapshot: pricing, price_observed_at: new Date().toISOString(), dossier })
    .eq("id", researchId);
  if (error) throw new Error(`pricing update failed: ${error.message}`);
}

/* ── usage (service role writes; owner reads) ───────────────── */

export async function recentUsageTimes(admin: SupabaseClient, userId: string, sinceIso: string): Promise<Date[]> {
  const { data, error } = await admin
    .from("usage_events")
    .select("created_at")
    .eq("user_id", userId)
    .eq("kind", "analysis")
    .gte("created_at", sinceIso);
  if (error) throw new Error(`usage read failed: ${error.message}`);
  return ((data ?? []) as Array<{ created_at: string }>).map((r) => new Date(r.created_at));
}

export async function recordUsage(admin: SupabaseClient, userId: string, analysisId: string): Promise<void> {
  const { error } = await admin.from("usage_events").insert({ user_id: userId, kind: "analysis", analysis_id: analysisId });
  if (error) throw new Error(`usage write failed: ${error.message}`);
}

export async function getProfileLimits(
  admin: SupabaseClient,
  userId: string,
): Promise<{ tier: string | null; override: number | null; hideWeight: boolean; firstName: string | null; lifeMode: string | null }> {
  const { data, error } = await admin
    .from("profiles")
    .select("tier,analysis_limit_override,hide_weight,first_name,life_mode")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(`profile read failed: ${error.message}`);
  const row = data as { tier?: string | null; analysis_limit_override?: number | null; hide_weight?: boolean; first_name?: string | null; life_mode?: string | null } | null;
  return {
    tier: row?.tier ?? "beta",
    override: row?.analysis_limit_override ?? null,
    hideWeight: row?.hide_weight ?? true,
    firstName: row?.first_name ?? null,
    lifeMode: row?.life_mode ?? null,
  };
}

/** Average of the seven non-scale signals over recent days, for AI context. */
export async function recentSignalAverages(admin: SupabaseClient, userId: string, days = 14): Promise<Record<string, number>> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { data } = await admin.from("day_check_ins").select("signals").eq("user_id", userId).gte("day", since);
  const sums: Record<string, { total: number; n: number }> = {};
  for (const row of (data ?? []) as Array<{ signals: Record<string, number> }>) {
    for (const [k, v] of Object.entries(row.signals ?? {})) {
      if (typeof v !== "number") continue;
      sums[k] = sums[k] ?? { total: 0, n: 0 };
      sums[k].total += v;
      sums[k].n += 1;
    }
  }
  return Object.fromEntries(Object.entries(sums).map(([k, s]) => [k, s.total / s.n]));
}
