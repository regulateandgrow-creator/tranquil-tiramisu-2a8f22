// Production smoke test against the REAL Supabase project. Fixture AI provider: no Anthropic spend.
// Needs: the app running on :3001 against the project (GROWN_AI_PROVIDER=fixture), playwright + chromium
// available to node, SUPABASE_ACCESS_TOKEN (read-only queries) and SUPABASE_SERVICE_ROLE_KEY (admin API).
//   node tests/production/smoke.mjs
// Creates two throwaway users, exercises Stages 1-3 through the app, verifies rows in the database,
// proves isolation between users, then deletes everything it created.
import { chromium } from "playwright";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SHOTS = process.env.SMOKE_SHOTS ?? path.join(ROOT, "tests", "production", "shots");
mkdirSync(SHOTS, { recursive: true });
const require = createRequire(path.join(ROOT, "package.json"));
const { createClient } = require("@supabase/supabase-js");
const { chromiumPath } = { chromiumPath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" };

const base = "http://localhost:3001";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
const q = (sql) => JSON.parse(execFileSync("node", [path.join(ROOT, "scripts", "supabase-sql.mjs"), sql], { env: { ...process.env, SQL_READ_ONLY: "1" }, encoding: "utf8" }));
const errors = []; let fails = 0;
const ok = (label, cond, extra = "") => { if (!cond) fails++; console.log((cond ? "PASS" : "FAIL") + "  " + label + (cond ? "" : "  " + extra)); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const EMAIL_A = "grown-smoke-a@example.com", EMAIL_B = "grown-smoke-b@example.com";

async function makeUser(email) {
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error) throw new Error("createUser: " + error.message);
  return data.user.id;
}
async function linkFor(email) {
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw new Error("generateLink: " + error.message);
  return `${base}/auth/confirm?token_hash=${data.properties.hashed_token}&type=magiclink&next=/`;
}
async function waitForBreakdown(page) {
  await page.waitForFunction(() => /The GROWN\. Breakdown|didn't come together|reached today's analyses/.test(document.body.textContent), null, { timeout: 90000 });
}
async function analyze(page, query, goals) {
  await page.goto(base + "/intelligence", { waitUntil: "networkidle" });
  await page.fill("#product-query", query);
  await page.getByRole("button", { name: /Look it up/ }).click();
  await page.locator("ul[aria-label='Product candidates'] li button").first().click();
  for (const g of goals) await page.getByRole("button", { name: g, exact: true }).click();
  await page.getByRole("button", { name: /Let's look at it/ }).click();
  await page.waitForURL(/\/intelligence\/[0-9a-f-]+$/);
  await waitForBreakdown(page);
  return page.url().split("/").pop();
}

// Pre-existing shared product rows, so we only clean up what we create.
const productsBefore = new Set(q("select id from public.products").map((r) => r.id));
const usersBefore = q("select count(*)::int as n from auth.users")[0].n;

const idA = await makeUser(EMAIL_A), idB = await makeUser(EMAIL_B);
const profs = q(`select id, hide_weight, life_mode, first_name from public.profiles where id in ('${idA}','${idB}') order by id`);
ok("trigger created a profile for each new user", profs.length === 2);
ok("profiles default hide_weight=true, life_mode=normal, no name", profs.every((p) => p.hide_weight === true && p.life_mode === "normal" && p.first_name === null));

const browser = await chromium.launch({ executablePath: chromiumPath });
const wire = (page, name) => { page.on("console", (m) => { if (m.type() === "error" && !/status of (429|404)/.test(m.text())) errors.push(`[${name}] ${m.text()}`); }); page.on("pageerror", (e) => errors.push(`[${name}] ${e.message}`)); };

// ---------- User A, desktop ----------
const ctxA = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const A = await ctxA.newPage(); wire(A, "A");
await A.goto(base + "/my-body", { waitUntil: "networkidle" });
ok("A: signed-out visitor is sent to sign-in", A.url().includes("/sign-in"));
await A.goto(await linkFor(EMAIL_A), { waitUntil: "networkidle" });
ok("A: magic link signs in and lands on Home", new URL(A.url()).pathname === "/" && /How are we feeling today/.test(await A.textContent("body")));
await A.screenshot({ path: `${SHOTS}/A-home.png`, fullPage: false });

// Check-in + life mode
await A.getByRole("button", { name: "Rested" }).click();
await A.getByRole("radio", { name: "Bright" }).click();
await A.getByRole("radio", { name: "Restful" }).click();
await A.getByRole("radio", { name: /Maintain/ }).click();
await sleep(2500);
let ci = q(`select feeling, signals, day from public.day_check_ins where user_id='${idA}'`);
ok("A: check-in row saved with feeling + two signals", ci.length === 1 && ci[0].feeling === "Rested" && ci[0].signals.energy === 4 && ci[0].signals.sleep === 4, JSON.stringify(ci));
ok("A: life mode saved as maintenance", q(`select life_mode from public.profiles where id='${idA}'`)[0].life_mode === "maintenance");
await A.reload({ waitUntil: "networkidle" }); await sleep(500);
ok("A: reload restores feeling chip from the database", (await A.getByRole("button", { name: "Rested" }).getAttribute("aria-pressed")) === "true");
ok("A: reload restores maintenance mode", (await A.getByRole("radio", { name: /Maintain/ }).getAttribute("aria-checked")) === "true");
await A.getByRole("radio", { name: "Bright" }).click(); // clears energy
await sleep(2000);
ci = q(`select signals from public.day_check_ins where user_id='${idA}'`);
ok("A: clearing a signal removes it from the row", ci.length === 1 && ci[0].signals.energy === undefined && ci[0].signals.sleep === 4, JSON.stringify(ci));

// Settings
await A.goto(base + "/settings", { waitUntil: "networkidle" });
ok("A: settings shows account email", (await A.textContent("body")).includes(EMAIL_A));
ok("A: hide weight switch ON by default", (await A.getByRole("switch").getAttribute("aria-checked")) === "true");
await A.fill("#first-name", "Ana Smoke");
await A.getByRole("button", { name: "Save name" }).click();
await A.waitForSelector("text=Saved to your account"); await sleep(2000);
ok("A: first name saved to profile", q(`select first_name from public.profiles where id='${idA}'`)[0].first_name === "Ana Smoke");
await A.getByRole("switch").click(); await sleep(2000);
ok("A: hide weight OFF saved", q(`select hide_weight from public.profiles where id='${idA}'`)[0].hide_weight === false);
await A.getByRole("switch").click(); await sleep(2000);
ok("A: hide weight back ON saved", q(`select hide_weight from public.profiles where id='${idA}'`)[0].hide_weight === true);
await A.goto(base + "/", { waitUntil: "networkidle" });
ok("A: greeting uses saved first name", /Good (morning|afternoon|evening), Ana/.test(await A.textContent("body")));

// Intelligence (fixture provider)
await A.goto(base + "/intelligence", { waitUntil: "networkidle" });
ok("A: 5 of 5 analyses left", (await A.textContent("body")).includes("5 of 5 analyses left"));
const an1 = await analyze(A, "SpoiledChild E27 Extra Strength Liquid Collagen", ["Skin", "Healthy aging", "Hair", "Nails", "Joints"]);
let body = await A.textContent("body");
ok("A: Breakdown rendered with scripted badge", body.includes("The GROWN. Breakdown") && body.includes("Scripted test data") && body.includes("GROWN. TAKE"));
await A.screenshot({ path: `${SHOTS}/A-breakdown.png`, fullPage: true });
await A.getByRole("button", { name: /Try it & track it/ }).click();
await A.waitForSelector("text=Saved: Try it & track it");
let row = q(`select a.status, a.model, a.decision, a.research_cached, a.latency_ms, a.product_id, a.research_id, a.goals, a.validator is not null as has_validator, (select count(*)::int from public.usage_events u where u.user_id=a.user_id) as events, (select count(*)::int from public.ai_raw_logs l where l.analysis_id=a.id) as raw_logs, (select min(l.expires_at) > now() + interval '13 days' and max(l.expires_at) < now() + interval '15 days' from public.ai_raw_logs l where l.analysis_id=a.id) as raw_expiry_14d from public.analyses a where a.id='${an1}'`)[0];
ok("A: analysis row complete, model=fixture, decision saved", row.status === "complete" && row.model === "fixture" && row.decision === "try_track", JSON.stringify(row));
ok("A: analysis points at a product and a dossier version", !!row.product_id && !!row.research_id);
ok("A: one usage event; structured ops fields present", row.events === 1 && typeof row.latency_ms === "number" && row.has_validator && row.research_cached === false);
ok("A: raw AI logs carry a 14-day expiry", row.raw_logs > 0 && row.raw_expiry_14d === true, JSON.stringify(row));
const an2 = await analyze(A, "spoiled child e27 extra strength", ["Joints"]);
const row2 = q(`select research_cached, research_id, product_id from public.analyses where id='${an2}'`)[0];
ok("A: second analysis reused the cached dossier", row2.research_cached === true && row2.research_id === row.research_id && row2.product_id === row.product_id);
ok("A: one dossier version for the product", q(`select count(*)::int as n from public.product_research where product_id='${row.product_id}'`)[0].n === 1);
for (let i = 0; i < 3; i++) await analyze(A, "spoiledchild e27", ["Skin"]);
await A.goto(base + "/intelligence", { waitUntil: "networkidle" });
body = await A.textContent("body");
ok("A: sixth analysis paused with a warm message (5/day)", body.includes("used today's 5 analyses") && !/failed|over limit|behind/i.test(body));
ok("A: API refuses at the limit with 429", (await A.evaluate(async () => (await fetch("/api/intelligence/analyses", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: "anything" }) })).status)) === 429);
ok("A: five usage events recorded", q(`select count(*)::int as n from public.usage_events where user_id='${idA}'`)[0].n === 5);

