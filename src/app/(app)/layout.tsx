import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getStoreBootstrap } from "@/lib/store/bootstrap";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  const bootstrap = await getStoreBootstrap(user);
  return (
    <AppShell user={user} bootstrap={bootstrap}>
      {children}
    </AppShell>
  );
}
