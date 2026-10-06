"use client";

import { WorksForMe } from "@/components/dashboard/WorksForMe";
import { useDayStore } from "@/lib/store/day-store";
import { findPatterns, type TriedProduct } from "@/lib/patterns/engine";

/** Home preview: the top three patterns from her own logs. */
export function WorksForMeLive({ products }: { products: TriedProduct[] }) {
  const { checkIns, today } = useDayStore();
  const { insights, loggedDays, windowDays } = findPatterns({ checkIns, today, products });
  return <WorksForMe insights={insights} loggedDays={loggedDays} windowDays={windowDays} />;
}
