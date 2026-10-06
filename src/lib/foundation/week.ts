import type { DayCheckIn } from "@/lib/demo/types";

/**
 * The Move week strip: the last seven local days ending today. Counts only;
 * no streaks, no targets, no catching up.
 */

export interface WeekDay {
  day: string;
  /** Mon, Tue, … */
  label: string;
  moved: boolean;
  strength: boolean;
  rest: boolean;
  isToday: boolean;
}

export interface WeekSummary {
  days: WeekDay[];
  movingDays: number;
  strengthDays: number;
  restDays: number;
}

function shiftDay(dayKey: string, delta: number): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const date = new Date(y, m - 1, d + delta);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function summarizeWeek(checkIns: Record<string, DayCheckIn>, today: string): WeekSummary {
  const days: WeekDay[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = shiftDay(today, -i);
    const [y, m, d] = day.split("-").map(Number);
    const kinds = checkIns[day]?.move?.kinds ?? [];
    const rest = kinds.includes("rest");
    days.push({
      day,
      label: WEEKDAY[new Date(y, m - 1, d).getDay()],
      moved: kinds.length > 0 && !rest,
      strength: kinds.includes("strength"),
      rest,
      isToday: i === 0,
    });
  }
  return {
    days,
    movingDays: days.filter((x) => x.moved).length,
    strengthDays: days.filter((x) => x.strength).length,
    restDays: days.filter((x) => x.rest).length,
  };
}

/** One warm sentence for the strip. Never "behind", never a target. */
export function weekSentence(w: WeekSummary): string {
  if (w.movingDays === 0 && w.restDays === 0) return "Nothing noted this week yet. Whatever moved you today counts.";
  const parts: string[] = [];
  parts.push(`${w.movingDays} moving day${w.movingDays === 1 ? "" : "s"} this week`);
  if (w.strengthDays > 0) parts.push(`${w.strengthDays} with strength`);
  if (w.restDays > 0) parts.push(`${w.restDays} rest day${w.restDays === 1 ? "" : "s"}`);
  return parts.join(" · ") + ".";
}
