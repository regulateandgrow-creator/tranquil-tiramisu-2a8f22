import { PagePlaceholder } from "@/components/layout/PagePlaceholder";
export const metadata = { title: "My Body" };
export default function Page() {
  return (
    <PagePlaceholder
      eyebrow="Body literacy"
      title="My Body"
      description="Your signals over time: energy, sleep, hunger, cravings, digestion, mood, and movement. Weight stays optional and can be hidden entirely."
      milestone="Milestone 2"
    />
  );
}
