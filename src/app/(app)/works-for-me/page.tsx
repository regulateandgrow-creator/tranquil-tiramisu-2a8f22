import { SectionHeading } from "@/components/ui/SectionHeading";
import { PatternsPage } from "@/components/patterns/PatternsPage";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getTriedProducts } from "@/lib/patterns/products";

export const metadata = { title: "Works For Me" };
export const dynamic = "force-dynamic";

export default async function WorksForMePage() {
  const user = await getCurrentUser();
  const products = await getTriedProducts(user);
  return (
    <div className="animate-rise space-y-8">
      <SectionHeading
        as="h1"
        eyebrow="Your body is the data"
        title={<span>Works For Me<sup className="text-[0.55em]">™</sup></span>}
        description="What has tended to show up alongside what, in your own logs. Always associations, never causation."
      />
      <PatternsPage products={products} />
    </div>
  );
}
