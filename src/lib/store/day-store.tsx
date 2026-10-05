"use client";

import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import type { BodySignalKey, DayCheckIn, LifeMode, SignalLevel } from "@/lib/demo/types";
import { dayKey } from "@/lib/utils/date";
import { saveCheckInAction, saveLifeModeAction, saveProfileAction, type SaveResult } from "./actions";

/**
 * Day store
 * ---------
 * One client-side store for today's check-in, the Life Is Lifing™ mode and
 * the profile preferences (first name, Hide Weight Entirely).
 *
 *  - demo mode: state lives in localStorage on this device only.
 *  - live mode: state is seeded from the database by the server layout and
 *    every change is saved through server actions (debounced, with retries).
 *    Nothing is written to localStorage, so no wellness data stays on a
 *    shared device after sign-out.
 */

export type StoreMode = "demo" | "live";
export type SyncStatus = "idle" | "saving" | "error";

export interface ProfilePrefs {
  firstName: string;
  /** Hide Weight Entirely. Product-level preference, default true. */
  hideWeight: boolean;
}

export interface DayState {
  profile: ProfilePrefs;
  mode: LifeMode;
  checkIns: Record<string, DayCheckIn>;
  sync: SyncStatus;
}

export interface DayStoreInitial {
  profile: ProfilePrefs;
  mode: LifeMode;
  checkIns: Record<string, DayCheckIn>;
}

const STORAGE_KEY = "grown.day-store.v1";

/* ── persistence ───────────────────────────────────────────── */

interface Store {
  subscribe(l: () => void): () => void;
  getSnapshot(): DayState;
  getServerSnapshot(): DayState;
  update(fn: (s: DayState) => DayState, touched: Touched): void;
}

type Touched = { profile?: true; mode?: true; checkInDay?: string };

function readLocal(fallback: DayState): DayState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<DayStoreInitial>;
    return {
      ...fallback,
      profile: { ...fallback.profile, ...(parsed.profile ?? {}) },
      mode: parsed.mode ?? fallback.mode,
      checkIns: parsed.checkIns ?? fallback.checkIns,
    };
  } catch {
    return fallback;
  }
}

function writeLocal(state: DayState) {
  try {
    const { profile, mode, checkIns } = state;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ profile, mode, checkIns }));
  } catch {
    /* private mode or full storage; the app keeps working in memory */
  }
}

const RETRY_DELAYS_MS = [1000, 3000, 8000];
const DEBOUNCE_MS = 400;

function createStore(mode: StoreMode, initial: DayStoreInitial): Store {
  const serverState: DayState = { ...initial, sync: "idle" };
  let state: DayState = serverState;
  let loadedLocal = false;
  const listeners = new Set<() => void>();

  // Per-key save pipeline. A "runner" always reads the *current* state when it
  // executes, so retries and coalesced saves never send something stale, and
  // saves for one key run strictly one after another so they cannot land out
  // of order on the server.
  const runners = new Map<string, () => Promise<SaveResult>>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const dirty = new Set<string>();
  const inFlight = new Set<string>();

  const emit = () => listeners.forEach((l) => l());

  const setSync = (sync: SyncStatus) => {
    if (state.sync === sync) return;
    state = { ...state, sync };
    emit();
  };

  const attemptWithRetries = async (run: () => Promise<SaveResult>): Promise<boolean> => {
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      try {
        const result = await run();
        if (result.ok) return true;
        if (result.error !== "failed") return false; // invalid / unauthenticated: retrying won't help
      } catch {
        /* network hiccup: fall through to retry */
      }
      if (attempt < RETRY_DELAYS_MS.length) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
      }
    }
    return false;
  };

  const flush = async (key: string) => {
    if (inFlight.has(key)) return; // the running loop will pick up the dirty flag
    inFlight.add(key);
    setSync("saving");
    let ok = true;
    while (dirty.has(key)) {
      dirty.delete(key);
      const run = runners.get(key);
      if (!run) break;
      ok = await attemptWithRetries(run);
      if (!ok) break; // leave it for the next user action to retry
    }
    inFlight.delete(key);
    if (!ok) setSync("error");
    else if (inFlight.size === 0) setSync("idle");
  };

  const schedule = (key: string, run: () => Promise<SaveResult>) => {
    runners.set(key, run);
    dirty.add(key);
    const existing = timers.get(key);
    if (existing) clearTimeout(existing);
    timers.set(
      key,
      setTimeout(() => {
        timers.delete(key);
        void flush(key);
      }, DEBOUNCE_MS),
    );
  };

  const persist = (next: DayState, touched: Touched) => {
    if (mode === "demo") {
      writeLocal(next);
      return;
    }
    if (touched.profile) {
      schedule("profile", () => {
        const { firstName, hideWeight } = state.profile;
        return saveProfileAction({ firstName, hideWeight });
      });
    }
    if (touched.mode) {
      schedule("mode", () => saveLifeModeAction(state.mode));
    }
    if (touched.checkInDay) {
      const day = touched.checkInDay;
      schedule(`check-in:${day}`, () => {
        const checkIn = state.checkIns[day] ?? { day, signals: {} };
        return saveCheckInAction({ day, feeling: checkIn.feeling ?? null, signals: checkIn.signals });
      });
    }
  };

  return {
    subscribe(l) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getSnapshot() {
      if (mode === "demo" && !loadedLocal && typeof window !== "undefined") {
        state = readLocal(state);
        loadedLocal = true;
      }
      return state;
    },
    getServerSnapshot() {
      return serverState;
    },
    update(fn, touched) {
      state = fn(this.getSnapshot());
      emit();
      persist(state, touched);
    },
  };
}

/* ── React wiring ──────────────────────────────────────────── */

const StoreContext = createContext<Store | null>(null);

export function DayStoreProvider({
  mode,
  initial,
  children,
}: {
  mode: StoreMode;
  initial: DayStoreInitial;
  children: ReactNode;
}) {
  const [store] = useState(() => createStore(mode, initial));
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export interface DayStoreValue {
  today: string;
  profile: ProfilePrefs;
  setProfile: (patch: Partial<ProfilePrefs>) => void;
  mode: LifeMode;
  setMode: (mode: LifeMode) => void;
  checkIn: DayCheckIn;
  setFeeling: (feeling: string | undefined) => void;
  setSignal: (key: BodySignalKey, level: SignalLevel | undefined) => void;
  loggedCount: number;
  sync: SyncStatus;
}

export function useDayStore(): DayStoreValue {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useDayStore must be used inside <DayStoreProvider>");

  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  const today = useMemo(() => dayKey(new Date()), []);
  const checkIn: DayCheckIn = snapshot.checkIns[today] ?? { day: today, signals: {} };

  const setProfile = useCallback(
    (patch: Partial<ProfilePrefs>) =>
      store.update((s) => ({ ...s, profile: { ...s.profile, ...patch } }), { profile: true }),
    [store],
  );

  const setMode = useCallback(
    (mode: LifeMode) => store.update((s) => ({ ...s, mode }), { mode: true }),
    [store],
  );

  const updateCheckIn = useCallback(
    (fn: (c: DayCheckIn) => DayCheckIn) =>
      store.update(
        (s) => {
          const current = s.checkIns[today] ?? { day: today, signals: {} };
          return { ...s, checkIns: { ...s.checkIns, [today]: fn(current) } };
        },
        { checkInDay: today },
      ),
    [store, today],
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
    profile: snapshot.profile,
    setProfile,
    mode: snapshot.mode,
    setMode,
    checkIn,
    setFeeling,
    setSignal,
    loggedCount: Object.keys(checkIn.signals).length,
    sync: snapshot.sync,
  };
}
