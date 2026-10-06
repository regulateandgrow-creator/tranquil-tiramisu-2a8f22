import type { DayCheckIn, FoundationPillar, FoundationStatus } from "@/lib/demo/types";
import { mealSlots } from "@/lib/demo/nourish";

/**
 * My Foundation, computed from today's own logs. Status language is deliberately
 * gentle: Building / Steady / Needs attention / Not logged yet. Never a score.
 */

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

export function computeFoundation(checkIn: DayCheckIn): FoundationPillar[] {
  const n = checkIn.nourish ?? {};
  const meals = n.meals ?? {};
  const slotsLogged = mealSlots.filter((s) => (meals[s.key]?.length ?? 0) > 0).length;
  const anchors = mealSlots.filter((s) => meals[s.key]?.includes("protein")).length;

  let proteinStatus: FoundationStatus;
  let proteinDetail: string;
  if (slotsLogged === 0) {
    proteinStatus = "not-logged";
    proteinDetail = "Nothing on the plate yet. Tap your meals in Nourish when you have a minute.";
  } else if (anchors === 0) {
    proteinStatus = slotsLogged >= 2 ? "needs-attention" : "building";
    proteinDetail = slotsLogged >= 2
      ? "No protein anchor so far. Eggs, fish, beans, yogurt, tofu all count."
      : "One meal logged. A protein anchor at the next one is the easy win.";
  } else if (anchors === 1) {
    proteinStatus = "building";
    proteinDetail = "One protein anchor so far. The next meal usually closes the gap.";
  } else {
    proteinStatus = "steady";
    proteinDetail = `${anchors} meals with a protein anchor. That's the habit that keeps muscle.`;
  }

  const plants = n.plants ?? 0;
  const fiberStatus: FoundationStatus = plants === 0 ? "not-logged" : plants <= 2 ? "building" : "steady";
  const fiberDetail = plants === 0
    ? "Plant servings not noted yet. Vegetables, fruit, beans, nuts and whole grains all count."
    : plants <= 2
      ? `${plants} plant serving${plants === 1 ? "" : "s"} so far. Variety matters more than volume.`
      : `${plants} plant servings. Your gut bacteria are well fed today.`;

  const water = n.water ?? 0;
  const hydrationStatus: FoundationStatus = water === 0 ? "not-logged" : water <= 3 ? "building" : "steady";
  const hydrationDetail = water === 0
    ? "No glasses noted yet. Thirst gets quieter with age, so a glass before you feel it helps."
    : water <= 3
      ? `${water} glass${water === 1 ? "" : "es"} so far. One with each meal is an easy rhythm.`
      : `${water} glasses. Nicely steady.`;

  const movement = checkIn.signals.movement;
  const kinds = checkIn.move?.kinds ?? [];
  const rest = kinds.includes("rest");
  const strength = kinds.includes("strength");
  const duration = checkIn.move?.duration;
  let movementStatus: FoundationStatus;
  let movementDetail: string;
  let movementProgress: number | undefined;
  if (rest) {
    movementStatus = "building";
    movementDetail = "Rest day noted. Recovery is where strength is built.";
    movementProgress = 0.5;
  } else if (kinds.length > 0) {
    const substantial = strength || (duration !== undefined && duration !== "few");
    movementStatus = substantial ? "steady" : "building";
    movementDetail = strength
      ? "Strength today. That's the habit that keeps bones and muscle."
      : substantial
        ? "A moving day. Everyday movement counts."
        : "A few minutes of movement noted. Small and often adds up.";
    movementProgress = strength ? 1 : duration === "long" || duration === "medium" ? 0.85 : duration === "short" ? 0.65 : 0.35;
  } else if (movement !== undefined) {
    movementStatus = movement >= 4 ? "steady" : "building";
    movementDetail = movement >= 4 ? "A moving day. Everyday movement counts." : "A lighter day. Maintenance is progress.";
    movementProgress = clamp01(movement / 5);
  } else {
    movementStatus = "not-logged";
    movementDetail = "Not logged yet. Everyday movement counts, not just workouts.";
    movementProgress = undefined;
  }

  const sleep = checkIn.signals.sleep;
  const sleepStatus: FoundationStatus = sleep === undefined ? "not-logged" : sleep >= 4 ? "steady" : "building";
  const sleepDetail = sleep === undefined
    ? "Not logged yet. Last night's rest is worth a quick note."
    : sleep >= 4
      ? "Restful night noted. That's the foundation under everything else."
      : "A lighter night. Gentle on yourself today.";

  return [
    { key: "protein", label: "Protein", status: proteinStatus, progress: slotsLogged === 0 ? undefined : clamp01(anchors / 3), detail: proteinDetail },
    { key: "fiber", label: "Fiber", status: fiberStatus, progress: plants === 0 ? undefined : clamp01(plants / 5), detail: fiberDetail },
    { key: "hydration", label: "Hydration", status: hydrationStatus, progress: water === 0 ? undefined : clamp01(water / 8), detail: hydrationDetail },
    { key: "movement", label: "Movement", status: movementStatus, progress: movementProgress, detail: movementDetail },
    { key: "sleep", label: "Sleep", status: sleepStatus, progress: sleep === undefined ? undefined : clamp01(sleep / 5), detail: sleepDetail },
  ];
}
