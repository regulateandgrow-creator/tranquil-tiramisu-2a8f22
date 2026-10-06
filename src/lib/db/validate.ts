import type { BodySignalKey, DayMove, DayNourish, LifeMode, MealSlot, MealTag, MoveDuration, MoveKind, SignalLevel, StrengthArea } from "@/lib/demo/types";
import { feelingOptions, signalDefinitions } from "@/lib/demo/signals";
import { lifeModes } from "@/lib/demo/modes";
import { mealSlots, mealTags, PLANTS_MAX, WATER_MAX } from "@/lib/demo/nourish";
import { moveDurations, moveKinds, strengthAreas } from "@/lib/demo/move";

/**
 * Input validation for everything that reaches the database.
 * Deliberately strict: only the approved fields and values get through.
 */

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const SIGNAL_KEYS = new Set<string>(signalDefinitions.map((s) => s.key));
const LIFE_MODES = new Set<string>(lifeModes.map((m) => m.key));
const FEELINGS = new Set<string>(feelingOptions);

export function parseDayKey(value: unknown): string | null {
  if (typeof value !== "string" || !DAY_RE.test(value)) return null;
  const d = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : value;
}

/** Feelings are chips, not free text, so only known options are stored. */
export function parseFeeling(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  return typeof value === "string" && FEELINGS.has(value) ? value : null;
}

export function parseSignals(value: unknown): Partial<Record<BodySignalKey, SignalLevel>> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const out: Partial<Record<BodySignalKey, SignalLevel>> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!SIGNAL_KEYS.has(key)) return null;
    if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 1 || raw > 5) return null;
    out[key as BodySignalKey] = raw as SignalLevel;
  }
  return out;
}

const MEAL_SLOTS = new Set<string>(mealSlots.map((m) => m.key));
const MEAL_TAGS = new Set<string>(mealTags.map((t) => t.key));

function parseCount(raw: unknown, max: number): number | null | undefined {
  if (raw === undefined) return undefined;
  if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 0 || raw > max) return null;
  return raw;
}

/** Nourish: plant servings, glasses of water and meal tags from the fixed vocabulary. Empty object allowed. */
export function parseNourish(value: unknown): DayNourish | null {
  if (value === undefined || value === null) return {};
  if (typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  for (const key of Object.keys(raw)) if (!["plants", "water", "meals"].includes(key)) return null;
  const out: DayNourish = {};
  const plants = parseCount(raw.plants, PLANTS_MAX);
  const water = parseCount(raw.water, WATER_MAX);
  if (plants === null || water === null) return null;
  if (plants !== undefined) out.plants = plants;
  if (water !== undefined) out.water = water;
  if (raw.meals !== undefined) {
    if (!raw.meals || typeof raw.meals !== "object" || Array.isArray(raw.meals)) return null;
    const meals: Partial<Record<MealSlot, MealTag[]>> = {};
    for (const [slot, tags] of Object.entries(raw.meals as Record<string, unknown>)) {
      if (!MEAL_SLOTS.has(slot) || !Array.isArray(tags)) return null;
      const seen = new Set<string>();
      for (const t of tags) {
        if (typeof t !== "string" || !MEAL_TAGS.has(t) || seen.has(t)) return null;
        seen.add(t);
      }
      meals[slot as MealSlot] = [...seen] as MealTag[];
    }
    out.meals = meals;
  }
  return out;
}

const MOVE_KINDS = new Set<string>(moveKinds.map((k) => k.key));
const MOVE_DURATIONS = new Set<string>(moveDurations.map((d) => d.key));
const STRENGTH_AREAS = new Set<string>(strengthAreas.map((a) => a.key));

function parseUniqueList<T extends string>(raw: unknown, allowed: Set<string>): T[] | null {
  if (!Array.isArray(raw)) return null;
  const seen = new Set<string>();
  for (const t of raw) {
    if (typeof t !== "string" || !allowed.has(t) || seen.has(t)) return null;
    seen.add(t);
  }
  return [...seen] as T[];
}

/** Move: movement kinds, a rough duration band and strength areas, all from fixed vocabularies. */
export function parseMove(value: unknown): DayMove | null {
  if (value === undefined || value === null) return {};
  if (typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  for (const key of Object.keys(raw)) if (!["kinds", "duration", "strength"].includes(key)) return null;
  const out: DayMove = {};
  if (raw.kinds !== undefined) {
    const kinds = parseUniqueList<MoveKind>(raw.kinds, MOVE_KINDS);
    if (!kinds) return null;
    out.kinds = kinds;
  }
  if (raw.duration !== undefined) {
    if (typeof raw.duration !== "string" || !MOVE_DURATIONS.has(raw.duration)) return null;
    out.duration = raw.duration as MoveDuration;
  }
  if (raw.strength !== undefined) {
    const strength = parseUniqueList<StrengthArea>(raw.strength, STRENGTH_AREAS);
    if (!strength) return null;
    out.strength = strength;
  }
  return out;
}

export function parseLifeMode(value: unknown): LifeMode | null {
  return typeof value === "string" && LIFE_MODES.has(value) ? (value as LifeMode) : null;
}

/** First name: trimmed, 1–60 visible characters, no control characters. */
export function parseFirstName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  if (cleaned.length < 1 || cleaned.length > 60) return null;
  return cleaned;
}

export function parseHideWeight(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}
