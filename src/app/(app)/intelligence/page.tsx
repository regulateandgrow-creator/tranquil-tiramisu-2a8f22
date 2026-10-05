import { Camera, Keyboard, Link2, Sparkles, ShieldCheck, BookOpenText, Wallet } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SectionHeading } from "@/components/ui/SectionHeading";

export const metadata = { title: "GROWN. Intelligence" };

const inputs = [
  { icon: Camera, title: "Scan a product", body: "Point your camera at a label. We read the ingredients and claims." },
  { icon: Keyboard, title: "Type a product", body: "Name it, or paste the ingredient list, and we'll take a look." },
  { icon: Link2, title: "Paste a product link", body: "Drop a link and we'll pull what matters off the page." },
];

const promises = [
  { icon: BookOpenText, title: "What it actually is", body: "Plain-language explanation of ingredients and format." },
  { icon: ShieldCheck, title: "What the evidence says", body: "Cited sources. No influencer claims, no hype." },
  { icon: Wallet, title: "Worth your money?", body: "A literacy lens on price versus plausible benefit." },
];

export default function IntelligencePage() {
  return (
    <div className="animate-rise space-y-8">
      <SectionHeading
        as="h1"
        eyebrow="Consumer wellness literacy"
        title={
          <span className="inline-flex items-center gap-2">
            GROWN. Intelligence <Sparkles className="h-6 w-6 text-gold" strokeWidth={1.75} />
          </span>
        }
        description="Thinking about buying something? Let's look at it first."
      />

      <Card tone="espresso" className="space-y-3">
        <Badge tone="gold">Coming in Milestone 2</Badge>
        <p className="max-w-prose text-[15px] text-cream/80">
          The analysis engine runs on secure servers and will use Claude vision for labels, text understanding for
          ingredient lists, and web search with citations for claims. Nothing here diagnoses. Everything here teaches.
        </p>
      </Card>

      <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-3">
        {inputs.map(({ icon: Icon, title, body }) => (
          <Card key={title} hover className="flex flex-col gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gold-soft text-espresso">
              <Icon className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <p className="font-serif text-xl font-medium text-espresso">{title}</p>
            <p className="text-[15px] text-espresso-soft">{body}</p>
          </Card>
        ))}
      </div>

      <section className="space-y-4">
        <SectionHeading title="What every answer will include" />
        <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-3">
          {promises.map(({ icon: Icon, title, body }) => (
            <Card key={title} tone="sage" className="flex flex-col gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-warm-white text-espresso">
                <Icon className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <p className="font-serif text-xl font-medium text-espresso">{title}</p>
              <p className="text-[15px] text-espresso-soft">{body}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
