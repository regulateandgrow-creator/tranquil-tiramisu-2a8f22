import { SectionHeading } from "@/components/ui/SectionHeading";
import { ProgressPage } from "@/components/progress/ProgressPage";

export const metadata = { title: "Progress" };

export default function Page() {
  return (
    <div className="animate-rise space-y-8">
      <SectionHeading
        as="h1"
        eyebrow="Consistency over intensity"
        title="Progress"
        description="Energy, strength, sleep, nutrition, mobility, digestion, and consistency. Quality of life, not just numbers."
      />
      <ProgressPage />
    </div>
  );
}
