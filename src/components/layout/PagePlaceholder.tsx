import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Badge } from "@/components/ui/Badge";

interface PagePlaceholderProps {
  eyebrow: string;
  title: string;
  description: string;
  milestone: string;
  children?: ReactNode;
}

/** Gentle "coming soon" page for routes outside Milestone 1. */
export function PagePlaceholder({ eyebrow, title, description, milestone, children }: PagePlaceholderProps) {
  return (
    <div className="animate-rise space-y-6">
      <SectionHeading as="h1" eyebrow={eyebrow} title={title} description={description} />
      <Card tone="gold" className="flex flex-col items-start gap-3">
        <Badge tone="gold">Coming in {milestone}</Badge>
        <p className="max-w-prose text-[15px] text-espresso-soft">
          This space is reserved. For now, the Home dashboard is where everything lives.
        </p>
        {children}
      </Card>
    </div>
  );
}
