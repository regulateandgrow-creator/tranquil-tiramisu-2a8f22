"use client";

import { MyFoundation } from "@/components/dashboard/MyFoundation";
import { useDayStore } from "@/lib/store/day-store";
import { computeFoundation } from "@/lib/foundation/compute";

export function MoveFoundation() {
  const { checkIn } = useDayStore();
  const pillars = computeFoundation(checkIn).filter((p) => p.key === "movement" || p.key === "sleep");
  return <MyFoundation pillars={pillars} eyebrow="From today's taps" title="Movement and rest today" description="Two pillars that lean on each other." showLink={false} />;
}
