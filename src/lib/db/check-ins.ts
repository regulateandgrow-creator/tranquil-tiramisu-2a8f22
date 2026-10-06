import type { SupabaseClient } from "@supabase/supabase-js";
import type { DayCheckIn } from "@/lib/demo/types";
import type { DayCheckInRow } from "./types";
import { parseMove, parseNourish, parseSignals } from "./validate";

function toCheckIn(row: Pick<DayCheckInRow, "day" | "feeling" | "signals" | "nourish" | "move">): DayCheckIn {
  const nourish = parseNourish(row.nourish) ?? {};
  const move = parseMove(row.move) ?? {};
  return {
    day: row.day,
    feeling: row.feeling ?? undefined,
    signals: parseSignals(row.signals) ?? {},
    ...(Object.keys(nourish).length > 0 ? { nourish } : {}),
    ...(Object.keys(move).length > 0 ? { move } : {}),
  };
}

function shiftUtcDay(base: Date, days: number): string {
  const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() + days));
  return d.toISOString().slice(0, 10);
}

/**
 * Check-ins around "today": the past week (for the Move week strip) plus one day
 * either side, because the server runs in UTC and her day key is local.
 */
export async function getRecentCheckIns(
  supabase: SupabaseClient,
  userId: string,
  now: Date = new Date(),
): Promise<Record<string, DayCheckIn>> {
  const { data, error } = await supabase
    .from("day_check_ins")
    .select("day,feeling,signals,nourish,move")
    .eq("user_id", userId)
    .gte("day", shiftUtcDay(now, -7))
    .lte("day", shiftUtcDay(now, 1));

  if (error) throw new Error(`check-in read failed: ${error.message}`);

  const out: Record<string, DayCheckIn> = {};
  for (const row of (data ?? []) as DayCheckInRow[]) out[row.day] = toCheckIn(row);
  return out;
}

export async function upsertCheckIn(supabase: SupabaseClient, userId: string, checkIn: DayCheckIn): Promise<void> {
  const { error } = await supabase.from("day_check_ins").upsert(
    {
      user_id: userId,
      day: checkIn.day,
      feeling: checkIn.feeling ?? null,
      signals: checkIn.signals,
      nourish: checkIn.nourish ?? {},
      move: checkIn.move ?? {},
    },
    { onConflict: "user_id,day" },
  );
  if (error) throw new Error(`check-in save failed: ${error.message}`);
}
