"use client";

import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useDayStore } from "@/lib/store/day-store";
import { moveDurations, moveKinds, strengthAreas } from "@/lib/demo/move";

/** What kind, roughly how long, and what strength touched. Taps only. */
export function TodaysMovement() {
  const { move, toggleMoveKind, setMoveDuration, toggleStrengthArea, sync } = useDayStore();
  const kinds = move.kinds ?? [];
  const rest = kinds.includes("rest");
  const strength = kinds.includes("strength");
  const summary = rest ? "Rest day" : kinds.length === 0 ? "Nothing noted yet" : `${kinds.length} kind${kinds.length === 1 ? "" : "s"} noted`;

  return (
    <section className="space-y-4">
      <SectionHeading
        eyebrow="Today's movement"
        title="What moved you today?"
        description="Walks, chores, dancing in the kitchen. Everyday movement counts. Strength gets its own row because after 40 it matters most."
        action={<span className="text-sm text-espresso-soft">{summary}</span>}
      />
      <Card className="space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-espresso-soft">Kind</p>
          <div className="mt-3 -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0" role="group" aria-label="Movement kinds">
            {moveKinds.map((k) => (
              <Chip key={k.key} selected={kinds.includes(k.key)} onClick={() => toggleMoveKind(k.key)}>{k.label}</Chip>
            ))}
          </div>
        </div>

        {kinds.length > 0 && !rest && (
          <div className="animate-fade">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-espresso-soft">Roughly how long</p>
            <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Roughly how long">
              {moveDurations.map((d) => {
                const selected = move.duration === d.key;
                return (
                  <Chip key={d.key} role="radio" aria-checked={selected} selected={selected} onClick={() => setMoveDuration(selected ? undefined : d.key)}>
                    {d.label}
                  </Chip>
                );
              })}
            </div>
          </div>
        )}

        {strength && (
          <div className="animate-fade">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-espresso-soft">Strength: what did you work</p>
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Strength areas">
              {strengthAreas.map((a) => (
                <Chip key={a.key} selected={(move.strength ?? []).includes(a.key)} onClick={() => toggleStrengthArea(a.key)}>{a.label}</Chip>
              ))}
            </div>
          </div>
        )}

        {rest && (
          <p className="text-[15px] text-espresso-soft animate-fade">Rest day noted. Recovery is where strength is built. Nothing else to add.</p>
        )}
      </Card>
      {sync === "error" && (
        <p className="text-sm text-rose" role="status">Having trouble saving right now. Your taps are kept here and we&apos;ll try again.</p>
      )}
    </section>
  );
}
