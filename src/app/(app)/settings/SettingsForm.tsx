"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { Badge } from "@/components/ui/Badge";
import { useDayStore, type StoreMode } from "@/lib/store/day-store";
import { parseFirstName } from "@/lib/db/validate";

export function SettingsForm({ mode }: { mode: StoreMode }) {
  const { profile, setProfile, sync } = useDayStore();
  const [draft, setDraft] = useState(profile.firstName);
  const [nameError, setNameError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Hide the "Saved" confirmation after a moment.
  useEffect(() => {
    if (savedAt === null) return;
    const t = setTimeout(() => setSavedAt(null), 2500);
    return () => clearTimeout(t);
  }, [savedAt]);

  const onSubmitName = (e: FormEvent) => {
    e.preventDefault();
    const name = parseFirstName(draft);
    if (!name) {
      setNameError("A first name between 1 and 60 characters, please.");
      return;
    }
    setNameError(null);
    setDraft(name);
    setProfile({ firstName: name });
    setSavedAt(Date.now());
  };

  const dirty = draft.trim() !== profile.firstName;

  return (
    <div className="space-y-6">
      {/* First name */}
      <Card>
        <form onSubmit={onSubmitName} className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-espresso-soft">How we greet you</p>
            <label htmlFor="first-name" className="mt-2 block text-[15px] font-semibold text-espresso">
              First name
            </label>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <Input
                id="first-name"
                name="firstName"
                autoComplete="given-name"
                maxLength={60}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                aria-invalid={nameError ? true : undefined}
                aria-describedby={nameError ? "first-name-error" : undefined}
                className="sm:max-w-xs"
              />
              <Button type="submit" disabled={!dirty} className="sm:w-auto">
                Save name
              </Button>
            </div>
            {nameError && (
              <p id="first-name-error" role="alert" className="mt-2 text-sm text-rose">
                {nameError}
              </p>
            )}
          </div>
        </form>
      </Card>

      {/* Hide Weight Entirely */}
      <Card tone="sage">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-espresso">Your rules</p>
            <p id="hide-weight-label" className="mt-2 font-serif text-xl font-medium text-espresso">
              Hide weight entirely
            </p>
            <p id="hide-weight-help" className="mt-1.5 text-[15px] leading-relaxed text-espresso-soft">
              When this is on, GROWN. won&apos;t show weight fields, weight trends, weight prompts, or
              weight-based encouragement anywhere in the product. It&apos;s on by default, and you can change it
              any time.
            </p>
          </div>
          <Switch
            checked={profile.hideWeight}
            onChange={(next) => {
              setProfile({ hideWeight: next });
              setSavedAt(Date.now());
            }}
            labelledBy="hide-weight-label"
            describedBy="hide-weight-help"
          />
        </div>
        <p className="mt-4 text-sm text-espresso">
          {profile.hideWeight
            ? "Weight stays out of your space. Energy, sleep, strength, and how you feel lead instead."
            : "Weight may appear in future features. You can hide it again whenever you like."}
        </p>
      </Card>

      {/* Save status */}
      <div className="min-h-6 text-sm" role="status" aria-live="polite">
        {sync === "error" ? (
          <span className="text-espresso-soft">Having trouble saving right now. We&apos;ll keep trying.</span>
        ) : savedAt !== null ? (
          <span className="inline-flex items-center gap-1.5 text-espresso animate-fade">
            <Check className="h-4 w-4 text-sage" strokeWidth={2.5} />
            {mode === "live" ? "Saved to your account" : "Saved on this device"}
          </span>
        ) : null}
      </div>

      {mode === "demo" && (
        <div className="flex items-center gap-3 text-sm text-espresso-soft">
          <Badge tone="gold">Demo mode</Badge>
          Preferences save on this device until accounts are connected.
        </div>
      )}
    </div>
  );
}
