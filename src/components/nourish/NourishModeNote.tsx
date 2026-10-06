"use client";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useDayStore } from "@/lib/store/day-store";

/** Life Is Lifing™ shapes the ask. Maintenance means fewer taps are plenty. */
export function NourishModeNote() {
  const { mode } = useDayStore();
  if (mode === "normal") return null;
  const maintenance = mode === "maintenance";
  return (
    <Card tone={maintenance ? "rose" : "sage"} className="space-y-2">
      <Badge tone={maintenance ? "rose" : "sage"}>{maintenance ? "Maintenance" : "Rebuild"}</Badge>
      <p className="font-serif text-xl font-medium leading-tight text-espresso">
        {maintenance ? "We're protecting the foundation right now." : "Rebuilding, one plate at a time."}
      </p>
      <p className="max-w-prose text-[15px] text-espresso-soft">
        {maintenance
          ? "One protein anchor and a few glasses of water make a good day. Nothing else is required."
          : "Protein and plants first. Everything else can come back gradually."}
      </p>
    </Card>
  );
}
