import type { BodySignalKey, SignalLevel } from "./types";

export interface SignalDefinition {
  key: BodySignalKey;
  label: string;
  prompt: string;
  /** Labels for levels 1–5, in order. Written to be descriptive, never judgmental. */
  levels: [string, string, string, string, string];
}

export const signalDefinitions: SignalDefinition[] = [
  {
    key: "energy",
    label: "Energy",
    prompt: "How's your energy?",
    levels: ["Running low", "A little flat", "Steady", "Bright", "Full tank"],
  },
  {
    key: "sleep",
    label: "Sleep",
    prompt: "How did you sleep?",
    levels: ["Rough night", "Light", "Okay", "Restful", "Deep & restored"],
  },
  {
    key: "hunger",
    label: "Hunger",
    prompt: "How's your hunger today?",
    levels: ["Barely there", "Quiet", "Normal", "Noticeable", "Very hungry"],
  },
  {
    key: "cravings",
    label: "Cravings",
    prompt: "Any cravings showing up?",
    levels: ["None", "Mild", "Some", "Persistent", "Loud"],
  },
  {
    key: "digestion",
    label: "Digestion",
    prompt: "How's your digestion?",
    levels: ["Uncomfortable", "A bit off", "Fine", "Settled", "Great"],
  },
  {
    key: "mood",
    label: "Mood",
    prompt: "How's your mood?",
    levels: ["Heavy", "Low‑key", "Even", "Good", "Glowing"],
  },
  {
    key: "movement",
    label: "Movement",
    prompt: "How much have you moved?",
    levels: ["Resting today", "A little", "Some", "Active", "Lots"],
  },
];

export const feelingOptions: string[] = [
  "Rested",
  "Steady",
  "Tired",
  "Stressed",
  "Tender",
  "Motivated",
  "Foggy",
  "Content",
];

export function levelLabel(def: SignalDefinition, level?: SignalLevel): string {
  if (!level) return "Not logged yet";
  return def.levels[level - 1];
}
