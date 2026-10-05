import Link from "next/link";
import { Camera, Link2, Sparkles, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { TypeAProductFlow } from "@/components/intelligence/TypeAProductFlow";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAiProvider } from "@/lib/ai/provider";
import { checkUsage } from "@/lib/ai/pipeline/usage";
import { listAnalyses } from "@/lib/db/intelligence";

export const metadata = { title: "GROWN. Intelligence" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  complete: "Ready",
  researching: "Researching",
  personalizing: "Researching",
  needs_confirmation: "Waiting for you",
  failed: "Didn't finish",
  limited: "Paused",
  resolving: "Finding it",
  pending: "Starting",
};

export default async function IntelligencePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const user = await getCurrentUser();
  const supabase = await createClient();
  const admin = createAdminClient();
  const ready = user.mode === "live" && !!user.id && !!supabase && !!admin && !!getAiProvider();

  const [usage, recent] = ready
    ? await Promise.all([checkUsage(admin!, user.id!), listAnalyses(supabase!, user.id!, 6)])
    : [null, []];

  return (
    <div className="animate-rise space-y-8">
      <SectionHeading
        as="h1"
        eyebrow="Consumer wellness literacy"
        title={<span className="inline-flex items-center gap-2">GROWN. Intelligence <Sparkles className="h-6 w-6 text-gold" strokeWidth={1.75} /></span>}
        description="Thinking about buying something? Let's look at it first."
      />

      {ready ? (
        <TypeAProductFlow initialQuery={q ?? ""} usage={usage ? { limit: usage.limit, remaining: usage.remaining, resetsAt: usage.resetsAt?.toISOString() ?? null } : null} />
      ) : (
        <Card tone="gold" className="space-y-3">
          <Badge tone="gold">{user.mode === "demo" ? "Demo mode" : "Not switched on yet"}</Badge>
          <p className="font-serif text-2xl font-medium text-espresso">Type a product, confirm it, tell us your goal, get the Breakdown.</p>
          <p className="max-w-prose text-[15px] text-espresso-soft">
            {user.mode === "demo"
              ? "GROWN. Intelligence runs on your private account. Once accounts and the research service are connected, this is where you'll type a product name."
              : "The research service isn't configured for this environment yet. Your account is ready; the analysis engine needs its credentials."}
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cream-deep text-espresso-soft"><Camera className="h-5 w-5" strokeWidth={1.75} /></span>
          <div><p className="font-serif text-xl font-medium text-espresso">Scan a product</p><p className="text-sm text-espresso-soft">Point your camera at a label. Coming in Milestone 3.</p></div>
        </Card>
        <Card className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cream-deep text-espresso-soft"><Link2 className="h-5 w-5" strokeWidth={1.75} /></span>
          <div><p className="font-serif text-xl font-medium text-espresso">Paste a product link</p><p className="text-sm text-espresso-soft">Coming after typed analysis passes testing.</p></div>
        </Card>
      </div>

      {recent.length > 0 && (
        <section className="space-y-3">
          <SectionHeading title="Recent" description="Your last few Breakdowns." />
          <ul className="space-y-2">
            {recent.map((a) => {
              const c = a.candidates?.[0];
              const name = c ? [c.brand, c.name, c.variant].filter(Boolean).join(" ") : a.query_text;
              return (
                <li key={a.id}>
                  <Link href={`/intelligence/${a.id}`} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-warm-white px-4 py-3 transition-colors hover:bg-cream">
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-semibold text-espresso">{name}</span>
                      <span className="block text-xs text-espresso-soft">{new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {STATUS_LABEL[a.status] ?? a.status}{a.decision ? ` · ${a.decision.replace("_", " ")}` : ""}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-espresso-soft" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
