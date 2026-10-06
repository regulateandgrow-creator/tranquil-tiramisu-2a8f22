"use client";

import { Droplets, Leaf } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Stepper } from "@/components/ui/Stepper";
import { useDayStore } from "@/lib/store/day-store";
import { PLANTS_MAX, WATER_MAX } from "@/lib/demo/nourish";

export function PlantsAndWater() {
  const { nourish, setPlants, setWater } = useDayStore();
  return (
    <section className="space-y-4">
      <SectionHeading eyebrow="Plants & water" title="Two counts worth keeping." description="Fiber and hydration are the quiet foundations. A tap each time is enough." />
      <Card className="space-y-6">
        <Stepper label="Colorful plants" hint="Vegetables, fruit, beans, nuts, whole grains" unit={["serving", "servings"]} value={nourish.plants ?? 0} max={PLANTS_MAX} onChange={setPlants} icon={<Leaf strokeWidth={1.75} />} />
        <Stepper label="Water" hint="Tea and sparkling count" unit={["glass", "glasses"]} value={nourish.water ?? 0} max={WATER_MAX} onChange={setWater} icon={<Droplets strokeWidth={1.75} />} />
      </Card>
    </section>
  );
}
