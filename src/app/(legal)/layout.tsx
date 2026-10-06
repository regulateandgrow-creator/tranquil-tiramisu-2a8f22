import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Wordmark } from "@/components/ui/Wordmark";

/** Public pages: readable without an account, same calm surface as the app. */
export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-3xl animate-rise">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link href="/" aria-label="GROWN. home"><Wordmark tagline /></Link>
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-espresso-soft hover:text-espresso">
            <ArrowLeft className="h-4 w-4" /> Back to GROWN.
          </Link>
        </div>
        {children}
        <p className="mt-10 flex flex-wrap gap-x-4 gap-y-1 text-xs text-espresso-soft">
          <Link href="/privacy" className="hover:text-espresso">Privacy</Link>
          <Link href="/terms" className="hover:text-espresso">Terms</Link>
          <span>GROWN.™ is a literacy tool, not medical advice.</span>
        </p>
      </div>
    </div>
  );
}
