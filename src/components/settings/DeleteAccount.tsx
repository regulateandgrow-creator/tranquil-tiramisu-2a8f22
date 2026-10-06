"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { StoreMode } from "@/lib/store/day-store";

const STORAGE_KEY = "grown.day-store.v1";

/** Delete my account. Live: a plain form POST the server confirms. Demo: clears this device. */
export function DeleteAccount({ mode, status }: { mode: StoreMode; status?: string }) {
  const [armed, setArmed] = useState(false);
  const router = useRouter();

  function clearDemo() {
    try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* nothing to clear */ }
    router.push("/sign-in?deleted=1");
  }

  return (
    <Card tone="rose" className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-espresso">Delete my account</p>
      <p className="max-w-prose text-[15px] text-espresso-soft">
        {mode === "demo"
          ? "Demo mode keeps your taps only on this device. Deleting clears them here."
          : "This removes your account, your check-ins, your analyses, and your meetings, immediately and permanently. Shared product facts contain nothing about you and stay."}
      </p>
      {status === "failed" && <p role="alert" className="text-sm text-espresso">We couldn&apos;t complete that just now. Nothing was deleted. Please try again in a moment.</p>}
      {status === "unavailable" && <p role="alert" className="text-sm text-espresso">Account deletion isn&apos;t switched on in this environment yet.</p>}
      {!armed ? (
        <Button type="button" variant="secondary" icon={<Trash2 />} onClick={() => setArmed(true)}>Delete my account</Button>
      ) : mode === "demo" ? (
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="primary" icon={<Trash2 />} onClick={clearDemo}>Yes, clear this device</Button>
          <Button type="button" variant="ghost" onClick={() => setArmed(false)}>Keep it</Button>
        </div>
      ) : (
        <form action="/auth/delete" method="post" className="flex flex-wrap gap-3">
          <input type="hidden" name="confirm" value="delete" />
          <Button type="submit" variant="primary" icon={<Trash2 />}>Yes, delete everything</Button>
          <Button type="button" variant="ghost" onClick={() => setArmed(false)}>Keep it</Button>
        </form>
      )}
    </Card>
  );
}
