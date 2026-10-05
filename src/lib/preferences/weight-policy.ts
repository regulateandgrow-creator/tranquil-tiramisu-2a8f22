/**
 * Hide Weight Entirely — the global override, as code.
 *
 * When `hideWeight` is true, nothing in GROWN. may request, expose, infer,
 * repeat, or use the user's body weight: no screen, prompt, AI context, AI
 * response, recommendation, progress message, notification, or analysis.
 *
 * Three enforcement points live here:
 *   1. buildPersonalContext()  — what the AI is allowed to know about her
 *   2. weightPolicyPromptBlock() — the instruction every AI prompt carries
 *   3. findWeightViolations()  — a backstop that scans generated text
 *
 * Goal selection is a separate concept: "Body composition & weight support"
 * stays available regardless of this preference (see src/lib/ai/goals.ts).
 */

export interface PersonalContextInput {
  firstName?: string | null;
  hideWeight: boolean;
  lifeMode?: string | null;
  goals: string[];
  goalOther?: string | null;
  /** Recent non-scale signals, e.g. { energy: 3, sleep: 4 } averaged over recent days. */
  recentSignals?: Record<string, number> | null;
}

export interface PersonalContext {
  firstName: string | null;
  hideWeight: boolean;
  lifeMode: string | null;
  goals: string[];
  goalOther: string | null;
  /** Only the seven approved non-scale signals can appear here. */
  recentSignals: Record<string, number>;
}

const APPROVED_SIGNALS = new Set(["energy", "sleep", "hunger", "cravings", "digestion", "mood", "movement"]);

/**
 * The only path by which personal information reaches an AI prompt.
 * It is allow-listed: anything not on the list is dropped, so weight can never
 * ride along even if a future caller passes it by mistake.
 */
export function buildPersonalContext(input: PersonalContextInput): PersonalContext {
  const recentSignals: Record<string, number> = {};
  for (const [key, value] of Object.entries(input.recentSignals ?? {})) {
    if (APPROVED_SIGNALS.has(key) && typeof value === "number" && Number.isFinite(value)) {
      recentSignals[key] = value;
    }
  }
  return {
    firstName: input.firstName?.trim() || null,
    hideWeight: input.hideWeight,
    lifeMode: input.lifeMode ?? null,
    goals: [...input.goals],
    goalOther: input.hideWeight ? scrubWeightFromFreeText(input.goalOther) : (input.goalOther?.trim() || null),
    recentSignals,
  };
}

/** Free text she typed for "Other" may itself contain her weight; never forward it. */
export function scrubWeightFromFreeText(text: string | null | undefined): string | null {
  if (!text) return null;
  const cleaned = text
    .replace(/\b\d{2,3}(\.\d+)?\s?(lbs?|pounds?|kgs?|kilos?|kilograms?)\b/gi, "[removed]")
    .replace(/\bbmi\b[^.,;]*/gi, "[removed]")
    .trim();
  return cleaned || null;
}

/** Instruction block appended to every Intelligence prompt. */
export function weightPolicyPromptBlock(hideWeight: boolean): string {
  if (!hideWeight) {
    return [
      "WEIGHT: The user has chosen to allow weight to appear in GROWN. You still never ask for her weight,",
      "never estimate it, and never use weight as encouragement. Keep the focus on energy, strength, sleep,",
      "nutrition, mobility, digestion, and consistency.",
    ].join(" ");
  }
  return [
    "WEIGHT POLICY (global override, non-negotiable): This user has Hide Weight Entirely switched on.",
    "You must NOT request, estimate, infer, mention, repeat, or use her body weight, BMI, body size, or any",
    "scale-based number. Do not suggest weighing, 'the scale', weigh-ins, or tracking weight. Do not project",
    "weight outcomes onto her ('you could lose…'). Do not use weight-based encouragement.",
    "If her goal involves body composition or weight support, reason only with non-scale context she has",
    "explicitly provided: her stated goals, nutrition patterns, strength, movement, energy, sleep, satiety,",
    "and digestion. When summarizing research that measured body weight, describe study findings in neutral,",
    "third-person terms and never translate them into statements about her body.",
  ].join(" ");
}

/**
 * Backstop scan of generated text for scale-directed language aimed at the user.
 * Study language such as "0.5 g per kg body weight" is not flagged.
 */
const VIOLATION_PATTERNS: Array<{ id: string; re: RegExp }> = [
  { id: "asks-weight", re: /\b(what (do|does) you weigh|how much (do|does) you weigh|tell (us|me) your weight|enter your weight|your (current |body )?weight)\b/i },
  { id: "scale", re: /\b(weigh yourself|weigh-?ins?|step on (the|a) scale|on the scale|the scale (says|shows|number)|number on the scale|scale victory)\b/i },
  { id: "bmi", re: /\byour bmi\b/i },
  { id: "projects-loss", re: /\byou('ll| will| could| may| might| should)\s+(lose|drop|shed)\s+(\d+|some|a few|the)\s*(lbs?|pounds?|kgs?|kilos?|weight)\b/i },
  { id: "track-weight", re: /\b(track|log|record|monitor)(ing)? your (body )?weight\b/i },
  { id: "weight-encouragement", re: /\b(pounds|lbs|kilos|kgs?) (down|off|lost|gone)\b/i },
];

export interface WeightViolation {
  id: string;
  excerpt: string;
}

export function findWeightViolations(text: string): WeightViolation[] {
  const found: WeightViolation[] = [];
  for (const { id, re } of VIOLATION_PATTERNS) {
    const m = text.match(re);
    if (m && m.index !== undefined) {
      const start = Math.max(0, m.index - 30);
      found.push({ id, excerpt: text.slice(start, m.index + m[0].length + 30).trim() });
    }
  }
  return found;
}

/** Walks any JSON-like value and scans every string inside it. */
export function findWeightViolationsDeep(value: unknown): WeightViolation[] {
  const strings: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === "string") strings.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v as Record<string, unknown>).forEach(walk);
  };
  walk(value);
  return findWeightViolations(strings.join("\n"));
}
