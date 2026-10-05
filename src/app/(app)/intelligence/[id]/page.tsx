import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Breakdown } from "@/components/intelligence/Breakdown";
import { AnalysisPoller } from "@/components/intelligence/AnalysisPoller";
import { DecisionBar } from "@/components/intelligence/DecisionBar";
import { createClient } from "@/lib/supabase/server";
import { getAnalysis } from "@/lib/db/intelligence";

export const dynamic = "force-dynamic";

const FAILURE_COPY: Record<string, string> = {
  no_provider: "The research service isn't switched on in this environment.",
  provider_unavailable: "The research service was unavailable. Nothing was charged against your daily analyses for a failed run beyond this one.",
  provider_refused: "We couldn't look into that one. Try a different product or wording.",
  research_failed: "The research didn't come together this time.",
  validation_failed: "We produced an answer that didn't meet GROWN.'s standards, so we didn't show it. Please try again.",
  unknown: "Something didn't go to plan.",
};

export default async function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) notFound();
  const analysis = await getAnalysis(supabase, id);
  if (!analysis) notFound();

  const candidate = analysis.candidates?.[0] ?? null;
  const back = (
    <Link href="/intelligence" className="inline-flex items-center gap-1.5 text-sm font-semibold text-espresso-soft hover:text-espresso">
      <ArrowLeft className="h-4 w-4" /> GROWN. Intelligence
    </Link>
  );

  if (analysis.status === "complete" && analysis.result) {
    return (
      <div className="animate-rise space-y-6">
        {back}
        <Breakdown analysis={analysis.result} candidate={candidate} scripted={analysis.model === "fixture"} />
        <Card className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-espresso-soft">What would you like to do?</p>
          <DecisionBar id={analysis.id} initial={analysis.decision} />
        </Card>
      </div>
    );
  }

  if (analysis.status === "failed" || analysis.status === "limited") {
    return (
      <div className="animate-rise space-y-6">
        {back}
        <Card tone="rose" className="space-y-3">
          <Badge tone="rose">{analysis.status === "limited" ? "Paused" : "Didn't finish"}</Badge>
          <p className="font-serif text-2xl font-medium text-espresso">
            {analysis.status === "limited" ? "You've reached today's analyses." : "This one didn't come together."}
          </p>
          <p role="status" className="text-[15px] text-espresso-soft">
            {analysis.status === "limited" ? "Your next analysis opens up within 24 hours of your first one today." : FAILURE_COPY[analysis.error_code ?? "unknown"] ?? FAILURE_COPY.unknown}
          </p>
          <Link href={`/intelligence?q=${encodeURIComponent(analysis.query_text)}`} className="inline-block text-sm font-semibold text-espresso underline-offset-4 hover:underline">
            Try again
          </Link>
        </Card>
      </div>
    );
  }

  if (analysis.status === "needs_confirmation" || analysis.status === "resolving" || analysis.status === "pending") {
    return (
      <div className="animate-rise space-y-6">
        {back}
        <Card tone="gold" className="space-y-3">
          <p className="font-serif text-2xl font-medium text-espresso">This one is waiting for you.</p>
          <p className="text-[15px] text-espresso-soft">Confirm the product and your goals to start the research.</p>
          <Link href={`/intelligence?q=${encodeURIComponent(analysis.query_text)}`} className="inline-block text-sm font-semibold text-espresso underline-offset-4 hover:underline">Pick up where you left off</Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-rise space-y-6">
      {back}
      {candidate && <p className="font-serif text-2xl font-medium text-espresso">{[candidate.brand, candidate.name, candidate.variant].filter(Boolean).join(" ")}</p>}
      <AnalysisPoller id={analysis.id} initialMessage={analysis.stage_message} />
    </div>
  );
}