// ---------- User B, mobile ----------
const ctxB = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const B = await ctxB.newPage(); wire(B, "B");
await B.goto(await linkFor(EMAIL_B), { waitUntil: "networkidle" });
ok("B: magic link signs in on mobile", new URL(B.url()).pathname === "/");
await sleep(500);
ok("B: sees no feeling chip from A", (await B.getByRole("button", { name: "Rested" }).getAttribute("aria-pressed")) !== "true");
ok("B: sees normal routine, not A's maintenance mode", (await B.getByRole("radio", { name: /Maintain/ }).getAttribute("aria-checked")) !== "true");
await B.goto(base + "/intelligence", { waitUntil: "networkidle" });
ok("B: has her own 5 of 5 analyses", (await B.textContent("body")).includes("5 of 5 analyses left"));
ok("B: does not see A's recent analyses", (await B.evaluate(() => [...document.querySelectorAll("a[href]")].filter((a) => /\/intelligence\/[0-9a-f-]{36}/.test(a.getAttribute("href"))).length)) === 0);
await B.screenshot({ path: `${SHOTS}/B-intelligence-mobile.png`, fullPage: true });
const resB = await B.goto(base + "/intelligence/" + an1, { waitUntil: "networkidle" });
const bodyB = await B.textContent("body");
ok("B: cannot open A's analysis page", !bodyB.includes("The GROWN. Breakdown") && (resB.status() === 404 || /couldn't find|not found|isn't here/i.test(bodyB) || !B.url().includes(an1)), `status=${resB.status()} url=${B.url()}`);
ok("B: API hides A's analysis", (await B.evaluate(async (id) => (await fetch("/api/intelligence/analyses/" + id)).status, an1)) === 404);
const swB = await B.evaluate(() => document.documentElement.scrollWidth), cwB = await B.evaluate(() => document.documentElement.clientWidth);
ok("B: no horizontal overflow on mobile", swB <= cwB);

