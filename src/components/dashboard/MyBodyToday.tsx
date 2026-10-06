"use client";

import { SectionHeading } from "@/components/ui/SectionHeading";
import { SignalCard } from "@/components/dashboard/SignalCard";
import { signalDefinitions } from "@/lib/demo/signals";
import { useDayStore } from "@/lib/store/day-store";

export function MyBodyToday() {
  const { loggedCount, sync } = useDayStore();
  const total = signalDefinitions.length;

  return (
    <section className="space-y-4">
      <SectionHeading
        eyebrow="Check-in"
        title="My Body Today"
        description="A quick read on how you're feeling. Tap a bar. Skip anything you like."
        action={
          <span className="rounded-pill bg-warm-white px-3 py-1.5 text-xs font-semibold text-espresso-soft border border-line">
            {loggedCount === 0 ? "Nothing logged yet" : `${loggedCount} of ${total} noted`}
          </span>
        }
      />
      {sync === "error" && (
        <p role="status" className="text-sm text-espresso-soft">
          Having trouble saving right now. Your log is safe on this screen and we&apos;ll keep trying.
        </p>
      )}
      <div className="stagger grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {signalDefinitions.map((def) => (
          <SignalCard key={def.key} def={def} />
        ))}
      </div>
    </section>
  );
}
