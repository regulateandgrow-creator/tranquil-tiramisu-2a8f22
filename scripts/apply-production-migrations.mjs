#!/usr/bin/env node
// Apply pending supabase/migrations/*.sql to the REAL project through the Management API,
// each file in its own transaction, in filename order. Which files are pending comes from the
// public.app_migrations ledger; before the ledger exists, a project that already has
// public.profiles is treated as having the two original migrations applied.
//
//   SUPABASE_ACCESS_TOKEN=... node scripts/apply-production-migrations.mjs            # apply pending
//   SUPABASE_ACCESS_TOKEN=... node scripts/apply-production-migrations.mjs --dry-run  # list only
import { readdirSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runner = path.join(root, "scripts", "supabase-sql.mjs");
const run = (sql, ro) => JSON.parse(execFileSync("node", [runner, sql], { env: { ...process.env, SQL_READ_ONLY: ro ? "1" : "0" }, encoding: "utf8" }));
const dryRun = process.argv.includes("--dry-run");
const BASELINE = ["20261005000001_profiles_and_check_ins.sql", "20261005000002_intelligence.sql"];

const ledgerExists = run("select to_regclass('public.app_migrations') is not null as present", true)[0].present;
const profilesExist = run("select to_regclass('public.profiles') is not null as present", true)[0].present;
const applied = new Set(ledgerExists ? run("select name from public.app_migrations", true).map((r) => r.name) : profilesExist ? BASELINE : []);

const dir = path.join(root, "supabase", "migrations");
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const pending = files.filter((f) => !applied.has(f));
console.log(`applied: ${applied.size}, pending: ${pending.length}${pending.length ? " → " + pending.join(", ") : ""}`);
if (dryRun || pending.length === 0) process.exit(0);

for (const file of pending) {
  const sql = readFileSync(path.join(dir, file), "utf8");
  run(`begin;\n${sql}\ncommit;`, false);
  if (run("select to_regclass('public.app_migrations') is not null as present", true)[0].present) {
    run(`insert into public.app_migrations (name) values ('${file}') on conflict do nothing`, false);
  }
  console.log("applied", file);
}
console.log(run("select string_agg(tablename, ', ' order by tablename) as tables from pg_tables where schemaname='public'", true)[0].tables);