// ---------- RLS through the public API with real sessions ----------
const userClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: lb } = await admin.auth.admin.generateLink({ type: "magiclink", email: EMAIL_B });
const { error: vErr } = await userClient.auth.verifyOtp({ token_hash: lb.properties.hashed_token, type: "magiclink" });
ok("B: session obtained through the public auth API", !vErr, vErr?.message);
const { data: pB } = await userClient.from("profiles").select("id");
ok("B (anon key + session): profiles query returns only her own row", pB?.length === 1 && pB[0].id === idB);
const { data: aB } = await userClient.from("analyses").select("id");
ok("B (anon key + session): analyses query returns none of A's five", aB?.length === 0);
const { data: cB } = await userClient.from("day_check_ins").select("id");
ok("B (anon key + session): check-ins query returns none of A's", cB?.length === 0);
const { data: upd } = await userClient.from("profiles").update({ first_name: "Hacked" }).eq("id", idA).select("id");
ok("B (anon key + session): updating A's profile affects zero rows", (upd?.length ?? 0) === 0 && q(`select first_name from public.profiles where id='${idA}'`)[0].first_name === "Ana Smoke");
const { error: cfgErr, data: cfg } = await userClient.from("app_config").select("key");
ok("B (anon key + session): app_config is not readable", !!cfgErr || cfg?.length === 0);
const { error: rawErr, data: raw } = await userClient.from("ai_raw_logs").select("id");
ok("B (anon key + session): ai_raw_logs is not readable", !!rawErr || raw?.length === 0);
const anonClient = createClient(url, anon, { auth: { persistSession: false } });
const { error: anErr, data: anRows } = await anonClient.from("profiles").select("id");
ok("anonymous (anon key, no session): profiles returns nothing", !!anErr || anRows?.length === 0);
const { error: anIns } = await anonClient.from("day_check_ins").insert({ user_id: idA, day: "2026-10-06", feeling: "Rested", signals: {} });
ok("anonymous: cannot insert a check-in", !!anIns);
await userClient.auth.signOut();

