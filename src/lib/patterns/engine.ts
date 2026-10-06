import type { BodySignalKey, DayCheckIn, WorksForMeInsight } from "@/lib/demo/types";
import { signalDefinitions } from "@/lib/demo/signals";

/**
 * Works For Me™ pattern engine.
 *
 * Reads her own check-ins (signals, Nourish, Move) and the products she is trying,
 * and describes what has tended to show up alongside what. Every sentence is an
 * association. Nothing here says, or implies, that one thing caused another.
 *
 * Honest minimums: a pattern needs at least MIN_EACH logged days on both sides
 * and a difference of at least MIN_DIFF on the 1–5 scale before it is mentioned.
 */

export interface TriedProduct {
  title: string;
  /** Local day key she decided to try it. */
  since: string;
}

export interface PatternInput {
  checkIns: Record<string, DayCheckIn>;
  today: string;
  /** Days to look back, including today. */
  windowDays?: number;
  products?: TriedProduct[];
}

export interface PatternOutput {
  insights: WorksForMeInsight[];
  /** Days in the window with any signal, plate, plant, water or movement noted. */
  loggedDays: number;
  windowDays: number;
}

const MIN_EACH = 3;
const CONSISTENT_EACH = 5;
const MIN_DIFF = 0.75;
const CONSISTENT_DIFF = 1.0;
const MAX_INSIGHTS = 8;

type Category = WorksForMeInsight["category"];

interface Behavior {
  key: string;
  category: Category;
  /** Sentence opener, e.g. "On days with a protein anchor at breakfast". */
  opener: string;
  /** true/false when the relevant log exists for the day; undefined when it does not. */
  test: (c: DayCheckIn) => boolean | undefined;
}

const mealsLogged = (c: DayCheckIn) => Object.values(c.nourish?.meals ?? {}).some((t) => t && t.length > 0);
const anyTag = (c: DayCheckIn, tag: string) => Object.values(c.nourish?.meals ?? {}).some((t) => t?.includes(tag as never));
const kinds = (c: DayCheckIn) => c.move?.kinds ?? [];

const BEHAVIORS: Behavior[] = [
  { key: "protein_breakfast", category: "meals", opener: "On days with a protein anchor at breakfast", test: (c) => (mealsLogged(c) ? !!c.nourish?.meals?.breakfast?.includes("protein") : undefined) },
  { key: "plants3", category: "meals", opener: "On days with three or more plant servings", test: (c) => (c.nourish?.plants !== undefined ? c.nourish.plants >= 3 : undefined) },
  { key: "water6", category: "meals", opener: "On days with six or more glasses of water", test: (c) => (c.nourish?.water !== undefined ? c.nourish.water >= 6 : undefined) },
  { key: "caffeine", category: "meals", opener: "On days you noted caffeine", test: (c) => (mealsLogged(c) ? anyTag(c, "caffeine") : undefined) },
  { key: "drink", category: "meals", opener: "On days you noted a drink", test: (c) => (mealsLogged(c) ? anyTag(c, "drink") : undefined) },
  { key: "sweet", category: "meals", opener: "On days with something sweet", test: (c) => (mealsLogged(c) ? anyTag(c, "sweet") : undefined) },
  { key: "skipped", category: "meals", opener: "On days you skipped a meal", test: (c) => (mealsLogged(c) ? anyTag(c, "skipped") : undefined) },
  { key: "moved", category: "movement", opener: "On days you moved", test: (c) => (kinds(c).length > 0 ? !kinds(c).includes("rest") : undefined) },
  { key: "strength", category: "movement", opener: "On strength days", test: (c) => (kinds(c).length > 0 ? kinds(c).includes("strength") : undefined) },
  { key: "walk", category: "movement", opener: "On days with a walk", test: (c) => (kinds(c).length > 0 ? kinds(c).includes("walk") : undefined) },
  { key: "longer_move", category: "movement", opener: "On days you moved for half an hour or more", test: (c) => (kinds(c).length > 0 && !kinds(c).includes("rest") ? c.move?.duration === "medium" || c.move?.duration === "long" : undefined) },
  { key: "restful_sleep", category: "sleep", opener: "After a restful night", test: (c) => (c.signals.sleep !== undefined ? c.signals.sleep >= 4 : undefined) },
];

interface Outcome {
  key: BodySignalKey;
  label: string;
  /** Sleep is rated for last night, so an evening behavior pairs with the next day's rating. */
  nextDay: boolean;
  /** Which direction reads as the better one, for the consistency observations. */
  goodIsHigh: boolean | null;
}

const OUTCOMES: Outcome[] = [
  { key: "energy", label: "energy", nextDay: false, goodIsHigh: true },
  { key: "mood", label: "mood", nextDay: false, goodIsHigh: true },
  { key: "digestion", label: "digestion", nextDay: false, goodIsHigh: true },
  { key: "hunger", label: "hunger", nextDay: false, goodIsHigh: null },
  { key: "cravings", label: "cravings", nextDay: false, goodIsHigh: false },
  { key: "sleep", label: "sleep", nextDay: true, goodIsHigh: true },
];

/* ── dates ─────────────────────────────────────────────────── */

export function shiftDay(dayKey: string, delta: number): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const date = new Date(y, m - 1, d + delta);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function windowDaysList(today: string, n: number): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(shiftDay(today, -i));
  return out;
}

