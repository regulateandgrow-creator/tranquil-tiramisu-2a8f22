import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/** Plain form POST so sign-out works without client JavaScript. */
export function SignOutButton({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <form action="/auth/sign-out" method="post" className={className}>
      <button
        type="submit"
        aria-label={compact ? "Sign out" : undefined}
        className={cn(
          "inline-flex items-center gap-2 rounded-pill text-sm font-medium text-espresso-soft transition-colors hover:text-espresso",
          compact ? "h-9 w-9 justify-center hover:bg-espresso/5" : "px-1",
        )}
      >
        <LogOut className="h-4 w-4" strokeWidth={1.75} />
        {!compact && <span>Sign out</span>}
      </button>
    </form>
  );
}
