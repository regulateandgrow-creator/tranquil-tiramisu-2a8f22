import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Wordmark } from "@/components/ui/Wordmark";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { SignInForm } from "./SignInForm";

export const metadata = { title: "Sign in" };

interface SignInPageProps {
  searchParams: Promise<{ error?: string; deleted?: string }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { error, deleted } = await searchParams;
  const live = isSupabaseConfigured();

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-10">
      {/* Soft atmosphere */}
      <div aria-hidden className="pointer-events-none absolute -top-40 -left-24 h-96 w-96 rounded-full bg-rose-soft/70 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-24 -bottom-40 h-96 w-96 rounded-full bg-gold-soft/80 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute top-1/3 right-1/4 h-64 w-64 rounded-full bg-sage-soft/70 blur-3xl animate-breathe" />

      <div className="relative w-full max-w-md animate-rise">
        <div className="mb-8 text-center">
          <Wordmark className="inline-block" />
          <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-espresso-soft">
            Healthy aging. Your body. Your rules.
          </p>
        </div>

        <Card className="p-6 sm:p-8">
          {deleted === "1" && (
            <p role="status" className="mb-5 rounded-2xl bg-sage-soft px-4 py-3 text-sm text-espresso">
              Your account and everything in it are gone. Thank you for the time you spent here.
            </p>
          )}
          {error === "link" && (
            <p role="alert" className="mb-5 rounded-2xl bg-rose-soft px-4 py-3 text-sm text-espresso">
              That sign-in link has expired or was already used. Request a fresh one below.
            </p>
          )}

          <h1 className="font-serif text-3xl font-medium leading-tight text-espresso">
            Welcome to your <span className="text-gold">private</span> wellness space.
          </h1>
          <p className="mt-2 text-[15px] text-espresso-soft">
            Learn your body. Learn your food. Learn what&apos;s worth your money.
          </p>

          <div className="mt-6">
            {live ? (
              <SignInForm />
            ) : (
              <div className="space-y-4">
                <Badge tone="gold">Demo mode</Badge>
                <p className="text-[15px] text-espresso-soft">
                  Accounts aren&apos;t connected yet. Once Supabase is set up, this screen sends an email sign-in link.
                  For now, explore with the demo account.
                </p>
                <Link href="/">
                  <Button size="lg" className="w-full" icon={<ArrowRight />}>
                    Continue in demo mode
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </Card>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-espresso-soft">
          <Sparkles className="h-3.5 w-3.5 text-gold" strokeWidth={1.75} />
          Your body is the data. Not TikTok.™
        </p>
        <p className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center text-xs text-espresso-soft">
          <span>A literacy tool, not medical advice.</span>
          <Link href="/privacy" className="font-semibold hover:text-espresso">Privacy</Link>
          <Link href="/terms" className="font-semibold hover:text-espresso">Terms</Link>
        </p>
      </div>
    </div>
  );
}