function isLogged(c: DayCheckIn | undefined): boolean {
  if (!c) return false;
  return Object.keys(c.signals).length > 0 || mealsLogged(c) || c.nourish?.plants !== undefined || c.nourish?.water !== undefined || kinds(c).length > 0;
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function prettyDate(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ── engine ────────────────────────────────────────────────── */

interface Scored {
  insight: WorksForMeInsight;
  score: number;
}

export function findPatterns(input: PatternInput): PatternOutput {
  const windowDays = input.windowDays ?? 28;
  const days = windowDaysList(input.today, windowDays);
  const byDay = input.checkIns;
  const loggedDays = days.filter((d) => isLogged(byDay[d])).length;
  const observedOver = `last ${windowDays} days`;
  const scored: Scored[] = [];

  // 1. Behavior ↔ outcome co-occurrence.
  for (const b of BEHAVIORS) {
    for (const o of OUTCOMES) {
      if (b.key === "restful_sleep" && o.key === "sleep") continue;
      const withB: number[] = [];
      const withoutB: number[] = [];
      for (const day of days) {
        const c = byDay[day];
        if (!c) continue;
        const present = b.test(c);
        if (present === undefined) continue;
        const outcomeDay = o.nextDay ? byDay[shiftDay(day, 1)] : c;
        const rating = outcomeDay?.signals[o.key];
        if (rating === undefined) continue;
        (present ? withB : withoutB).push(rating);
      }
      if (withB.length < MIN_EACH || withoutB.length < MIN_EACH) continue;
      const diff = mean(withB) - mean(withoutB);
      if (Math.abs(diff) < MIN_DIFF) continue;
      const consistent = withB.length >= CONSISTENT_EACH && withoutB.length >= CONSISTENT_EACH && Math.abs(diff) >= CONSISTENT_DIFF;
      const direction = diff > 0 ? "higher" : "lower";
      const n = withB.length + withoutB.length;
      const text = o.nextDay
        ? `${b.opener}, the following night's sleep ratings have tended to sit ${direction} (${withB.length} of ${n} logged nights).`
        : `${b.opener}, your ${o.label} ratings have tended to sit ${direction} (${withB.length} of ${n} logged days).`;
      scored.push({
        insight: { id: `co:${b.key}:${o.key}`, category: b.category, text, confidence: consistent ? "consistent" : "emerging", observedOver },
        score: Math.abs(diff) * Math.sqrt(Math.min(withB.length, withoutB.length)),
      });
    }
  }

  // 2. Consistency observations on single signals.
  for (const o of OUTCOMES) {
    if (o.goodIsHigh === null) continue;
    const def = signalDefinitions.find((s) => s.key === o.key)!;
    const ratings = days.map((d) => byDay[d]?.signals[o.key]).filter((r): r is NonNullable<typeof r> => r !== undefined);
    if (ratings.length < 5) continue;
    const hits = ratings.filter((r) => (o.goodIsHigh ? r >= 3 : r <= 2)).length;
    if (hits / ratings.length < 0.7) continue;
    const label = o.goodIsHigh ? `${def.levels[2]} or better` : `${def.levels[1]} or quieter`;
    const Cap = o.label.charAt(0).toUpperCase() + o.label.slice(1);
    scored.push({
      insight: {
        id: `steady:${o.key}`,
        category: categoryForSignal(o.key),
        text: `${Cap} has been ${label} on ${hits} of your last ${ratings.length} logged days.`,
        confidence: ratings.length >= 10 ? "consistent" : "emerging",
        observedOver,
      },
      score: 0.5 + hits / ratings.length,
    });
  }

  // 3. Products she is trying: before vs since, associations only.
  for (const p of input.products ?? []) {
    if (!days.includes(p.since)) continue;
    for (const o of OUTCOMES) {
      if (o.nextDay) continue;
      const before: number[] = [];
      const since: number[] = [];
      for (const day of days) {
        const r = byDay[day]?.signals[o.key];
        if (r === undefined) continue;
        (day < p.since ? before : since).push(r);
      }
      if (before.length < MIN_EACH || since.length < MIN_EACH) continue;
      const diff = mean(since) - mean(before);
      if (Math.abs(diff) < MIN_DIFF) continue;
      scored.push({
        insight: {
          id: `product:${p.title}:${o.key}`,
          category: "products",
          text: `Since you started trying ${p.title} (${prettyDate(p.since)}), your ${o.label} ratings have averaged ${diff > 0 ? "higher" : "lower"} than in the ${before.length} logged days before. Early days; keep noting.`,
          confidence: since.length >= CONSISTENT_EACH && Math.abs(diff) >= CONSISTENT_DIFF ? "consistent" : "emerging",
          observedOver,
        },
        score: Math.abs(diff) * Math.sqrt(Math.min(before.length, since.length)),
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return { insights: scored.slice(0, MAX_INSIGHTS).map((s) => s.insight), loggedDays, windowDays };
}

function categoryForSignal(key: BodySignalKey): Category {
  switch (key) {
    case "sleep": return "sleep";
    case "energy": return "energy";
    case "hunger": return "hunger";
    case "cravings": return "cravings";
    case "digestion": return "digestion";
    case "movement": return "movement";
    default: return "energy";
  }
}

/** Words that would turn an association into a claim. Guarded by tests; never used in templates. */
export const CAUSAL_WORDS = /\b(cause[sd]?|because|improv\w*|boost\w*|fix\w*|led to|leads to|made you|makes you|thanks to|result\w*|proves?|works)\b/i;
