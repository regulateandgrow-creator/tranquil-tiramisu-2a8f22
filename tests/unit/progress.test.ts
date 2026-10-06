import { describe, expect, it } from "vitest";
import { describeAverage, summarizeProgress } from "@/lib/progress/summary";
import { shiftDay } from "@/lib/patterns/engine";
import type { DayCheckIn } from "@/lib/demo/types";

const TODAY = "2026-10-28";

describe("summarizeProgress", () => {
  it("is all zeros and empty strips on an empty month", () => {
    const s = summarizeProgress({}, TODAY);
    expect(s.daysLogged).toBe(0);
    expect(s.strips.energy).toHaveLength(28);
    expect(s.strips.energy.every((c) => c.level === null)).toBe(true);
    expect(s.weeks).toHaveLength(4);
    expect(s.weeks[3].days[6]).toBe(TODAY);
    expect(s.pillars.map((p) => p.logged)).toEqual([0, 0, 0, 0, 0]);
    expect(s.signalNotes.sleep).toEqual({ logged: 0, typical: null });
  });

  it("counts days, plates, moving, strength and rest, and fills strips", () => {
    const ci: Record<string, DayCheckIn> = {};
    for (let i = 0; i < 10; i++) {
      const day = shiftDay(TODAY, -i);
      ci[day] = { day, signals: { energy: i % 3 ? 4 : 2, sleep: 5 }, nourish: i < 6 ? { meals: { breakfast: ["protein"] }, plants: 4, water: 6 } : {}, move: { kinds: i % 3 === 0 ? ["rest"] : i % 3 === 1 ? ["walk", "strength"] : ["walk"], duration: "medium" } };
    }
    const s = summarizeProgress(ci, TODAY);
    expect(s.daysLogged).toBe(10);
    expect(s.plateDays).toBe(6);
    expect(s.restDays).toBe(4);
    expect(s.movingDays).toBe(6);
    expect(s.strengthDays).toBe(3);
    expect(s.strips.energy.filter((c) => c.level !== null)).toHaveLength(10);
    expect(s.strips.energy[27]).toEqual({ day: TODAY, level: 2 });
    expect(s.signalNotes.sleep).toEqual({ logged: 10, typical: "Deep & restored" });
    expect(s.signalNotes.energy.typical).toBe("Bright");
    const protein = s.pillars.find((p) => p.key === "protein")!;
    expect(protein.logged).toBe(6);
    expect(protein.building).toBe(6);
    const sleep = s.pillars.find((p) => p.key === "sleep")!;
    expect(sleep.steady).toBe(10);
    expect(s.weeks[3].averages.sleep).toBe(5);
    expect(s.weeks[0].averages.sleep).toBeNull();
    expect(s.weeks[3].logged).toBe(7);
  });

  it("names a weekly average in the signal's own words", () => {
    expect(describeAverage("energy", null)).toBe("Not logged");
    expect(describeAverage("energy", 3.4)).toBe("Steady");
    expect(describeAverage("sleep", 4.6)).toBe("Deep & restored");
    expect(describeAverage("cravings", 1.2)).toBe("None");
  });
});
