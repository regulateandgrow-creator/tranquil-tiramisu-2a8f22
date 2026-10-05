"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Search, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Chip } from "@/components/ui/Chip";
import { goalOptions } from "@/lib/ai/goals";
import type { ProductCandidate } from "@/lib/ai/schemas";
import { cn } from "@/lib/utils/cn";

type Step =
  | { kind: "type" }
  | { kind: "confirm"; id: string; confidence: string; candidates: ProductCandidate[]; clarification: string }
  | { kind: "goals"; id: string; candidate: ProductCandidate; candidateIndex: number };

interface Props {
  initialQuery?: string;
  usage: { limit: number; remaining: number; resetsAt: string | null } | null;
}

function describeCandidate(c: ProductCandidate) {
  return [c.brand, c.name, c.variant].filter(Boolean).join(" · ");
}

function limitMessage(resetsAt: string | null, limit: number) {
  const when = resetsAt ? new Date(resetsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "tomorrow";
  return `You've used today's ${limit} analyses. Your next one opens up at ${when}. Nothing is lost; your products are saved.`;
}

export function TypeAProductFlow({ initialQuery = "", usage }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ kind: "type" });
  const [query, setQuery] = useState(initialQuery);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [goalOther, setGoalOther] = useState("");
  const [limitNote, setLimitNote] = useState<string | null>(
    usage && usage.remaining <= 0 ? limitMessage(usage.resetsAt, usage.limit) : null,
  );

  async function submitQuery(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const q = query.trim();
    if (q.length < 2) return setError("Give us a little more to go on, like the brand and product name.");
    setBusy(true);
    try {
      const res = await fetch("/api/intelligence/analyses", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: q }) });
      const data = await res.json();
      if (res.status === 429) return setLimitNote(limitMessage(data.resetsAt, data.limit));
      if (!res.ok) return setError(friendlyError(data.error));
      setStep({ kind: "confirm", id: data.id, confidence: data.confidence, candidates: data.candidates, clarification: data.clarification });
    } catch {
      setError("We couldn't reach GROWN. Intelligence just now. Please try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  async function confirm(id: string, candidateIndex: number) {
    setError(null);
    if (selected.length === 0) return setError("Pick at least one thing you're hoping for.");
    setBusy(true);
    try {
      const res = await fetch(`/api/intelligence/analyses/${id}/confirm`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ candidateIndex, goals: selected, goalOther: goalOther.trim() || undefined }),
      });
      const data = await res.json();
      if (res.status === 429) return setLimitNote(limitMessage(data.resetsAt, data.limit));
      if (!res.ok) return setError(friendlyError(data.error));
      router.push(`/intelligence/${id}`);
    } catch {
      setError("We couldn't start the analysis just now. Please try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  if (limitNote) {
    return (
      <Card tone="gold" className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-espresso">Today&apos;s analyses</p>
        <p className="font-serif text-2xl font-medium text-espresso">A pause until the next one.</p>
        <p role="status" className="text-[15px] text-espresso-soft">{limitNote}</p>
      </Card>
    );
  }

  if (step.kind === "type") {
    return (
      <Card className="space-y-4">
        <form onSubmit={submitQuery} className="space-y-4">
          <div>
            <label htmlFor="product-query" className="block text-[15px] font-semibold text-espresso">
              What are you thinking about buying?
            </label>
            <p className="mt-1 text-sm text-espresso-soft">Brand and product name work best, like &ldquo;SpoiledChild E27 Extra Strength Liquid Collagen&rdquo;.</p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <Input
                id="product-query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                maxLength={200}
                placeholder="Type a product"
                autoComplete="off"
                aria-describedby={error ? "query-error" : undefined}
              />
              <Button type="submit" size="lg" disabled={busy} icon={<Search />} className="sm:w-auto">
                {busy ? "Finding it…" : "Look it up"}
              </Button>
            </div>
            {error && <p id="query-error" role="alert" className="mt-2 text-sm text-rose">{error}</p>}
          </div>
        </form>
        {usage && (
          <p className="text-xs text-espresso-soft">
            {usage.remaining} of {usage.limit} analyses left today.
          </p>
        )}
      </Card>
    );
  }

  if (step.kind === "confirm") {
    const none = step.candidates.length === 0;
    return (
      <Card className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-espresso-soft">Step 1 of 2</p>
        <h2 className="font-serif text-2xl font-medium text-espresso">
          {none ? "We couldn't place that one." : step.confidence === "high" ? "Is this the one?" : "Which one do you mean?"}
        </h2>
        {step.clarification && <p className="text-[15px] text-espresso-soft">{step.clarification}</p>}
        {!none && (
          <ul className="space-y-2" aria-label="Product candidates">
            {step.candidates.map((c, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => setStep({ kind: "goals", id: step.id, candidate: c, candidateIndex: i })}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-colors",
                    "border-line-strong bg-warm-white hover:border-espresso/40 hover:bg-cream",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block text-[15px] font-semibold text-espresso">{describeCandidate(c)}</span>
                    <span className="block text-sm text-espresso-soft">
                      {[c.form, c.category, c.note].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-espresso-soft" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <button type="button" onClick={() => setStep({ kind: "type" })} className="text-sm font-semibold text-espresso underline-offset-4 hover:underline">
          {none ? "Try again with the brand name" : "None of these. Let me retype it"}
        </button>
      </Card>
    );
  }

  return (
    <Card className="space-y-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-espresso-soft">Step 2 of 2</p>
      <div>
        <p className="text-sm text-espresso-soft">Looking at</p>
        <p className="font-serif text-xl font-medium text-espresso">{describeCandidate(step.candidate)}</p>
      </div>
      <div>
        <h2 className="font-serif text-2xl font-medium text-espresso">What are you hoping this product will do for you?</h2>
        <p className="mt-1 text-sm text-espresso-soft">Pick everything that applies. We&apos;ll judge the product against your goals, not the marketing.</p>
        <div role="group" aria-label="Your goals" className="mt-4 flex flex-wrap gap-2">
          {goalOptions.map((g) => {
            const on = selected.includes(g.key);
            return (
              <Chip key={g.key} selected={on} onClick={() => setSelected((s) => (on ? s.filter((k) => k !== g.key) : [...s, g.key]))}>
                {on && <Check className="mr-1.5 h-3.5 w-3.5" strokeWidth={2.5} />}
                {g.label}
              </Chip>
            );
          })}
        </div>
        {selected.includes("other") && (
          <div className="mt-3">
            <label htmlFor="goal-other" className="block text-sm font-semibold text-espresso">In your own words</label>
            <Input id="goal-other" value={goalOther} onChange={(e) => setGoalOther(e.target.value)} maxLength={200} placeholder="What are you hoping for?" className="mt-2" />
          </div>
        )}
      </div>
      {error && <p role="alert" className="text-sm text-rose">{error}</p>}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="button" variant="gold" size="lg" disabled={busy} icon={<Sparkles />} onClick={() => confirm(step.id, step.candidateIndex)}>
          {busy ? "Starting…" : "Let's look at it"}
        </Button>
        <button type="button" onClick={() => setStep({ kind: "type" })} className="text-sm font-semibold text-espresso underline-offset-4 hover:underline">
          Change product
        </button>
      </div>
    </Card>
  );
}

function friendlyError(code: string | undefined): string {
  switch (code) {
    case "ai_not_configured":
    case "server_not_configured":
      return "GROWN. Intelligence isn't switched on for this environment yet.";
    case "provider_refused":
      return "We couldn't look into that one. Try a different product or wording.";
    case "provider_unavailable":
      return "The research service is busy right now. Please try again in a few minutes.";
    case "invalid_query":
      return "Give us a little more to go on, like the brand and product name.";
    default:
      return "Something didn't go to plan. Please try again.";
  }
}