// ---------- Sign out ----------
await A.goto(base + "/", { waitUntil: "networkidle" });
await A.getByRole("button", { name: "Sign out" }).click();
await A.waitForURL("**/sign-in");
await A.goto(base + "/settings", { waitUntil: "networkidle" });
ok("A: after sign-out, pages are protected again", A.url().includes("/sign-in"));
await ctxA.close(); await ctxB.close(); await browser.close();

// ---------- Data minimization ----------
const cols = q(`select table_name, string_agg(column_name, ',' order by ordinal_position) as cols from information_schema.columns where table_schema='public' and table_name in ('profiles','day_check_ins','usage_events','analyses') group by 1 order by 1`);
ok("day_check_ins holds feeling, signals and nourish only", cols.find((c) => c.table_name === "day_check_ins").cols === "id,user_id,day,feeling,signals,created_at,updated_at,nourish");
console.log("columns:", JSON.stringify(cols));
ok("no weight-related columns anywhere", cols.every((c) => !/weight|lb|kg|bmi/i.test(c.cols.replace("hide_weight", ""))));
ok("profiles holds only first_name, hide_weight, life_mode, tier, limit override + timestamps", cols.find((c) => c.table_name === "profiles").cols === "id,first_name,hide_weight,life_mode,created_at,updated_at,tier,analysis_limit_override");
const sig = q(`select distinct jsonb_object_keys(signals) as k from public.day_check_ins where user_id='${idA}'`).map((r) => r.k);
ok("check-in signals are only approved keys", sig.every((k) => ["energy","sleep","hunger","cravings","digestion","mood","movement"].includes(k)));
ok("usage_events hold no free text", cols.find((c) => c.table_name === "usage_events").cols === "id,user_id,kind,analysis_id,created_at");

// ---------- Cleanup ----------
const productsNew = q("select id from public.products").map((r) => r.id).filter((id) => !productsBefore.has(id));
for (const id of [idA, idB]) { const { error } = await admin.auth.admin.deleteUser(id); ok(`cleanup: deleted test user ${id === idA ? "A" : "B"}`, !error, error?.message); }
for (const pid of productsNew) { const { error } = await admin.from("products").delete().eq("id", pid); ok("cleanup: deleted test product (cascades dossier)", !error, error?.message); }
const left = q(`select (select count(*)::int from public.profiles where id in ('${idA}','${idB}')) as profiles, (select count(*)::int from public.day_check_ins where user_id in ('${idA}','${idB}')) as check_ins, (select count(*)::int from public.analyses where user_id in ('${idA}','${idB}')) as analyses, (select count(*)::int from public.usage_events where user_id in ('${idA}','${idB}')) as events, (select count(*)::int from public.ai_raw_logs) as raw_logs, (select count(*)::int from public.products) as products, (select count(*)::int from public.product_research where model='fixture') as fixture_dossiers, (select count(*)::int from auth.users) as users`)[0];
console.log("after cleanup:", JSON.stringify(left));
ok("cleanup: no test rows remain, user count back to baseline", left.profiles === 0 && left.check_ins === 0 && left.analyses === 0 && left.events === 0 && left.fixture_dossiers === 0 && left.users === usersBefore && left.products === productsBefore.size);
console.log("console/page errors:", errors.length ? errors : "none");
console.log(fails === 0 ? "ALL PASS" : `${fails} FAILED`);
