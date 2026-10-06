import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { secondaryNav } from "@/components/navigation/nav-config";

/** On phones the sidebar isn't there, so Settings carries the secondary destinations. */
export function MoreLinks() {
  const items = secondaryNav.filter((i) => i.href !== "/settings");
  return (
    <Card className="lg:hidden" padded={false}>
      <p className="px-5 pt-5 text-xs font-semibold uppercase tracking-[0.18em] text-espresso-soft">More of GROWN.</p>
      <ul className="mt-2 divide-y divide-line">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link href={item.href} className="flex min-h-12 items-center gap-3 px-5 py-3 text-[15px] font-medium text-espresso transition-colors hover:bg-cream">
                <Icon className="h-[18px] w-[18px] text-espresso-soft" strokeWidth={1.75} />
                <span className="flex-1">{item.label}</span>
                <ArrowRight className="h-4 w-4 text-espresso-soft" />
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
