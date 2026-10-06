"use client";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useDayStore } from "@/lib/store/day-store";

export function MoveModeNote() {
  const { mode } = useDayStore();
  if (mode === "normal") return null;
  const maintenance = mode === "maintenance";
  return (
    <Card tone={maintenance ? "rose" : "sage"} className="space-y-2">
      <Badge tone={maintenance ? "rose" : "sage"}>{maintenance ? "Maintenance" : "Rebuild"}</Badge>
      <p className="font-serif text-xl font-medium leading-tight text-espresso">
        {maintenance ? "We're protecting the foundation right now." : "Rebuilding, one walk at a time."}
      </p>
      <p className="max-w-prose text-[15px] text-espresso-soft">
        {maintenance ? "A walk counts. A stretch counts. A rest day counts. Nothing else is required." : "Walks first, then one strength session when it feels right. Build from there."}
      </p>
    </Card>
  );
}
