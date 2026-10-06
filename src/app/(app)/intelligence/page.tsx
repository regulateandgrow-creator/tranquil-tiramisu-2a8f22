import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { TypeAProductFlow, type EntryMode } from "@/components/intelligence/TypeAProductFlow";
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

export default async function IntelligencePage({ searchParams }: { searchParams: Promise<{ q?: string; mode?: string }> }) {
  const { q, mode } = await searchParams;
  const initialMode: EntryMode = mode === "scan" || mode === "link" ? mode : "type";
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
        description="Thinking about buying something? Let's look at it first. Literacy with sources, not medical advice."
      />

      {ready ? (
        <TypeAProductFlow initialQuery={q ?? ""} initialMode={initialMode} usage={usage ? { limit: usage.limit, remaining: usage.remaining, resetsAt: usage.resetsAt?.toISOString() ?? null } : null} />
      ) : (
        <Card tone="gold" className="space-y-3">
          <Badge tone="gold">{user.mode === "demo" ? "Demo mode" : "Not switched on yet"}</Badge>
          <p className="font-serif text-2xl font-medium text-espresso">Type it, scan the label, or paste a link. Confirm it, tell us your goal, get the Breakdown.</p>
          <p className="max-w-prose text-[15px] text-espresso-soft">
            {user.mode === "demo"
              ? "GROWN. Intelligence runs on your private account. Once accounts and the research service are connected, this is where you'll type a product name."
              : "The research service isn't configured for this environment yet. Your account is ready; the analysis engine needs its credentials."}
          </p>
        </Card>
      )}

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
