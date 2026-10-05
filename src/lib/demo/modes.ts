import type { LifeMode } from "./types";

export interface LifeModeDefinition {
  key: LifeMode;
  label: string;
  short: string;
  headline: string;
  description: string;
  focus: string[];
}

export const lifeModes: LifeModeDefinition[] = [
  {
    key: "normal",
    label: "Normal Routine",
    short: "Normal",
    headline: "Full routine, your way.",
    description: "You have room this week. We'll keep the whole picture in view: meals, movement, sleep, and the habits you're building.",
    focus: ["Balanced meals", "Planned movement", "Sleep rhythm", "Habit building"],
  },
  {
    key: "maintenance",
    label: "Maintenance",
    short: "Maintain",
    headline: "We're protecting the foundation right now.",
    description: "Life is lifing. Nothing is lost. We're keeping nutrition, hydration, sleep, regular meals, and everyday movement in place so your progress holds.",
    focus: ["Nutrition", "Hydration", "Sleep", "Regular meals", "Everyday movement", "Holding your progress"],
  },
  {
    key: "rebuild",
    label: "Rebuild",
    short: "Rebuild",
    headline: "Gently coming back.",
    description: "After illness, travel, grief, or a hard stretch, we rebuild one layer at a time. No catching up. Just starting where you are.",
    focus: ["Regular meals first", "Gentle movement", "Sleep before intensity", "One habit at a time"],
  },
];

export function getLifeMode(key: LifeMode): LifeModeDefinition {
  return lifeModes.find((m) => m.key === key) ?? lifeModes[0];
}
