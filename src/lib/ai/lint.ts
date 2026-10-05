import { VERDICT_PHRASES, type PersonalAnalysis } from "./schemas";
import { findWeightViolationsDeep } from "@/lib/preferences/weight-policy";

/**
 * Language backstop for the personal analysis. The schema already fixes the
 * verdict phrases; this catches tone and safety slips in free text.
 */

const BANNED: Array<{ id: string; re: RegExp }> = [
  { id: "verdict-buy", re: /\b(don'?t buy|do not buy|buy it|must[- ]buy|skip it|avoid it at all costs)\b/i },
  { id: "shame", re: /\b(you failed|you'?re behind|bad choice|cheat(ed|ing)? on|guilty|lazy|over limit)\b/i },
  { id: "medication-directive", re: /\b(stop taking|start taking|discontinue|increase your (dose|medication)|replace your (medication|prescription))\b/i },
  // Assertive diagnosis only. Conditional cautions ("if you have a thyroid condition…") are good practice, not diagnosis.
  { id: "diagnosis", re: /\b(?<!\bif )(?<!\bwhether )(?<!\bunless )(?<!\bwhen )(?<!\bshould )(?<!\banyone who )(you (clearly |probably |likely |definitely )?have (a|an) [a-z ]*(deficiency|condition|disorder|disease)|this (will|is going to) (cure|fix|heal))\b/i },
  { id: "promise", re: /\b(guaranteed|clinically proven to|you will (see|get|have) results)\b/i },
];

export interface LintIssue {
  id: string;
  excerpt: string;
}

function strings(value: unknown): string[] {
  const out: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === "string") out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v as Record<string, unknown>).forEach(walk);
  };
  walk(value);
  return out;
}

export function lintAnalysis(analysis: PersonalAnalysis, hideWeight: boolean): LintIssue[] {
  const issues: LintIssue[] = [];
  const text = strings(analysis).join("\n");

  for (const { id, re } of BANNED) {
    const m = text.match(re);
    if (m && m.index !== undefined) issues.push({ id, excerpt: text.slice(Math.max(0, m.index - 30), m.index + m[0].length + 30) });
  }

  const verdicts = [
    analysis.moneyTest.premiumAssessment,
    ...analysis.goalFit.map((g) => g.verdict),
    ...Object.values(analysis.grownTake).map((v) => v.verdict),
  ];
  for (const v of verdicts) {
    if (!(VERDICT_PHRASES as readonly string[]).includes(v)) issues.push({ id: "verdict-phrase", excerpt: v });
  }

  if (!analysis.consideredNoProduct) issues.push({ id: "no-product-not-considered", excerpt: "consideredNoProduct=false" });
  if (analysis.cautions.length === 0) issues.push({ id: "missing-cautions", excerpt: "cautions=[]" });

  if (hideWeight) {
    for (const v of findWeightViolationsDeep(analysis)) issues.push({ id: `weight:${v.id}`, excerpt: v.excerpt });
  }
  return issues;
}
