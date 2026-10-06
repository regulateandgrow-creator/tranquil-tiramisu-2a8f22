import type { SupabaseClient } from "@supabase/supabase-js";
import type { WeeklyMeeting } from "@/lib/demo/types";
import { parseIntention, parseReflection, parseWeekStart } from "./validate";

export interface WeeklyMeetingRow {
  week_start: string;
  intention: string | null;
  reflection: string | null;
}

function toMeeting(row: WeeklyMeetingRow): WeeklyMeeting | null {
  const weekStart = parseWeekStart(row.week_start);
  if (!weekStart) return null;
  const out: WeeklyMeeting = { weekStart };
  const intention = parseIntention(row.intention);
  const reflection = parseReflection(row.reflection);
  if (intention) out.intention = intention;
  if (reflection) out.reflection = reflection;
  return out;
}

/** This week's and the previous weeks' meetings, keyed by week start. */
export async function getRecentMeetings(supabase: SupabaseClient, userId: string, sinceDay: string): Promise<Record<string, WeeklyMeeting>> {
  const { data, error } = await supabase.from("weekly_meetings").select("week_start,intention,reflection").eq("user_id", userId).gte("week_start", sinceDay);
  if (error) throw new Error(`meetings read failed: ${error.message}`);
  const out: Record<string, WeeklyMeeting> = {};
  for (const row of (data ?? []) as WeeklyMeetingRow[]) {
    const m = toMeeting(row);
    if (m) out[m.weekStart] = m;
  }
  return out;
}

export async function upsertMeeting(supabase: SupabaseClient, userId: string, meeting: WeeklyMeeting): Promise<void> {
  const { error } = await supabase.from("weekly_meetings").upsert(
    { user_id: userId, week_start: meeting.weekStart, intention: meeting.intention ?? null, reflection: meeting.reflection ?? null },
    { onConflict: "user_id,week_start" },
  );
  if (error) throw new Error(`meeting save failed: ${error.message}`);
}
