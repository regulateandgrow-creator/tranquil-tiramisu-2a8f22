import type { FoundationPillar } from "./types";

export const demoFoundation: FoundationPillar[] = [
  {
    key: "protein",
    label: "Protein",
    status: "building",
    progress: 0.62,
    detail: "Two solid meals so far. Dinner usually closes the gap.",
  },
  {
    key: "fiber",
    label: "Fiber",
    status: "steady",
    progress: 0.8,
    detail: "Oats, berries, and lentils this week. Nicely consistent.",
  },
  {
    key: "hydration",
    label: "Hydration",
    status: "needs-attention",
    progress: 0.35,
    detail: "Lighter than your usual mornings. A glass with lunch helps.",
  },
  {
    key: "movement",
    label: "Movement",
    status: "steady",
    progress: 0.7,
    detail: "A 25‑minute walk logged. Everyday movement counts.",
  },
  {
    key: "sleep",
    label: "Sleep",
    status: "not-logged",
    detail: "Not logged yet. Last night's rest is worth a quick note.",
  },
];
