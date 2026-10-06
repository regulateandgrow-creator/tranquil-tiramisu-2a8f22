#!/usr/bin/env node
// Run SQL against the real Supabase project through the Management API.
// Used where a direct database connection is not possible (e.g. cloud sessions that only allow HTTPS).
//
//   SUPABASE_ACCESS_TOKEN=<scoped token: Database + Migrations read-write> \
//   node scripts/supabase-sql.mjs "select now()"            # writable, runs as the SQL-editor role
//   SQL_READ_ONLY=1 node scripts/supabase-sql.mjs --file path.sql   # read-only role
//
// Reads NEXT_PUBLIC_SUPABASE_URL for the project ref. Never prints the token.
import { readFileSync } from "node:fs";

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
if (!url) { console.error("NEXT_PUBLIC_SUPABASE_URL missing"); process.exit(2); }
const ref = new URL(url).hostname.split(".")[0];
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) { console.error("SUPABASE_ACCESS_TOKEN missing"); process.exit(2); }
const sql = process.argv[2] === "--file" ? readFileSync(process.argv[3], "utf8") : process.argv[2];
if (!sql) { console.error("usage: supabase-sql.mjs \"<sql>\" | --file <path>"); process.exit(2); }

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query: sql, read_only: process.env.SQL_READ_ONLY === "1" }),
});
const text = await res.text();
if (!res.ok) { console.error("HTTP", res.status, text.slice(0, 2000)); process.exit(1); }
process.stdout.write(text + "\n");
