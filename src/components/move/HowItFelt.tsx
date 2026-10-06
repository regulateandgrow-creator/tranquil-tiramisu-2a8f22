"use client";

import { SectionHeading } from "@/components/ui/SectionHeading";
import { SignalCard } from "@/components/dashboard/SignalCard";
import { signalDefinitions } from "@/lib/demo/signals";

const movement = signalDefinitions.find((d) => d.key === "movement")!;

/** The Movement body signal, the same one as on Home. */
export function HowItFelt() {
  return (
    <section className="space-y-4">
      <SectionHeading eyebrow="How it felt" title="How much have you moved?" description="The same tap as on Home. It feeds Works For Me alongside sleep, energy and mood." />
      <div className="max-w-md"><SignalCard def={movement} /></div>
    </section>
  );
}
