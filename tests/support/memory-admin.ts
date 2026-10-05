/**
 * In-memory stand-in for the subset of the Supabase query builder the
 * Intelligence pipeline uses. Lets the whole pipeline run in unit tests and in
 * the acceptance harness without a database.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

type Row = Record<string, unknown>;
type Filter = { col: string; op: "eq" | "gte" | "lte" | "lt" | "gt"; val: unknown };

const UNIQUE: Record<string, string[]> = {
  profiles: ["id"], day_check_ins: ["user_id", "day"], products: ["identity_key"], product_research: ["product_id", "version"],
  goal_supplements: ["product_id", "goal_key"], analyses: ["id"], usage_events: ["id"], app_config: ["key"], ai_raw_logs: ["id"],
};

export class MemoryDb {
  tables: Record<string, Row[]> = {
    profiles: [], day_check_ins: [], products: [], product_research: [], goal_supplements: [], analyses: [], usage_events: [],
    app_config: [{ key: "analysis_daily_limit", value: "5" }, { key: "limit:beta", value: "5" }, { key: "research_ttl_days", value: "30" }, { key: "pricing_ttl_days", value: "7" }, { key: "ai_raw_log_retention_days", value: "14" }],
    ai_raw_logs: [],
  };
  private seq = 0;
  id() { this.seq += 1; return `00000000-0000-4000-8000-${String(this.seq).padStart(12, "0")}`; }

  client(): SupabaseClient {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const db = this;
    const builder = (table: string) => {
      const rows = () => db.tables[table] ?? (db.tables[table] = []);
      const filters: Filter[] = [];
      let action: "select" | "insert" | "upsert" | "update" | "delete" = "select";
      let payload: Row | Row[] = {};
      let order: { col: string; asc: boolean } | null = null;
      let limit: number | null = null;
      let single: "single" | "maybe" | null = null;
      let upsertConflict: string[] | null = null;

      const matches = (r: Row) => filters.every((f) => {
        const a = r[f.col], b = f.val;
        switch (f.op) { case "eq": return String(a) === String(b); case "gte": return String(a) >= String(b); case "lte": return String(a) <= String(b); case "lt": return String(a) < String(b); case "gt": return String(a) > String(b); }
      });
      const run = async () => {
        let out: Row[] = [];
        if (action === "select") out = rows().filter(matches);
        if (action === "insert" || action === "upsert") {
          const list = Array.isArray(payload) ? payload : [payload];
          for (const item of list) {
            const keys = upsertConflict ?? UNIQUE[table] ?? ["id"];
            const idx = rows().findIndex((r) => keys.every((k) => String(r[k]) === String(item[k])));
            if (idx >= 0) {
              if (action === "insert") return { data: null, error: { code: "23505", message: "duplicate key" } };
              rows()[idx] = { ...rows()[idx], ...item, updated_at: new Date().toISOString() };
              out.push(rows()[idx]);
            } else {
              const row: Row = { id: db.id(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...(table === "profiles" ? { hide_weight: true, life_mode: "normal", first_name: null, tier: "beta", analysis_limit_override: null } : {}), ...(table === "analyses" ? { product_id: null, research_id: null, goals: [], goal_other: null, status: "pending", stage_message: null, candidates: null, result: null, error_code: null, decision: null, decided_at: null, model: null, research_cached: null } : {}), ...(table === "product_research" ? { stale: false, price_snapshot: null, price_observed_at: null, model: null, researched_at: new Date().toISOString() } : {}), ...item };
              rows().push(row);
              out.push(row);
            }
          }
        }
        if (action === "update") rows().forEach((r, i) => { if (matches(r)) { rows()[i] = { ...r, ...(payload as Row), updated_at: new Date().toISOString() }; out.push(rows()[i]); } });
        if (action === "delete") { const keep = rows().filter((r) => !matches(r)); out = rows().filter(matches); db.tables[table] = keep; }
        if (order) out = [...out].sort((a, b) => (String(a[order!.col]) < String(b[order!.col]) ? -1 : 1) * (order!.asc ? 1 : -1));
        if (limit !== null) out = out.slice(0, limit);
        if (single === "single") return out.length === 1 ? { data: out[0], error: null } : { data: null, error: { code: "PGRST116", message: `expected 1 row, got ${out.length}` } };
        if (single === "maybe") return out.length <= 1 ? { data: out[0] ?? null, error: null } : { data: null, error: { code: "PGRST116", message: "multiple rows" } };
        return { data: out, error: null };
      };

      const api: Record<string, unknown> = {
        select() { if (action === "select") action = "select"; return api; },
        insert(p: Row | Row[]) { action = "insert"; payload = p; return api; },
        upsert(p: Row | Row[], opts?: { onConflict?: string }) { action = "upsert"; payload = p; upsertConflict = opts?.onConflict ? opts.onConflict.split(",") : null; return api; },
        update(p: Row) { action = "update"; payload = p; return api; },
        delete() { action = "delete"; return api; },
        eq(col: string, val: unknown) { filters.push({ col, op: "eq", val }); return api; },
        gte(col: string, val: unknown) { filters.push({ col, op: "gte", val }); return api; },
        lte(col: string, val: unknown) { filters.push({ col, op: "lte", val }); return api; },
        lt(col: string, val: unknown) { filters.push({ col, op: "lt", val }); return api; },
        gt(col: string, val: unknown) { filters.push({ col, op: "gt", val }); return api; },
        order(col: string, opts?: { ascending?: boolean }) { order = { col, asc: opts?.ascending !== false }; return api; },
        limit(n: number) { limit = n; return api; },
        single() { single = "single"; return api; },
        maybeSingle() { single = "maybe"; return api; },
        then(resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) { return run().then(resolve, reject); },
      };
      return api;
    };
    return { from: (table: string) => builder(table) } as unknown as SupabaseClient;
  }
}
