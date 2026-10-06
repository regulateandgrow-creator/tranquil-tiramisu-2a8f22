"use server";

import { createClient } from "@/lib/supabase/server";
import { updateProfile } from "@/lib/db/profile";
import { upsertCheckIn } from "@/lib/db/check-ins";
import { upsertMeeting } from "@/lib/db/meetings";
import {
  parseDayKey,
  parseFeeling,
  parseFirstName,
  parseHideWeight,
  parseIntention,
  parseLifeMode,
  parseMove,
  parseNourish,
  parseReflection,
  parseSignals,
  parseWeekStart,
} from "@/lib/db/validate";

export type SaveResult = { ok: true } | { ok: false; error: "unauthenticated" | "invalid" | "failed" };

async function requireUser() {
  const supabase = await createClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { supabase, userId: user.id };
}

export async function saveCheckInAction(input: unknown): Promise<SaveResult> {
  const session = await requireUser();
  if (!session) return { ok: false, error: "unauthenticated" };

  const raw = (input ?? {}) as Record<string, unknown>;
  const day = parseDayKey(raw.day);
  const signals = parseSignals(raw.signals ?? {});
  const nourish = parseNourish(raw.nourish);
  const move = parseMove(raw.move);
  if (!day || !signals || !nourish || !move) return { ok: false, error: "invalid" };
  const feeling = parseFeeling(raw.feeling) ?? undefined;

  try {
    await upsertCheckIn(session.supabase, session.userId, { day, feeling, signals, nourish, move });
    return { ok: true };
  } catch {
    return { ok: false, error: "failed" };
  }
}

export async function saveLifeModeAction(input: unknown): Promise<SaveResult> {
  const session = await requireUser();
  if (!session) return { ok: false, error: "unauthenticated" };
  const lifeMode = parseLifeMode(input);
  if (!lifeMode) return { ok: false, error: "invalid" };
  try {
    await updateProfile(session.supabase, session.userId, { lifeMode });
    return { ok: true };
  } catch {
    return { ok: false, error: "failed" };
  }
}

export async function saveProfileAction(input: unknown): Promise<SaveResult> {
  const session = await requireUser();
  if (!session) return { ok: false, error: "unauthenticated" };

  const raw = (input ?? {}) as Record<string, unknown>;
  const patch: { firstName?: string; hideWeight?: boolean } = {};
  if (raw.firstName !== undefined) {
    const firstName = parseFirstName(raw.firstName);
    if (!firstName) return { ok: false, error: "invalid" };
    patch.firstName = firstName;
  }
  if (raw.hideWeight !== undefined) {
    const hideWeight = parseHideWeight(raw.hideWeight);
    if (hideWeight === null) return { ok: false, error: "invalid" };
    patch.hideWeight = hideWeight;
  }
  if (Object.keys(patch).length === 0) return { ok: false, error: "invalid" };

  try {
    await updateProfile(session.supabase, session.userId, patch);
    return { ok: true };
  } catch {
    return { ok: false, error: "failed" };
  }
}

export async function saveMeetingAction(input: unknown): Promise<SaveResult> {
  const session = await requireUser();
  if (!session) return { ok: false, error: "unauthenticated" };
  const raw = (input ?? {}) as Record<string, unknown>;
  const weekStart = parseWeekStart(raw.weekStart);
  if (!weekStart) return { ok: false, error: "invalid" };
  const intention = raw.intention === undefined || raw.intention === null ? undefined : parseIntention(raw.intention);
  const reflection = raw.reflection === undefined || raw.reflection === null ? undefined : parseReflection(raw.reflection);
  if (intention === null || reflection === null) return { ok: false, error: "invalid" };
  try {
    await upsertMeeting(session.supabase, session.userId, { weekStart, ...(intention ? { intention } : {}), ...(reflection ? { reflection } : {}) });
    return { ok: true };
  } catch {
    return { ok: false, error: "failed" };
  }
}
