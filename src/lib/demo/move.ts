import type { MoveDuration, MoveKind, StrengthArea } from "./types";

/**
 * Move vocabulary. Everyday movement and strength both count; neither needs a gym.
 * The database enforces the same lists (public.move_valid). Keep them in sync.
 */

export const moveKinds: Array<{ key: MoveKind; label: string }> = [
  { key: "walk", label: "Walk" },
  { key: "strength", label: "Strength" },
  { key: "stretch", label: "Stretch & mobility" },
  { key: "yoga", label: "Yoga or Pilates" },
  { key: "cardio", label: "Cardio" },
  { key: "chores", label: "Housework & errands" },
  { key: "garden", label: "Gardening" },
  { key: "dance", label: "Dance" },
  { key: "swim", label: "Swim" },
  { key: "cycle", label: "Cycle" },
  { key: "rest", label: "Rest day" },
];

export const moveDurations: Array<{ key: MoveDuration; label: string }> = [
  { key: "few", label: "A few minutes" },
  { key: "short", label: "15 to 30 min" },
  { key: "medium", label: "30 to 60 min" },
  { key: "long", label: "An hour or more" },
];

export const strengthAreas: Array<{ key: StrengthArea; label: string }> = [
  { key: "legs", label: "Legs & glutes" },
  { key: "upper", label: "Upper body" },
  { key: "core", label: "Core" },
  { key: "full", label: "Full body" },
  { key: "balance", label: "Balance & carries" },
];

/** Short literacy notes. General knowledge, never derived from her logs, never a prescription. */
export const moveThoughts: string[] = [
  "After 40, muscle leaves quietly unless it's asked to stay. Strength work is the asking.",
  "Everyday movement counts. Carrying groceries, taking the stairs, gardening: your body doesn't know it wasn't a workout.",
  "Strength isn't about how much you lift. It's about bones, balance, and getting up off the floor at 80.",
  "A ten-minute walk after a meal is one of the oldest tools for steady energy, and it still works.",
  "Rest days are where strength is actually built. The work makes the request; recovery grants it.",
  "Balance is a skill, and skills fade without practice. Standing on one foot while the kettle boils counts.",
  "Mobility is what lets strength show up in real life. Reaching, twisting, kneeling are all worth keeping.",
];

export function moveThoughtForDay(dayKey: string): string {
  let hash = 7;
  for (const ch of dayKey) hash = (hash * 33 + ch.charCodeAt(0)) >>> 0;
  return moveThoughts[hash % moveThoughts.length];
}
