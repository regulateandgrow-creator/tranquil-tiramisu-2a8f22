import { PagePlaceholder } from "@/components/layout/PagePlaceholder";
import { Card } from "@/components/ui/Card";
import { SignOutButton } from "@/components/navigation/SignOutButton";
import { getCurrentUser } from "@/lib/auth/current-user";

export const metadata = { title: "Settings" };

export default async function Page() {
  const user = await getCurrentUser();
  return (
    <div className="space-y-6">
      <PagePlaceholder
        eyebrow="Your rules"
        title="Settings"
        description="Account, privacy, and display preferences, including the option to hide weight entirely."
        milestone="Milestone 2"
      />
      <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-espresso-soft">Account</p>
          <p className="mt-1 text-[15px] font-semibold text-espresso">{user.firstName}</p>
          <p className="text-sm text-espresso-soft">
            {user.mode === "demo" ? "Demo account. Sign-in arrives once accounts are connected." : user.email}
          </p>
        </div>
        {user.mode === "live" && <SignOutButton />}
      </Card>
    </div>
  );
}
