import { SectionHeading } from "@/components/ui/SectionHeading";
import { TodaysMovement } from "@/components/move/TodaysMovement";
import { WeekStrip } from "@/components/move/WeekStrip";
import { HowItFelt } from "@/components/move/HowItFelt";
import { MoveFoundation } from "@/components/move/MoveFoundation";
import { MoveModeNote } from "@/components/move/MoveModeNote";
import { MoveThought } from "@/components/move/MoveThought";

export const metadata = { title: "Move" };

export default function MovePage() {
  return (
    <div className="animate-rise space-y-10">
      <SectionHeading
        as="h1"
        eyebrow="Body literacy"
        title="Move"
        description="Everyday movement and strength. Both count. Neither needs a gym."
      />
      <MoveModeNote />
      <TodaysMovement />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="xl:col-span-3"><WeekStrip /></div>
        <div className="xl:col-span-2"><MoveThought /></div>
      </div>
      <HowItFelt />
      <MoveFoundation />
    </div>
  );
}
