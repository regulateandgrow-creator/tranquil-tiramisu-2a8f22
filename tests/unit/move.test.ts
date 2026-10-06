import { describe, expect, it } from "vitest";
import { parseMove } from "@/lib/db/validate";
import { computeFoundation } from "@/lib/foundation/compute";
import { summarizeWeek, weekSentence } from "@/lib/foundation/week";
import { moveThoughtForDay, moveThoughts } from "@/lib/demo/move";

describe("parseMove", () => {
  it("accepts nothing, empty, and a full valid shape", () => {
    expect(parseMove(undefined)).toEqual({});
    expect(parseMove({})).toEqual({});
    expect(parseMove({ kinds: ["walk", "strength"], duration: "short", strength: ["legs"] })).toEqual({ kinds: ["walk", "strength"], duration: "short", strength: ["legs"] });
  });
  it("rejects unknown keys, kinds, durations and areas, and duplicates", () => {
    expect(parseMove({ calories: 300 })).toBeNull();
    expect(parseMove({ distance_km: 5 })).toBeNull();
    expect(parseMove({ kinds: ["marathon"] })).toBeNull();
    expect(parseMove({ kinds: ["walk", "walk"] })).toBeNull();
    expect(parseMove({ duration: "90" })).toBeNull();
    expect(parseMove({ strength: ["biceps"] })).toBeNull();
    expect(parseMove({ kinds: "walk" })).toBeNull();
  });
});

describe("computeFoundation movement", () => {
  const base = { day: "2026-10-08", signals: {} as const };
  it("prefers Move taps over the signal", () => {
    expect(computeFoundation({ ...base, move: { kinds: ["walk"], duration: "few" } })[3].status).toBe("building");
    expect(computeFoundation({ ...base, move: { kinds: ["walk"], duration: "short" } })[3].status).toBe("steady");
    expect(computeFoundation({ ...base, move: { kinds: ["strength"] } })[3]).toMatchObject({ status: "steady", progress: 1 });
  });
  it("treats a rest day as progress, never a gap", () => {
    const p = computeFoundation({ ...base, move: { kinds: ["rest"] } })[3];
    expect(p.status).toBe("building");
    expect(p.detail).toMatch(/Recovery/);
  });
  it("falls back to the movement signal when nothing is tapped in Move", () => {
    expect(computeFoundation({ ...base, signals: { movement: 5 } })[3].status).toBe("steady");
    expect(computeFoundation({ ...base })[3].status).toBe("not-logged");
  });
});

describe("summarizeWeek", () => {
  const ci = (day: string, kinds: Array<"walk" | "strength" | "rest">) => ({ day, signals: {}, move: { kinds } });
  it("builds seven days ending today with counts", () => {
    const w = summarizeWeek({ "2026-10-08": ci("2026-10-08", ["walk"]), "2026-10-06": ci("2026-10-06", ["strength", "walk"]), "2026-10-05": ci("2026-10-05", ["rest"]) }, "2026-10-08");
    expect(w.days).toHaveLength(7);
    expect(w.days[6]).toMatchObject({ day: "2026-10-08", isToday: true, moved: true, strength: false });
    expect(w.days[0].day).toBe("2026-10-02");
    expect(w.movingDays).toBe(2);
    expect(w.strengthDays).toBe(1);
    expect(w.restDays).toBe(1);
    expect(weekSentence(w)).toBe("2 moving days this week · 1 with strength · 1 rest day.");
  });
  it("crosses month boundaries and speaks gently when empty", () => {
    const w = summarizeWeek({}, "2026-11-02");
    expect(w.days[0].day).toBe("2026-10-27");
    expect(weekSentence(w)).toMatch(/counts/);
    expect(/\b(streak|behind|missed|failed)\b/i.test(weekSentence(w))).toBe(false);
  });
});

describe("moveThoughtForDay", () => {
  it("is deterministic and free of banned language", () => {
    expect(moveThoughtForDay("2026-10-08")).toBe(moveThoughtForDay("2026-10-08"));
    expect(moveThoughts).toContain(moveThoughtForDay("2026-10-09"));
    expect(/\b(failed|bad|behind|cheat|guilty|lazy)\b/i.test(moveThoughts.join(" "))).toBe(false);
  });
});
