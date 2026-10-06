"use client";

import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useDayStore } from "@/lib/store/day-store";
import { mealSlots, mealTags } from "@/lib/demo/nourish";

/** Four meal slots, a fixed row of tags each. Tap what was on the plate. */
export function TodaysPlate() {
  const { nourish, toggleMealTag, sync } = useDayStore();
  const meals = nourish.meals ?? {};
  const logged = mealSlots.filter((s) => (meals[s.key]?.length ?? 0) > 0).length;

  return (
    <section className="space-y-4">
      <SectionHeading
        eyebrow="Today's plate"
        title="Tap what was on the plate."
        description="No calories, no grams. A few taps per meal is all GROWN. needs to learn your patterns."
        action={<span className="text-sm text-espresso-soft">{logged} of {mealSlots.length} meals noted</span>}
      />
      <Card padded={false}>
        <ul className="divide-y divide-line">
          {mealSlots.map((slot) => {
            const tags = meals[slot.key] ?? [];
            return (
              <li key={slot.key} className="p-5 sm:p-6">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-serif text-xl font-medium text-espresso">{slot.label}</h3>
                  <span className="text-xs text-espresso-soft">{tags.length === 0 ? slot.hint : `${tags.length} noted`}</span>
                </div>
                <div className="mt-3 -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0" role="group" aria-label={`${slot.label} tags`}>
                  {mealTags.map((tag) => (
                    <Chip key={tag.key} selected={tags.includes(tag.key)} onClick={() => toggleMealTag(slot.key, tag.key)}>
                      {tag.label}
                    </Chip>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
      {sync === "error" && (
        <p className="text-sm text-rose" role="status">Having trouble saving right now. Your taps are kept here and we&apos;ll try again.</p>
      )}
    </section>
  );
}
