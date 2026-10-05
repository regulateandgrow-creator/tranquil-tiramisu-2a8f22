/**
 * "What are you hoping this product will do for you?"
 *
 * Goal selection and weight visibility are separate concepts. A woman may want
 * body-composition support without ever wanting weight displayed, requested,
 * inferred, or used. So this list never changes with Hide Weight Entirely.
 */
export interface GoalOption {
  key: string;
  label: string;
  /** Non-scale signals Intelligence should reason with for this goal. */
  nonScaleContext: string[];
}

export const goalOptions: GoalOption[] = [
  { key: "skin", label: "Skin", nonScaleContext: ["hydration", "sun habits", "sleep", "protein intake"] },
  { key: "hair", label: "Hair", nonScaleContext: ["protein intake", "iron and nutrition patterns", "stress", "sleep"] },
  { key: "nails", label: "Nails", nonScaleContext: ["protein intake", "nutrition patterns"] },
  { key: "joints", label: "Joints", nonScaleContext: ["movement", "strength work", "mobility", "pain-free range"] },
  { key: "energy", label: "Energy", nonScaleContext: ["sleep", "regular meals", "hydration", "movement"] },
  { key: "sleep", label: "Sleep", nonScaleContext: ["sleep rhythm", "caffeine timing", "evening routine", "stress"] },
  { key: "digestion", label: "Digestion", nonScaleContext: ["fiber", "hydration", "meal regularity", "stress"] },
  {
    key: "body-composition",
    label: "Body composition & weight support",
    nonScaleContext: ["protein intake", "strength training", "satiety", "energy", "sleep", "movement consistency"],
  },
  { key: "performance", label: "Workout performance", nonScaleContext: ["strength", "recovery", "sleep", "protein intake"] },
  { key: "healthy-aging", label: "Healthy aging", nonScaleContext: ["strength", "mobility", "sleep", "nutrition patterns", "consistency"] },
  { key: "other", label: "Other", nonScaleContext: [] },
];

export const goalKeys = new Set(goalOptions.map((g) => g.key));

export function goalLabel(key: string): string {
  return goalOptions.find((g) => g.key === key)?.label ?? key;
}
