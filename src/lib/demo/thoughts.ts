/** Today's GROWN. Thought — rotating supportive messages. */
export const grownThoughts: string[] = [
  "You don't need a perfect day. You need habits that can survive an imperfect one.",
  "Maintenance is progress.",
  "Food is not a moral test.",
  "Expensive doesn't automatically mean effective.",
  "Learn your body instead of borrowing somebody else's routine.",
  "Your body is the data. Not TikTok.™",
  "We're not trying to stop aging. We're building a body we can enjoy aging in.",
  "Consistency is quieter than intensity, and it lasts longer.",
  "A glass of water and a real meal are not small things.",
  "Rest is part of the routine, not a break from it.",
];

/** Deterministic pick for a given day so the thought is stable across reloads. */
export function thoughtForDay(dayKey: string, offset = 0): string {
  let hash = 0;
  for (let i = 0; i < dayKey.length; i++) {
    hash = (hash * 31 + dayKey.charCodeAt(i)) >>> 0;
  }
  const index = (hash + offset) % grownThoughts.length;
  return grownThoughts[index];
}
