"use client";

import { Chip } from "@/components/ui/Chip";
import { feelingOptions } from "@/lib/demo/signals";
import { useDayStore } from "@/lib/store/day-store";
import { useHydrated } from "@/lib/store/use-hydrated";
import { formatLongDate, greetingForHour } from "@/lib/utils/date";

export function Greeting({ firstName }: { firstName: string }) {
  const { checkIn, setFeeling } = useDayStore();
  const hydrated = useHydrated();

  // Resolve the date on the client so the greeting matches the user's local time.
  const now = hydrated ? new Date() : null;

  const greeting = now ? greetingForHour(now.getHours()) : "Hello";
  const dateLabel = now ? formatLongDate(now) : "";

  return (
    <section className="animate-rise">
      <p className="text-sm font-medium tracking-wide text-espresso-soft min-h-5">{dateLabel}</p>
      <h1 className="mt-1 font-serif text-[2.35rem] leading-[1.05] font-medium text-espresso sm:text-5xl">
        {greeting}, {firstName} <span aria-hidden>🌿</span>
      </h1>
      <p className="mt-2 text-lg text-espresso-soft">How are we feeling today?</p>

      <div
        role="group"
        aria-label="Today's feeling"
        className="scrollbar-none -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
      >
        {feelingOptions.map((option) => {
          const selected = checkIn.feeling === option;
          return (
            <Chip
              key={option}
              selected={selected}
              onClick={() => setFeeling(selected ? undefined : option)}
            >
              {option}
            </Chip>
          );
        })}
      </div>
      {checkIn.feeling && (
        <p className="mt-3 animate-fade text-[15px] text-espresso-soft">
          Noted. Feeling <span className="font-semibold text-espresso">{checkIn.feeling.toLowerCase()}</span> today.
          Whatever today holds, we&apos;ll work with it.
        </p>
      )}
    </section>
  );
}
