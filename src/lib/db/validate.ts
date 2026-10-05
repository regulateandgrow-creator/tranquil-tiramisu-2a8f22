import type { BodySignalKey, LifeMode, SignalLevel } from "@/lib/demo/types";
import { feelingOptions, signalDefinitions } from "@/lib/demo/signals";
import { lifeModes } from "@/lib/demo/modes";

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
