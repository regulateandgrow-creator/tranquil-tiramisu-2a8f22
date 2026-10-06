import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { SignOutButton } from "@/components/navigation/SignOutButton";
import { MoreLinks } from "@/components/navigation/MoreLinks";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getStoreBootstrap } from "@/lib/store/bootstrap";
import { SettingsForm } from "./SettingsForm";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const { mode } = await getStoreBootstrap(user);

  return (
    <div className="animate-rise space-y-6">
      <SectionHeading
        as="h1"
        eyebrow="Your rules"
        title="Settings"
        description="How we greet you, what stays private, and your account."
      />

      <SettingsForm mode={mode} />

      <MoreLinks />

      <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-espresso-soft">Account</p>
          <p className="mt-1 text-[15px] text-espresso">
            {mode === "demo" ? "Demo account. Sign-in arrives once accounts are connected." : user.email}
          </p>
        </div>
        {mode === "live" && <SignOutButton />}
      </Card>

      <Card tone="gold">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-espresso">What we keep</p>
        <ul className="mt-3 space-y-1.5 text-[15px] text-espresso-soft">
          <li>Your first name and your Hide weight preference.</li>
          <li>Your daily check-in: how you feel and the seven body signals.</li>
          <li>Your Life Is Lifing mode.</li>
        </ul>
        <p className="mt-3 text-sm text-espresso-soft">
          That&apos;s all. Nothing else is collected in this version, and nothing is shared.
        </p>
      </Card>
    </div>
  );
}
