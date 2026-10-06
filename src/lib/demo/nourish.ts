import type { MealSlot, MealTag } from "./types";

/**
 * Nourish vocabulary. Taps, not counting: no calories, no grams, no weight.
 * The database enforces the same lists (public.nourish_valid). Keep them in sync.
 */

export const mealSlots: Array<{ key: MealSlot; label: string; hint: string }> = [
  { key: "breakfast", label: "Breakfast", hint: "The meal that sets up the morning." },
  { key: "lunch", label: "Lunch", hint: "Midday, however it happened." },
  { key: "dinner", label: "Dinner", hint: "The one most of us think about." },
  { key: "snacks", label: "Snacks & extras", hint: "Everything in between counts too." },
];

export const mealTags: Array<{ key: MealTag; label: string }> = [
  { key: "protein", label: "Protein anchor" },
  { key: "plants", label: "Colorful plants" },
  { key: "grains", label: "Whole grains" },
  { key: "fats", label: "Healthy fats" },
  { key: "fermented", label: "Fermented" },
  { key: "sweet", label: "Something sweet" },
  { key: "drink", label: "A drink" },
  { key: "caffeine", label: "Caffeine" },
  { key: "skipped", label: "Skipped it" },
];

export const PLANTS_MAX = 8;
export const WATER_MAX = 12;

/** Short literacy notes. General knowledge, never derived from her logs, never a prescription. */
export const foodThoughts: string[] = [
  "Protein isn't a bodybuilder thing. After 40, muscle is harder to keep, and a protein anchor at each meal is the quiet way to hold on to it.",
  "Fiber is less about regularity than about what your gut bacteria get to eat. A variety of plants matters more than any one superfood.",
  "Thirst gets quieter with age. A glass before you feel it is most of the trick.",
  "A \"healthy\" label on the front tells you about marketing. The ingredients list on the back tells you about food.",
  "Fermented foods like yogurt, kefir, kimchi and sauerkraut feed the same gut that shapes digestion and mood.",
  "Something sweet isn't a verdict. Noting it is how you learn what your body does next.",
  "Caffeine has a long tail. What you drink at three can still be around at bedtime.",
  "Skipping a meal isn't a problem to fix. Noticing what the afternoon felt like afterwards is the literacy.",
];

/** Deterministic per day so the thought stays put when she comes back. */
export function foodThoughtForDay(dayKey: string): string {
  let hash = 0;
  for (const ch of dayKey) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return foodThoughts[hash % foodThoughts.length];
}
