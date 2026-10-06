// Verify the REAL project after migration through the Management API: tables, RLS, policies, triggers,
// functions, config, cron schedule, effective grants, then the RLS suite inside a rolled-back transaction.
//   SUPABASE_ACCESS_TOKEN=... node scripts/verify-production-db.mjs
// plus the RLS suite inside a transaction that is rolled back (nothing persists).
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runner = path.join(ROOT, "scripts", "supabase-sql.mjs");
const run = (sql, ro = true) => JSON.parse(execFileSync("node", [runner, sql], { env: { ...process.env, SQL_READ_ONLY: ro ? "1" : "0" }, encoding: "utf8" }));
const T = ["profiles","day_check_ins","app_config","products","product_research","goal_supplements","analyses","usage_events","ai_raw_logs"];
const inList = T.map((t) => `'${t}'`).join(",");
console.log("== tables / RLS / policies / indexes");
console.table(run(`select c.relname as table_name, c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced,
 (select count(*) from pg_policies p where p.schemaname='public' and p.tablename=c.relname) as policies,
 (select count(*) from pg_indexes i where i.schemaname='public' and i.tablename=c.relname) as indexes
 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relname in (${inList}) order by 1`));
console.log("== triggers"); console.table(run(`select tgname as trigger_name, tgrelid::regclass::text as on_table from pg_trigger where tgname in ('on_auth_user_created','profiles_set_updated_at','day_check_ins_set_updated_at','analyses_set_updated_at') order by 1`));
console.log("== functions"); console.table(run(`select proname as function_name, prosecdef as security_definer from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and proname in ('set_updated_at','signals_valid','handle_new_user','purge_expired_ai_raw_logs') order by 1`));
console.log("== app_config"); console.table(run(`select key, value from public.app_config order by key`));
console.log("== raw-log purge schedule"); console.table(run(`select jobname, schedule, active from cron.job where jobname='purge-ai-raw-logs'`));
console.log("== effective privileges for anon / authenticated (expected: anon none; app_config + ai_raw_logs none)");
console.table(run(`select t.tablename, r.role, string_agg(p.priv, ',' order by p.priv) filter (where has_table_privilege(r.role, 'public.'||t.tablename, p.priv)) as privileges from pg_tables t cross join (values ('anon'),('authenticated')) r(role) cross join (values ('SELECT'),('INSERT'),('UPDATE'),('DELETE')) p(priv) where t.schemaname='public' and t.tablename in (${inList}) group by 1,2 order by 1,2`));
console.log("== RLS suite inside a rolled-back transaction");
const suite = readFileSync(`${ROOT}/supabase/tests/rls.test.sql`, "utf8").split("\n").filter((l) => !l.startsWith("\\set")).join("\n");
const passes = (suite.match(/raise notice 'PASS/g) ?? []).length;
try { run(`begin;\n${suite}\nrollback;`, false); console.log(`RLS suite: all ${passes} assertions passed (any FAIL raises an error); transaction rolled back`); }
catch (e) { console.log("RLS suite FAILED:", String(e.stderr ?? e.message).slice(0, 1500)); process.exitCode = 1; }
console.log("== leftover test users (expected 0)");
console.table(run(`select count(*)::int as leftover from auth.users where email in ('ana@example.com','bea@example.com','cara@example.com','dee@example.com')`));
