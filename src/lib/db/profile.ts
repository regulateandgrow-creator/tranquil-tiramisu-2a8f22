import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { LifeMode } from "@/lib/demo/types";
import type { ProfileRow } from "./types";

export interface Profile {
  firstName: string | null;
  hideWeight: boolean;
  lifeMode: LifeMode;
}

const DEFAULT_PROFILE: Profile = { firstName: null, hideWeight: true, lifeMode: "normal" };

function toProfile(row: Pick<ProfileRow, "first_name" | "hide_weight" | "life_mode">): Profile {
  return { firstName: row.first_name, hideWeight: row.hide_weight, lifeMode: row.life_mode };
}

/**
 * Loads the profile for a signed-in user. The database trigger creates the row
 * at sign-up; if it is somehow missing we create it with safe defaults so
 * Hide Weight is on from the first second.
 */
export const getProfile = cache(async (supabase: SupabaseClient, userId: string): Promise<Profile> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("first_name,hide_weight,life_mode")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(`profile read failed: ${error.message}`);
  if (data) return toProfile(data as ProfileRow);

  const { error: insertError } = await supabase.from("profiles").insert({ id: userId });
  if (insertError && insertError.code !== "23505") {
    throw new Error(`profile create failed: ${insertError.message}`);
  }
  return DEFAULT_PROFILE;
});

export interface ProfilePatch {
  firstName?: string;
  hideWeight?: boolean;
  lifeMode?: LifeMode;
}

export async function updateProfile(supabase: SupabaseClient, userId: string, patch: ProfilePatch): Promise<void> {
  const row: Partial<ProfileRow> = {};
  if (patch.firstName !== undefined) row.first_name = patch.firstName;
  if (patch.hideWeight !== undefined) row.hide_weight = patch.hideWeight;
  if (patch.lifeMode !== undefined) row.life_mode = patch.lifeMode;
  if (Object.keys(row).length === 0) return;

  const { error } = await supabase.from("profiles").update(row).eq("id", userId);
  if (error) throw new Error(`profile update failed: ${error.message}`);
}
