"use client";

import { MyFoundation } from "@/components/dashboard/MyFoundation";
import { useDayStore } from "@/lib/store/day-store";
import { computeFoundation } from "@/lib/foundation/compute";

const NUTRITION = new Set(["protein", "fiber", "hydration"]);

/** The three nutrition pillars, computed from today's taps. */
export function FoundationToday() {
  const { checkIn } = useDayStore();
  const pillars = computeFoundation(checkIn).filter((p) => NUTRITION.has(p.key));
  return <MyFoundation pillars={pillars} eyebrow="From today's taps" title="Your foundation today" description="A gentle picture, not a score. It updates as you tap." showLink={false} />;
}
