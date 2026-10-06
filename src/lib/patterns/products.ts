import type { CurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { listCompleteAnalyses } from "@/lib/db/intelligence";
import { buildMyProducts, productTitle } from "@/lib/products/my-products";
import type { TriedProduct } from "./engine";
import { demoMyProducts } from "@/lib/demo/products";

/** Products on her "Trying & tracking" shelf, with the local day she decided. */
export async function getTriedProducts(user: CurrentUser): Promise<TriedProduct[]> {
  const toDay = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  if (user.mode === "demo" || !user.id) {
    return demoMyProducts.trying.map((e) => ({ title: productTitle(e), since: e.decidedAt ? toDay(e.decidedAt) : "" })).filter((p) => p.since);
  }
  const supabase = await createClient();
  if (!supabase) return [];
  const view = buildMyProducts(await listCompleteAnalyses(supabase, user.id));
  return view.trying.filter((e) => e.decidedAt).map((e) => ({ title: productTitle(e), since: toDay(e.decidedAt!) }));
}
