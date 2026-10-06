import type { BodySignalKey, DayCheckIn, FoundationKey, SignalLevel } from "@/lib/demo/types";
import { signalDefinitions } from "@/lib/demo/signals";
import { computeFoundation } from "@/lib/foundation/compute";
import { shiftDay } from "@/lib/patterns/engine";

/**
 * Progress and My Body: her last four weeks, described, never scored.
 * Counts and averages only. No targets, no streaks, no weight.
 */

export interface StripCell {
  day: string;
  level: SignalLevel | null;
}

export interface WeekSummary {
  /** "Sep 30 – Oct 6" */
  label: string;
  days: string[];
  logged: number;
  /** Mean rating per signal over the week, null when none logged. */
  averages: Partial<Record<BodySignalKey, number | null>>;
}

export interface PillarSummary {
  key: FoundationKey;
  label: string;
  logged: number;
  steady: number;
  building: number;
  attention: number;
}

export interface ProgressSummary {
  windowDays: number;
  daysLogged: number;
  plateDays: number;
  movingDays: number;
  strengthDays: number;
  restDays: number;
  strips: Record<BodySignalKey, StripCell[]>;
  weeks: WeekSummary[];
  pillars: PillarSummary[];
  /** Per signal: how many days logged and the most common level label. */
  signalNotes: Record<BodySignalKey, { logged: number; typical: string | null }>;
}

function pretty(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function anyMeal(c: DayCheckIn | undefined): boolean {
  return Object.values(c?.nourish?.meals ?? {}).some((t) => t && t.length > 0);
}

export function summarizeProgress(checkIns: Record<string, DayCheckIn>, today: string, windowDays = 28): ProgressSummary {
  const days: string[] = [];
  for (let i = windowDays - 1; i >= 0; i--) days.push(shiftDay(today, -i));

  const strips = {} as Record<BodySignalKey, StripCell[]>;
  const signalNotes = {} as ProgressSummary["signalNotes"];
  for (const def of signalDefinitions) {
    strips[def.key] = days.map((day) => ({ day, level: checkIns[day]?.signals[def.key] ?? null }));
    const levels = strips[def.key].map((c) => c.level).filter((l): l is SignalLevel => l !== null);
    let typical: string | null = null;
    if (levels.length > 0) {
      const counts = new Map<SignalLevel, number>();
      for (const l of levels) counts.set(l, (counts.get(l) ?? 0) + 1);
      const top = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0];
      typical = def.levels[top - 1];
    }
    signalNotes[def.key] = { logged: levels.length, typical };
  }

  let daysLogged = 0, plateDays = 0, movingDays = 0, strengthDays = 0, restDays = 0;
  const pillarAcc = new Map<FoundationKey, PillarSummary>();
  for (const day of days) {
    const c = checkIns[day];
    if (!c) continue;
    const kinds = c.move?.kinds ?? [];
    const logged = Object.keys(c.signals).length > 0 || anyMeal(c) || c.nourish?.plants !== undefined || c.nourish?.water !== undefined || kinds.length > 0;
    if (!logged) continue;
    daysLogged++;
    if (anyMeal(c)) plateDays++;
    if (kinds.length > 0 && !kinds.includes("rest")) movingDays++;
    if (kinds.includes("strength")) strengthDays++;
    if (kinds.includes("rest")) restDays++;
    for (const p of computeFoundation(c)) {
      const acc = pillarAcc.get(p.key) ?? { key: p.key, label: p.label, logged: 0, steady: 0, building: 0, attention: 0 };
      if (p.status !== "not-logged") {
        acc.logged++;
        if (p.status === "steady") acc.steady++;
        else if (p.status === "building") acc.building++;
        else acc.attention++;
      }
      pillarAcc.set(p.key, acc);
    }
  }
  const order: FoundationKey[] = ["protein", "fiber", "hydration", "movement", "sleep"];
  const labels: Record<FoundationKey, string> = { protein: "Protein", fiber: "Fiber", hydration: "Hydration", movement: "Movement", sleep: "Sleep" };
  const pillars = order.map((k) => pillarAcc.get(k) ?? { key: k, label: labels[k], logged: 0, steady: 0, building: 0, attention: 0 });

  const weeks: WeekSummary[] = [];
  for (let w = 0; w < Math.ceil(windowDays / 7); w++) {
    const wdays = days.slice(w * 7, w * 7 + 7);
    const averages: WeekSummary["averages"] = {};
    for (const def of signalDefinitions) {
      const xs = wdays.map((d) => checkIns[d]?.signals[def.key]).filter((x): x is SignalLevel => x !== undefined);
      averages[def.key] = xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
    }
    weeks.push({
      label: `${pretty(wdays[0])} – ${pretty(wdays[wdays.length - 1])}`,
      days: wdays,
      logged: wdays.filter((d) => checkIns[d] && (Object.keys(checkIns[d].signals).length > 0 || anyMeal(checkIns[d]) || (checkIns[d].move?.kinds?.length ?? 0) > 0 || checkIns[d].nourish?.plants !== undefined || checkIns[d].nourish?.water !== undefined)).length,
      averages,
    });
  }

  return { windowDays, daysLogged, plateDays, movingDays, strengthDays, restDays, strips, weeks, pillars, signalNotes };
}

/** A weekly average on the 1–5 scale, named with the signal's own level words. */
export function describeAverage(key: BodySignalKey, avg: number | null): string {
  if (avg === null) return "Not logged";
  const def = signalDefinitions.find((d) => d.key === key)!;
  return def.levels[Math.min(4, Math.max(0, Math.round(avg) - 1))];
}
