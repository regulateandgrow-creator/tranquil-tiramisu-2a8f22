"use client";

import type { ReactNode } from "react";
import { useDayStore } from "@/lib/store/day-store";

/**
 * Hide Weight Entirely — client side.
 *
 * Any UI that would show a weight field, a weight trend, a weight prompt or
 * weight-based encouragement must be wrapped in <WeightSensitive>. When the
 * preference is on (the default) the children are not rendered at all.
 * Server code and AI prompts use getPreferences() from ./server instead.
 */
export function useHideWeight(): boolean {
  return useDayStore().profile.hideWeight;
}

export function WeightSensitive({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const hide = useHideWeight();
  return <>{hide ? fallback : children}</>;
}
