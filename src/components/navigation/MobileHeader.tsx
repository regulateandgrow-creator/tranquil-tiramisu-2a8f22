"use client";

import Link from "next/link";
import { Wordmark } from "@/components/ui/Wordmark";
import { useDayStore } from "@/lib/store/day-store";

export function MobileHeader() {
  const { profile } = useDayStore();
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-cream/85 px-5 py-3 backdrop-blur-md lg:hidden">
      <Link href="/">
        <Wordmark />
      </Link>
      <Link
        href="/settings"
        aria-label="Account and settings"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-rose-soft to-gold-soft font-serif text-base font-semibold text-espresso"
      >
        {profile.firstName[0]}
      </Link>
    </header>
  );
}
