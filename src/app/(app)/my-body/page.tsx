import { SectionHeading } from "@/components/ui/SectionHeading";
import { MyBodyToday } from "@/components/dashboard/MyBodyToday";
import { SignalHistory } from "@/components/body/SignalHistory";
import { NoScaleNote } from "@/components/body/NoScaleNote";

export const metadata = { title: "My Body" };

export default function MyBodyPage() {
  return (
    <div className="animate-rise space-y-10">
      <SectionHeading
        as="h1"
        eyebrow="Body literacy"
        title="My Body"
        description="Your signals, today and over the last four weeks: energy, sleep, hunger, cravings, digestion, mood, and movement."
      />
      <MyBodyToday />
      <SignalHistory />
      <NoScaleNote />
    </div>
  );
}
