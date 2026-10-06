import { SectionHeading } from "@/components/ui/SectionHeading";
import { WeeklyMeeting } from "@/components/meeting/WeeklyMeeting";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getTriedProducts } from "@/lib/patterns/products";

export const metadata = { title: "Weekly Body Meeting" };
export const dynamic = "force-dynamic";

export default async function WeeklyBodyMeetingPage() {
  const user = await getCurrentUser();
  const products = await getTriedProducts(user);
  return (
    <div className="animate-rise space-y-8">
      <SectionHeading
        as="h1"
        eyebrow="A standing date with yourself"
        title="Weekly Body Meeting"
        description="A calm weekly review of what your body has been telling you, and one small intention for the week ahead."
      />
      <WeeklyMeeting products={products} />
    </div>
  );
}
