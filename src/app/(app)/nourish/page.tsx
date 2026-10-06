import { SectionHeading } from "@/components/ui/SectionHeading";
import { TodaysPlate } from "@/components/nourish/TodaysPlate";
import { PlantsAndWater } from "@/components/nourish/PlantsAndWater";
import { FoundationToday } from "@/components/nourish/FoundationToday";
import { NourishModeNote } from "@/components/nourish/NourishModeNote";
import { FoodThought } from "@/components/nourish/FoodThought";

export const metadata = { title: "Nourish" };

export default function NourishPage() {
  return (
    <div className="animate-rise space-y-10">
      <SectionHeading
        as="h1"
        eyebrow="Nutrition literacy"
        title="Nourish"
        description="Learn your food. Tap what was on the plate, count your plants and water, and let the patterns show themselves."
      />
      <NourishModeNote />
      <TodaysPlate />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="xl:col-span-3"><PlantsAndWater /></div>
        <div className="xl:col-span-2"><FoodThought /></div>
      </div>
      <FoundationToday />
    </div>
  );
}
