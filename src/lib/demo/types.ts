/**
 * Core domain types for GROWN.™
 * These are intentionally simple so they can map 1:1 to Supabase tables later.
 */

export type LifeMode = "normal" | "maintenance" | "rebuild";

export type BodySignalKey =
  | "energy"
  | "sleep"
  | "hunger"
  | "cravings"
  | "digestion"
  | "mood"
  | "movement";

/** A 1–5 scale is used across signals so the UI stays consistent. */
export type SignalLevel = 1 | 2 | 3 | 4 | 5;

export type FoundationKey = "protein" | "fiber" | "hydration" | "movement" | "sleep";

/** Status language is deliberately non-judgmental. Never "failed" / "behind". */
export type FoundationStatus = "building" | "steady" | "needs-attention" | "not-logged";

export interface FoundationPillar {
  key: FoundationKey;
  label: string;
  status: FoundationStatus;
  /** 0–1 progress toward a personal baseline, optional when not logged. */
  progress?: number;
  detail: string;
}

export interface WorksForMeInsight {
  id: string;
  category: "meals" | "products" | "supplements" | "sleep" | "movement" | "energy" | "hunger" | "cravings" | "digestion";
  /** Always written as an association. Never causal. */
  text: string;
  confidence: "emerging" | "consistent";
  observedOver: string;
}

export interface DemoUser {
  firstName: string;
  lastName: string;
  age: number;
  timezone: string;
  /** Hide Weight Entirely — product-level preference, on by default (see CLAUDE.md) */
  hideWeight: boolean;
}

export type MealSlot = "breakfast" | "lunch" | "dinner" | "snacks";

/** Fixed vocabulary for what was on the plate. Never free text. */
export type MealTag = "protein" | "plants" | "grains" | "fats" | "fermented" | "sweet" | "drink" | "caffeine" | "skipped";

/** Nourish: taps, not counting. Plants 0–8 servings, water 0–12 glasses. */
export interface DayNourish {
  plants?: number;
  water?: number;
  meals?: Partial<Record<MealSlot, MealTag[]>>;
}

export type MoveKind = "walk" | "strength" | "stretch" | "yoga" | "cardio" | "chores" | "garden" | "dance" | "swim" | "cycle" | "rest";
export type MoveDuration = "few" | "short" | "medium" | "long";
export type StrengthArea = "legs" | "upper" | "core" | "full" | "balance";

/** Move: what kind, roughly how long, what strength touched. No distances, no calories. */
export interface DayMove {
  kinds?: MoveKind[];
  duration?: MoveDuration;
  strength?: StrengthArea[];
}

export interface DayCheckIn {
  /** Local date key YYYY-MM-DD */
  day: string;
  feeling?: string;
  signals: Partial<Record<BodySignalKey, SignalLevel>>;
  nourish?: DayNourish;
  move?: DayMove;
}
