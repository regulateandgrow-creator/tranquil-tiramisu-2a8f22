import Link from "next/link";
import { ArrowRight, Bookmark, FlaskConical, HelpCircle, XCircle, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProductDecisionMenu } from "@/components/products/ProductDecisionMenu";
import { SHELF_LABEL, productTitle, type MyProductEntry, type MyProductsView, type ProductShelf } from "@/lib/products/my-products";

const SHELF_META: Record<ProductShelf, { icon: LucideIcon; tone: "sage" | "gold" | "default" | "rose"; blurb: string }> = {
  trying: { icon: FlaskConical, tone: "sage", blurb: "Products you've decided to try. Your check-ins are where you'll notice what shows up alongside them." },
  saved: { icon: Bookmark, tone: "gold", blurb: "Worth a second look when the moment is right. No rush." },
  not_for_me: { icon: XCircle, tone: "default", blurb: "Looked at, understood, and set aside. That's literacy too." },
  undecided: { icon: HelpCircle, tone: "rose", blurb: "You looked, you haven't decided. Both are fine." },
};

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function money(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function ProductCard({ entry, interactive }: { entry: MyProductEntry; interactive: boolean }) {
  const title = productTitle(entry);
  return (
    <li>
      <Card hover className="flex h-full flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {entry.category && <Badge tone="neutral">{entry.category}</Badge>}
          {entry.scripted && <Badge tone="gold">Scripted test data</Badge>}
          <span className="text-xs text-espresso-soft">
            Looked at {shortDate(entry.lastAnalyzedAt)}
            {entry.analysesCount > 1 ? ` · ${entry.analysesCount} times` : ""}
            {entry.decidedAt ? ` · Decided ${shortDate(entry.decidedAt)}` : ""}
          </span>
        </div>
        <div>
          <h3 className="font-serif text-xl leading-tight font-medium text-espresso">{title}</h3>
          {entry.headline && <p className="mt-1.5 text-[15px] leading-relaxed text-espresso-soft">{entry.headline}</p>}
        </div>
        <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
          {entry.evidenceFit && (
            <div className="flex gap-2"><dt className="shrink-0 text-espresso-soft">Evidence fit</dt><dd className="font-medium text-espresso">{entry.evidenceFit}</dd></div>
          )}
          {entry.value && (
            <div className="flex gap-2"><dt className="shrink-0 text-espresso-soft">Value</dt><dd className="font-medium text-espresso">{entry.value}</dd></div>
          )}
          {entry.monthlyCost !== null && (
            <div className="flex gap-2"><dt className="shrink-0 text-espresso-soft">About</dt><dd className="font-medium text-espresso">{money(entry.monthlyCost)} a month</dd></div>
          )}
        </dl>
        <div className="mt-auto flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
          {interactive ? (
            <ProductDecisionMenu analysisId={entry.analysisId} decision={entry.decision} title={title} />
          ) : (
            <span className="text-sm text-espresso-soft">{entry.decision ? SHELF_LABEL[entry.decision === "try_track" ? "trying" : entry.decision === "save" ? "saved" : "not_for_me"] : SHELF_LABEL.undecided}</span>
          )}
          {interactive && (
            <Link href={`/intelligence/${entry.analysisId}`} className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-espresso transition-colors hover:text-charcoal">
              Open the Breakdown <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </Card>
    </li>
  );
}

function Shelf({ shelf, entries, interactive }: { shelf: ProductShelf; entries: MyProductEntry[]; interactive: boolean }) {
  if (entries.length === 0) return null;
  const meta = SHELF_META[shelf];
  const Icon = meta.icon;
  return (
    <section className="space-y-3" aria-labelledby={`shelf-${shelf}`}>
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cream-deep text-espresso"><Icon className="h-[18px] w-[18px]" strokeWidth={1.75} /></span>
        <div>
          <h2 id={`shelf-${shelf}`} className="font-serif text-2xl leading-tight font-medium text-espresso">{SHELF_LABEL[shelf]}</h2>
          <p className="text-sm text-espresso-soft">{meta.blurb}</p>
        </div>
      </div>
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {entries.map((e) => <ProductCard key={e.key} entry={e} interactive={interactive} />)}
      </ul>
    </section>
  );
}

export function MyProductsList({ view, interactive }: { view: MyProductsView; interactive: boolean }) {
  if (view.total === 0) {
    return (
      <Card tone="gold" className="space-y-4">
        <p className="font-serif text-2xl font-medium leading-tight text-espresso">Nothing on the shelf yet.</p>
        <p className="max-w-prose text-[15px] text-espresso-soft">
          The first product you look at with GROWN. Intelligence lands here, along with what the evidence said and what you decided.
        </p>
        <Link href="/intelligence" className="inline-block">
          <Button variant="primary" size="md">Look at a product</Button>
        </Link>
      </Card>
    );
  }
  return (
    <div className="space-y-10">
      <Shelf shelf="undecided" entries={view.undecided} interactive={interactive} />
      <Shelf shelf="trying" entries={view.trying} interactive={interactive} />
      <Shelf shelf="saved" entries={view.saved} interactive={interactive} />
      <Shelf shelf="not_for_me" entries={view.notForMe} interactive={interactive} />
      <p className="text-xs text-espresso-soft">GROWN. keeps what you decided, not what you bought. Change your mind any time.</p>
    </div>
  );
}
