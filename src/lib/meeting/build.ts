import type { DayCheckIn, FoundationKey, WeeklyMeeting } from "@/lib/demo/types";
import { signalDefinitions } from "@/lib/demo/signals";
import { computeFoundation } from "@/lib/foundation/compute";
import { findPatterns, type TriedProduct } from "@/lib/patterns/engine";
import { summarizeWeek, weekSentence } from "@/lib/foundation/week";
import { carryForward, carryForwardWhenQuiet, intentions, prettyDay, reflections, shiftDays, weekStartOf } from "@/lib/demo/meeting";
import type { WorksForMeInsight } from "@/lib/demo/types";

/**
 * The Weekly Body Meeting, built from her own logs. Deterministic, template-based,
 * association-only. Reviews Monday through today of the current week; the
 * intention is for the week ahead; last week's intention gets a reflection.
 */

export interface MeetingView {
  weekStart: string;
  weekEnd: string;
  /** "Oct 6 – Oct 8" */
  label: string;
  daysNoted: number;
  daysSoFar: number;
  signals: Array<{ key: string; label: string; typical: string }>;
  pillars: Array<{ key: FoundationKey; label: string; steady: number; noted: number }>;
  movement: string;
  patterns: WorksForMeInsight[];
  carry: string;
  /** Last week's meeting, for the reflection question. */
  lastWeek: { weekStart: string; intentionLabel: string; reflection?: WeeklyMeeting["reflection"]; reply?: string } | null;
}

const PILLAR_LABEL: Record<FoundationKey, string> = { protein: "Protein", fiber: "Fiber", hydration: "Hydration", movement: "Movement", sleep: "Sleep" };

export function buildMeeting(checkIns: Record<string, DayCheckIn>, meetings: Record<string, WeeklyMeeting>, today: string, products: TriedProduct[] = []): MeetingView {
  const weekStart = weekStartOf(today);
  const days: string[] = [];
  for (let d = weekStart; d <= today; d = shiftDays(d, 1)) days.push(d);

  const noted = days.filter((d) => {
    const c = checkIns[d];
    if (!c) return false;
    return Object.keys(c.signals).length > 0 || Object.values(c.nourish?.meals ?? {}).some((t) => t && t.length > 0) || c.nourish?.plants !== undefined || c.nourish?.water !== undefined || (c.move?.kinds?.length ?? 0) > 0;
  });

  const signals = signalDefinitions.flatMap((def) => {
    const xs = days.map((d) => checkIns[d]?.signals[def.key]).filter((x): x is NonNullable<typeof x> => x !== undefined);
    if (xs.length === 0) return [];
    const avg = xs.reduce((a, b) => a + b, 0) / xs.length;
    return [{ key: def.key, label: def.label, typical: def.levels[Math.min(4, Math.max(0, Math.round(avg) - 1))] }];
  });

  const acc = new Map<FoundationKey, { steady: number; noted: number }>();
  for (const d of days) {
    const c = checkIns[d];
    if (!c) continue;
    for (const p of computeFoundation(c)) {
      const a = acc.get(p.key) ?? { steady: 0, noted: 0 };
      if (p.status !== "not-logged") { a.noted++; if (p.status === "steady") a.steady++; }
      acc.set(p.key, a);
    }
  }
  const order: FoundationKey[] = ["protein", "fiber", "hydration", "movement", "sleep"];
  const pillars = order.map((k) => ({ key: k, label: PILLAR_LABEL[k], ...(acc.get(k) ?? { steady: 0, noted: 0 }) }));

  // One thing to carry forward: the noted pillar with the lowest steady share; quiet weeks get the gentlest line.
  const notedPillars = pillars.filter((p) => p.noted > 0);
  const carry = notedPillars.length === 0
    ? carryForwardWhenQuiet
    : carryForward[[...notedPillars].sort((a, b) => a.steady / a.noted - b.steady / b.noted || order.indexOf(a.key) - order.indexOf(b.key))[0].key];

  const week = summarizeWeek(checkIns, today);
  const patterns = findPatterns({ checkIns, today, products }).insights.slice(0, 3);

  const prevStart = shiftDays(weekStart, -7);
  const prev = meetings[prevStart];
  const prevIntention = prev?.intention ? intentions.find((i) => i.key === prev.intention) : undefined;
  const lastWeek = prevIntention
    ? { weekStart: prevStart, intentionLabel: prevIntention.label, reflection: prev?.reflection, reply: prev?.reflection ? reflections.find((r) => r.key === prev.reflection)?.reply : undefined }
    : null;

  return {
    weekStart,
    weekEnd: today,
    label: days.length === 1 ? prettyDay(weekStart) : `${prettyDay(weekStart)} – ${prettyDay(today)}`,
    daysNoted: noted.length,
    daysSoFar: days.length,
    signals,
    pillars,
    movement: weekSentence(week),
    patterns,
    carry,
    lastWeek,
  };
}
