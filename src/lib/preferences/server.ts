import { cache } from "react";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getStoreBootstrap } from "@/lib/store/bootstrap";

export interface Preferences {
  /** Hide Weight Entirely. When true, no feature may surface weight in any form. */
  hideWeight: boolean;
}

/**
 * Hide Weight Entirely — server side.
 * Use this in Server Components, Route Handlers and the AI layer before
 * generating anything that could mention weight.
 */
export const getPreferences = cache(async (): Promise<Preferences> => {
  const user = await getCurrentUser();
  const { initial } = await getStoreBootstrap(user);
  return { hideWeight: initial.profile.hideWeight };
});
