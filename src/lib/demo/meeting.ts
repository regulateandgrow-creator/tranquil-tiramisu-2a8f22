import type { FoundationKey, MeetingIntention, MeetingReflection } from "./types";

/** Weekly Body Meeting vocabulary. The database enforces the same lists. */

export const intentions: Array<{ key: MeetingIntention; label: string; pillar: FoundationKey | null }> = [
  { key: "protein_breakfast", label: "Protein at breakfast", pillar: "protein" },
  { key: "more_plants", label: "A few more plants", pillar: "fiber" },
  { key: "water_with_meals", label: "Water with each meal", pillar: "hydration" },
  { key: "daily_walk", label: "A walk most days", pillar: "movement" },
  { key: "one_strength", label: "One strength session", pillar: "movement" },
  { key: "earlier_nights", label: "Earlier nights", pillar: "sleep" },
  { key: "keep_as_is", label: "Keep it as it is", pillar: null },
];

export const reflections: Array<{ key: MeetingReflection; label: string; reply: string }> = [
  { key: "stuck", label: "It stuck", reply: "Lovely. That's a habit forming, not a streak to protect." },
  { key: "partly", label: "Partly", reply: "Partly is most weeks. The part that happened still counts." },
  { key: "life_happened", label: "Life happened", reply: "Of course it did. Maintenance is progress, and this week is a fresh page." },
];

/** One gentle invitation per pillar for "one thing to carry forward". Never a target. */
export const carryForward: Record<FoundationKey, string> = {
  protein: "If one thing gets attention next week, let it be a protein anchor at breakfast. Eggs, yogurt, beans, leftovers all count.",
  fiber: "If one thing gets attention next week, let it be plants. Variety over volume: a handful of something different each day.",
  hydration: "If one thing gets attention next week, let it be water. A glass with each meal is the easiest rhythm there is.",
  movement: "If one thing gets attention next week, let it be movement. A ten-minute walk after a meal counts in full.",
  sleep: "If one thing gets attention next week, let it be rest. One earlier night is worth more than a perfect week.",
};

export const carryForwardWhenQuiet = "If one thing gets attention next week, let it be a single tap a day. The picture builds from there.";

/** Monday of the local week containing `dayKey`. */
export function weekStartOf(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const dow = (date.getDay() + 6) % 7; // Monday = 0
  date.setDate(date.getDate() - dow);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function shiftDays(dayKey: string, delta: number): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const date = new Date(y, m - 1, d + delta);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function prettyDay(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
