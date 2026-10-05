import type { ReactNode } from "react";
import { Sidebar } from "@/components/navigation/Sidebar";
import { BottomNav } from "@/components/navigation/BottomNav";
import { MobileHeader } from "@/components/navigation/MobileHeader";
import type { CurrentUser } from "@/lib/auth/current-user";
import { DayStoreProvider } from "@/lib/store/day-store";
import type { StoreBootstrap } from "@/lib/store/bootstrap";

export function AppShell({
  user,
  bootstrap,
  children,
}: {
  user: CurrentUser;
  bootstrap: StoreBootstrap;
  children: ReactNode;
}) {
  return (
    <DayStoreProvider mode={bootstrap.mode} initial={bootstrap.initial}>
      <div className="flex min-h-screen w-full">
        <Sidebar user={user} />
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileHeader />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-28 sm:px-6 lg:px-10 lg:pt-10 lg:pb-16">
            {children}
          </main>
        </div>
        <BottomNav />
      </div>
    </DayStoreProvider>
  );
}
