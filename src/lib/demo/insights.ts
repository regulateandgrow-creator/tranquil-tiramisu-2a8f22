import type { WorksForMeInsight } from "./types";

/**
 * Works For Me™ demo insights.
 * Rule: describe associations only. Never claim causation.
 */
export const demoInsights: WorksForMeInsight[] = [
  {
    id: "wfm-1",
    category: "meals",
    text: "Higher‑protein breakfasts often appear alongside better morning satiety in your recent logs.",
    confidence: "consistent",
    observedOver: "last 3 weeks",
  },
  {
    id: "wfm-2",
    category: "energy",
    text: "You've reported steady afternoon energy on 5 of your last 6 logged workdays.",
    confidence: "consistent",
    observedOver: "last 6 workdays",
  },
  {
    id: "wfm-3",
    category: "sleep",
    text: "Evenings with a short walk have tended to show up next to your higher sleep‑quality ratings.",
    confidence: "emerging",
    observedOver: "last 2 weeks",
  },
  {
    id: "wfm-4",
    category: "digestion",
    text: "Calmer digestion has been logged more often on days that included a fiber‑rich lunch.",
    confidence: "emerging",
    observedOver: "last 10 days",
  },
];
