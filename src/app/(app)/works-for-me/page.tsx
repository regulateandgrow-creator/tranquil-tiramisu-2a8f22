import { PagePlaceholder } from "@/components/layout/PagePlaceholder";
import { WorksForMe } from "@/components/dashboard/WorksForMe";
import { demoInsights } from "@/lib/demo/insights";
export const metadata = { title: "Works For Me" };
export default function Page() {
  return (
    <div className="space-y-6">
      <PagePlaceholder
        eyebrow="Your body is the data"
        title="Works For Me™"
        description="Patterns across meals, products, supplements, sleep, movement, energy, hunger, cravings, and digestion. Always associations, never causation."
        milestone="Milestone 4"
      />
      <WorksForMe insights={demoInsights} />
    </div>
  );
}
