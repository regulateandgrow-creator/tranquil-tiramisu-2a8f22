import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { MyProductsList } from "@/components/products/MyProductsList";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { listCompleteAnalyses } from "@/lib/db/intelligence";
import { buildMyProducts } from "@/lib/products/my-products";
import { demoMyProducts } from "@/lib/demo/products";

export const metadata = { title: "My Products" };
export const dynamic = "force-dynamic";

export default async function MyProductsPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();
  const live = user.mode === "live" && !!user.id && !!supabase;
  const view = live ? buildMyProducts(await listCompleteAnalyses(supabase!, user.id!)) : demoMyProducts;

  const counts = [
    view.trying.length ? `${view.trying.length} trying` : null,
    view.saved.length ? `${view.saved.length} saved` : null,
    view.notForMe.length ? `${view.notForMe.length} not for me` : null,
    view.undecided.length ? `${view.undecided.length} still deciding` : null,
  ].filter(Boolean).join(" · ");

  return (
    <div className="animate-rise space-y-8">
      <SectionHeading
        as="h1"
        eyebrow="Consumer wellness literacy"
        title="My Products"
        description={view.total > 0 ? `Everything you've looked at, with what the evidence said and what you decided. ${counts}.` : "Everything you've looked at, with what the evidence said and what you decided."}
      />
      {!live && (
        <Card tone="gold" className="space-y-2">
          <Badge tone="gold">Demo mode</Badge>
          <p className="max-w-prose text-[15px] text-espresso-soft">
            These are fictional examples of how your shelf will look. Once accounts are connected, every product you look at with GROWN. Intelligence lands here.
          </p>
        </Card>
      )}
      <MyProductsList view={view} interactive={live} />
    </div>
  );
}
