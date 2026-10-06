import { describe, expect, it } from "vitest";
import { buildMeeting } from "@/lib/meeting/build";
import { weekStartOf } from "@/lib/demo/meeting";
import { parseIntention, parseReflection, parseWeekStart } from "@/lib/db/validate";
import type { DayCheckIn } from "@/lib/demo/types";

describe("weekStartOf", () => {
  it("returns the Monday of the week", () => {
    expect(weekStartOf("2026-10-08")).toBe("2026-10-05"); // Thursday → Monday
    expect(weekStartOf("2026-10-05")).toBe("2026-10-05");
    expect(weekStartOf("2026-10-11")).toBe("2026-10-05"); // Sunday belongs to the week starting Monday
    expect(weekStartOf("2026-11-01")).toBe("2026-10-26");
  });
});

describe("meeting validation", () => {
  it("accepts only Mondays as week starts and only the fixed chips", () => {
    expect(parseWeekStart("2026-10-05")).toBe("2026-10-05");
    expect(parseWeekStart("2026-10-06")).toBeNull();
    expect(parseWeekStart("nope")).toBeNull();
    expect(parseIntention("water_with_meals")).toBe("water_with_meals");
    expect(parseIntention("lose weight")).toBeNull();
    expect(parseReflection("partly")).toBe("partly");
    expect(parseReflection("great")).toBeNull();
  });
});

describe("buildMeeting", () => {
  const TODAY = "2026-10-08"; // Thursday
  it("is calm on an empty week", () => {
    const m = buildMeeting({}, {}, TODAY);
    expect(m.weekStart).toBe("2026-10-05");
    expect(m.label).toBe("Oct 5 – Oct 8");
    expect(m.daysSoFar).toBe(4);
    expect(m.daysNoted).toBe(0);
    expect(m.signals).toEqual([]);
    expect(m.carry).toMatch(/a single tap a day/);
    expect(m.lastWeek).toBeNull();
    expect(m.movement).toMatch(/Nothing noted this week yet/);
  });

  it("summarises the week and picks the pillar that had the least steady share", () => {
    const ci: Record<string, DayCheckIn> = {};
    for (const day of ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08"]) {
      ci[day] = { day, signals: { energy: 4, sleep: 5 }, nourish: { meals: { breakfast: ["protein"], dinner: ["protein"] }, plants: 4, water: 2 }, move: { kinds: ["walk"], duration: "short" } };
    }
    const m = buildMeeting(ci, {}, TODAY);
    expect(m.daysNoted).toBe(4);
    expect(m.signals).toEqual([{ key: "energy", label: "Energy", typical: "Bright" }, { key: "sleep", label: "Sleep", typical: "Deep & restored" }]);
    expect(m.pillars.find((p) => p.key === "hydration")).toMatchObject({ steady: 0, noted: 4 });
    expect(m.pillars.find((p) => p.key === "protein")).toMatchObject({ steady: 4, noted: 4 });
    expect(m.carry).toMatch(/let it be water/);
    expect(m.movement).toBe("4 moving days this week.");
  });

  it("asks about last week's intention and echoes the reflection reply", () => {
    const meetings = { "2026-09-28": { weekStart: "2026-09-28", intention: "daily_walk" as const } };
    const m = buildMeeting({}, meetings, TODAY);
    expect(m.lastWeek).toMatchObject({ weekStart: "2026-09-28", intentionLabel: "A walk most days" });
    expect(m.lastWeek?.reply).toBeUndefined();
    const m2 = buildMeeting({}, { "2026-09-28": { weekStart: "2026-09-28", intention: "daily_walk", reflection: "life_happened" } }, TODAY);
    expect(m2.lastWeek?.reply).toMatch(/Maintenance is progress/);
  });

  it("never uses shame or causal language", () => {
    const ci: Record<string, DayCheckIn> = {};
    for (let i = 0; i < 4; i++) { const day = `2026-10-0${5 + i}`; ci[day] = { day, signals: { energy: 2, sleep: 2 }, nourish: { meals: { lunch: ["skipped"] }, plants: 0, water: 0 }, move: { kinds: ["rest"] } }; }
    const m = buildMeeting(ci, { "2026-09-28": { weekStart: "2026-09-28", intention: "one_strength", reflection: "life_happened" } }, TODAY);
    const all = [m.carry, m.movement, m.lastWeek?.reply, ...m.signals.map((s) => s.typical), ...m.patterns.map((p) => p.text)].join(" ");
    expect(/\b(failed|bad|behind|over limit|cheat|guilty|lazy|because|caused|improve)\b/i.test(all)).toBe(false);
  });
});
