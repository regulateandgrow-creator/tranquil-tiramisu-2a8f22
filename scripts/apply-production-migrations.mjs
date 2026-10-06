#!/usr/bin/env node
// Apply supabase/migrations/*.sql to the REAL project through the Management API, each file in its
// own transaction, in filename order. Refuses to run if public.profiles already exists (first-time
// setup only; later migrations get their own guarded script).
//
//   SUPABASE_ACCESS_TOKEN=... node scripts/apply-production-migrations.mjs
import { readdirSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runner = path.join(root, "scripts", "supabase-sql.mjs");
const run = (sql, ro) => JSON.parse(execFileSync("node", [runner, sql], { env: { ...process.env, SQL_READ_ONLY: ro ? "1" : "0" }, encoding: "utf8" }));

const exists = run("select to_regclass('public.profiles') is not null as present", true)[0].present;
if (exists) { console.error("public.profiles already exists; refusing to re-apply first-time migrations."); process.exit(1); }

const dir = path.join(root, "supabase", "migrations");
for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
  const sql = readFileSync(path.join(dir, file), "utf8");
  run(`begin;\n${sql}\ncommit;`, false);
  console.log("applied", file);
}
console.log(run("select string_agg(tablename, ', ' order by tablename) as tables from pg_tables where schemaname='public'", true)[0].tables);
