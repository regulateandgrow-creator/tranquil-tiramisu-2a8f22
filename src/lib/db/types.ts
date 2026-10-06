import type { LifeMode } from "@/lib/demo/types";

/** Row shapes for the Stage 2 tables. Keep in sync with supabase/migrations. */
export interface ProfileRow {
  id: string;
  first_name: string | null;
  hide_weight: boolean;
  life_mode: LifeMode;
  created_at: string;
  updated_at: string;
}

export interface DayCheckInRow {
  id: string;
  user_id: string;
  day: string; // YYYY-MM-DD
  feeling: string | null;
  signals: Record<string, number>;
  nourish: Record<string, unknown>;
  move: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
