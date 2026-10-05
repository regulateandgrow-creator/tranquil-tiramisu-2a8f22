import type { AiProvider } from "../provider/types";
import { aiModels } from "../config";
import { personalAnalysisSchema, type PersonalAnalysis, type ProductDossier } from "../schemas";
import { personalizeSystem, personalizeUser } from "../prompts/personalize";
import { validateAnalysisCitations } from "../citations";
import { lintAnalysis, type LintIssue } from "../lint";
import type { PersonalContext } from "@/lib/preferences/weight-policy";
import { goalOptions } from "../goals";

/** The model sometimes returns the display label ("Skin") where the key ("skin") belongs. */
export function normalizeGoalKeys(analysis: PersonalAnalysis, selectedGoals: string[]): PersonalAnalysis {
  const byLabel = new Map(goalOptions.map((g) => [g.label.toLowerCase(), g.key]));
  const byKey = new Set(goalOptions.map((g) => g.key));
  const toKey = (g: string) => {
    const t = g.trim();
    if (byKey.has(t)) return t;
    const lower = t.toLowerCase();
    if (byLabel.has(lower)) return byLabel.get(lower)!;
    const loose = selectedGoals.find((k) => lower.includes(k) || lower.replace(/[^a-z]/g, "").includes(k.replace(/[^a-z]/g, "")));
    return loose ?? t;
  };
  return {
    ...analysis,
    whatTheEvidenceSays: analysis.whatTheEvidenceSays.map((e) => ({ ...e, goal: toKey(e.goal) })),
    goalFit: analysis.goalFit.map((g) => ({ ...g, goal: toKey(g.goal) })),
  };
}

export interface PersonalizeOutcome {
  analysis: PersonalAnalysis;
  attempts: number;
  issues: LintIssue[];          // issues on the final accepted attempt (empty when clean)
  /** Check identifiers that forced a regeneration (ids only; no user text). */
  regenerationIssueIds: string[];
  droppedCitations: string[];
  usage: { inputTokens: number; outputTokens: number };
  model: string;
  raw: Array<{ step: string; prompt: string; output: string }>;
}

export class PersonalizeRejected extends Error {
  constructor(public readonly issues: LintIssue[]) {
    super("Personal analysis failed validation twice");
    this.name = "PersonalizeRejected";
  }
}

/**
 * Produces her Breakdown from the dossier and her context. Output is checked
 * for citation integrity and language (including the weight policy). One
 * regeneration is attempted with the issues spelled out; then it fails closed.
 */
export async function personalizeAnalysis(
  provider: AiProvider,
  dossier: ProductDossier,
  ctx: PersonalContext,
  fixtureKey: string,
): Promise<PersonalizeOutcome> {
  const system = personalizeSystem(ctx.hideWeight);
  const baseUser = personalizeUser(dossier, ctx);
  const raw: PersonalizeOutcome["raw"] = [];
  let usage = { inputTokens: 0, outputTokens: 0 };
  let model = "";
  let lastIssues: LintIssue[] = [];

  for (let attempt = 1; attempt <= 2; attempt++) {
    const user =
      attempt === 1
        ? baseUser
        : `${baseUser}\n\nYOUR PREVIOUS DRAFT WAS REJECTED FOR THESE REASONS. Fix every one and return the full JSON again:\n${lastIssues
            .map((i) => `- ${i.id}: "${i.excerpt}"`)
            .join("\n")}`;
    const res = await provider.complete({
      step: "personalize",
      model: aiModels.personalize,
      system,
      user,
      jsonSchema: personalAnalysisSchema,
      maxTokens: 16000,
      effort: "high",
      fixtureKey,
    });
    usage = { inputTokens: usage.inputTokens + res.usage.inputTokens, outputTokens: usage.outputTokens + res.usage.outputTokens };
    model = res.model;
    raw.push({ step: `personalize:${attempt}`, prompt: `${system}\n\n${user}`, output: res.text });

    const { analysis, dropped } = validateAnalysisCitations(normalizeGoalKeys(res.json as PersonalAnalysis, ctx.goals), dossier);
    const issues = lintAnalysis(analysis, ctx.hideWeight);
    if (issues.length === 0) {
      return { analysis, attempts: attempt, issues: [], regenerationIssueIds: lastIssues.map((i) => i.id), droppedCitations: dropped, usage, model, raw };
    }
    lastIssues = issues;
  }
  throw new PersonalizeRejected(lastIssues);
}
