"use client";

import { MyFoundation } from "@/components/dashboard/MyFoundation";
import { useDayStore } from "@/lib/store/day-store";
import { computeFoundation } from "@/lib/foundation/compute";

/** Home: all five pillars from today's own logs. */
export function MyFoundationLive() {
  const { checkIn } = useDayStore();
  return <MyFoundation pillars={computeFoundation(checkIn)} />;
}
