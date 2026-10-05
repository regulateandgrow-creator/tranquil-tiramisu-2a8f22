import type { ReactNode } from "react";
import { Sidebar } from "@/components/navigation/Sidebar";
import { BottomNav } from "@/components/navigation/BottomNav";
import { MobileHeader } from "@/components/navigation/MobileHeader";
import type { CurrentUser } from "@/lib/auth/current-user";

export function AppShell({ user, children }: { user: CurrentUser; children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader user={user} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-28 sm:px-6 lg:px-10 lg:pt-10 lg:pb-16">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
