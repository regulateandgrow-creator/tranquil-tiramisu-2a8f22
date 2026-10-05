import Link from "next/link";
import { Camera, Keyboard, Link2, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function IntelligenceHero() {
  return (
    <Card tone="espresso" className="relative overflow-hidden animate-rise" padded={false}>
      {/* Soft glow accents */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-gold/25 blur-3xl animate-breathe"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-28 -left-10 h-64 w-64 rounded-full bg-rose/20 blur-3xl"
      />

      <div className="relative p-6 sm:p-8">
        <div className="flex items-center gap-2 text-gold">
          <Sparkles className="h-5 w-5" strokeWidth={1.75} />
          <p className="text-xs font-semibold uppercase tracking-[0.2em]">GROWN. Intelligence ✨</p>
        </div>

        <h2 className="mt-4 max-w-xl font-serif text-[1.9rem] leading-[1.15] font-medium text-cream sm:text-4xl">
          Thinking about buying something?
          <br />
          <span className="text-gold">Let&apos;s look at it first.</span>
        </h2>

        <p className="mt-3 max-w-lg text-[15px] text-cream/75">
          Learn what a product actually is, what the evidence says, and whether it&apos;s worth your money.
          Literacy, not hype.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link href="/intelligence?mode=scan">
            <Button variant="gold" size="lg" icon={<Camera />} className="w-full sm:w-auto">
              Scan a product
            </Button>
          </Link>
          <Link href="/intelligence?mode=type">
            <Button variant="outline-light" size="lg" icon={<Keyboard />} className="w-full sm:w-auto">
              Type a product
            </Button>
          </Link>
          <Link
            href="/intelligence?mode=link"
            className="inline-flex h-13 items-center justify-center gap-2 rounded-pill px-3 text-[15px] font-medium text-cream/80 transition-colors hover:text-cream sm:self-center"
          >
            <Link2 className="h-[18px] w-[18px]" strokeWidth={1.75} />
            Paste a product link
          </Link>
        </div>
      </div>
    </Card>
  );
}
