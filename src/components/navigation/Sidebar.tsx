"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { Wordmark } from "@/components/ui/Wordmark";
import { primaryNav, secondaryNav, type NavItem } from "./nav-config";
import type { CurrentUser } from "@/lib/auth/current-user";
import { SignOutButton } from "./SignOutButton";
import { useDayStore } from "@/lib/store/day-store";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[15px] font-medium transition-all duration-200",
        active
          ? "bg-warm-white text-espresso shadow-card"
          : "text-espresso-soft hover:bg-warm-white/60 hover:text-espresso",
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-xl transition-colors",
          active ? "bg-gold-soft text-espresso" : "bg-transparent text-espresso-soft group-hover:text-espresso",
        )}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
      </span>
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

export function Sidebar({ user }: { user: CurrentUser }) {
  const pathname = usePathname();
  const { profile } = useDayStore();
  const firstName = profile.firstName || user.firstName;

  return (
    <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-line bg-cream/70 px-5 py-7 backdrop-blur lg:flex">
      <Link href="/" className="px-2">
        <Wordmark tagline />
      </Link>

      <nav aria-label="Primary" className="mt-9 flex flex-col gap-1">
        {primaryNav.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}
      </nav>

      <p className="mt-8 mb-2 px-3.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-espresso-soft/80">
        My space
      </p>
      <nav aria-label="Secondary" className="flex flex-col gap-1">
        {secondaryNav.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
        ))}
      </nav>

      <div className="mt-auto rounded-2xl border border-line bg-warm-white/80 p-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-soft to-gold-soft font-serif text-lg font-semibold text-espresso">
            {firstName[0]}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-espresso">{firstName}</p>
            <p className="truncate text-xs text-espresso-soft">
              {user.mode === "demo" ? "Demo account" : user.email}
            </p>
          </div>
          {user.mode === "live" && <SignOutButton compact />}
        </div>
      </div>
    </aside>
  );
}
