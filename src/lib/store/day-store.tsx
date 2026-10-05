"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { BodySignalKey, DayCheckIn, LifeMode, SignalLevel } from "@/lib/demo/types";
import { dayKey } from "@/lib/utils/date";

/**
 * Day store
 * ---------
 * Holds today's check-in and the current Life Is Lifing™ mode on the client.
 * Implemented as a tiny external store (useSyncExternalStore) so it is
 * hydration-safe: the server snapshot is the empty default, and the
 * localStorage copy is read lazily on the client.
 *
 * When Supabase auth lands, this becomes the optimistic cache in front of the DB.
 */

const STORAGE_KEY = "grown.day-store.v1";

export interface DayState {
  mode: LifeMode;
  checkIns: Record<string, DayCheckIn>;
}

const defaultState: DayState = { mode: "normal", checkIns: {} };

let state: DayState = defaultState;
let loaded = false;
const listeners = new Set<() => void>();

function readStorage(): DayState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as Partial<DayState>;
    return {
      mode: parsed.mode ?? "normal",
      checkIns: parsed.checkIns ?? {},
    };
  } catch {
    return defaultState;
  }
}

function writeStorage(next: DayState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage can be unavailable in private mode; the app still works */
  }
}

function getSnapshot(): DayState {
  if (!loaded && typeof window !== "undefined") {
    state = readStorage();
    loaded = true;
  }
  return state;
}

function getServerSnapshot(): DayState {
  return defaultState;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function update(updater: (s: DayState) => DayState) {
  state = updater(getSnapshot());
  writeStorage(state);
  listeners.forEach((l) => l());
}

/* ── public hook ─────────────────────────────────────────────── */

export interface DayStoreValue {
  today: string;
  mode: LifeMode;
  setMode: (mode: LifeMode) => void;
  checkIn: DayCheckIn;
  setFeeling: (feeling: string | undefined) => void;
  setSignal: (key: BodySignalKey, level: SignalLevel | undefined) => void;
  loggedCount: number;
}

export function useDayStore(): DayStoreValue {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const today = useMemo(() => dayKey(new Date()), []);

  const checkIn: DayCheckIn = snapshot.checkIns[today] ?? { day: today, signals: {} };

  const setMode = useCallback((mode: LifeMode) => {
    update((s) => ({ ...s, mode }));
  }, []);

  const updateCheckIn = useCallback(
    (fn: (c: DayCheckIn) => DayCheckIn) => {
      update((s) => {
        const current = s.checkIns[today] ?? { day: today, signals: {} };
        return { ...s, checkIns: { ...s.checkIns, [today]: fn(current) } };
      });
    },
    [today],
  );

  const setFeeling = useCallback(
    (feeling: string | undefined) => updateCheckIn((c) => ({ ...c, feeling })),
    [updateCheckIn],
  );

  const setSignal = useCallback(
    (key: BodySignalKey, level: SignalLevel | undefined) =>
      updateCheckIn((c) => {
        const signals = { ...c.signals };
        if (level === undefined) delete signals[key];
        else signals[key] = level;
        return { ...c, signals };
      }),
    [updateCheckIn],
  );

  return {
    today,
    mode: snapshot.mode,
    setMode,
    checkIn,
    setFeeling,
    setSignal,
    loggedCount: Object.keys(checkIn.signals).length,
  };
}
