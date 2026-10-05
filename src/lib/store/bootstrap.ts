import { cache } from "react";
import type { CurrentUser } from "@/lib/auth/current-user";
import type { DayStoreInitial, StoreMode } from "./day-store";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/db/profile";
import { getRecentCheckIns } from "@/lib/db/check-ins";
import { demoUser } from "@/lib/demo/user";

export interface StoreBootstrap {
  mode: StoreMode;
  initial: DayStoreInitial;
}

const DEMO_BOOTSTRAP: StoreBootstrap = {
  mode: "demo",
  initial: {
    profile: { firstName: demoUser.firstName, hideWeight: demoUser.hideWeight },
    mode: "normal",
    checkIns: {},
  },
};

/**
 * Everything the client store needs on first render.
 * Demo mode: static defaults (localStorage fills in on the client).
 * Live mode: her profile and the check-ins around today, from the database.
 */
export const getStoreBootstrap = cache(async (user: CurrentUser): Promise<StoreBootstrap> => {
  if (user.mode === "demo" || !user.id) return DEMO_BOOTSTRAP;

  const supabase = await createClient();
  if (!supabase) return DEMO_BOOTSTRAP;

  const [profile, checkIns] = await Promise.all([
    getProfile(supabase, user.id),
    getRecentCheckIns(supabase, user.id),
  ]);

  return {
    mode: "live",
    initial: {
      profile: { firstName: profile.firstName ?? user.firstName, hideWeight: profile.hideWeight },
      mode: profile.lifeMode,
      checkIns,
    },
  };
});
