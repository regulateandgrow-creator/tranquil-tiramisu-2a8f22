import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function LegalPage({ eyebrow, title, intro, updated, children }: { eyebrow: string; title: string; intro: string; updated: string; children: ReactNode }) {
  return (
    <article className="space-y-6">
      <SectionHeading as="h1" eyebrow={eyebrow} title={title} description={intro} />
      <p className="text-xs text-espresso-soft">Last updated {updated}.</p>
      {children}
    </article>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="space-y-3">
      <h2 className="font-serif text-2xl font-medium leading-tight text-espresso">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-espresso [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_strong]:font-semibold">{children}</div>
    </Card>
  );
}

/** Support contact, shown only when the founder has configured one. */
export function SupportLine() {
  const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
  return email ? (
    <p>Questions or requests: <a className="font-semibold underline-offset-2 hover:underline" href={`mailto:${email}`}>{email}</a>.</p>
  ) : (
    <p>Questions or requests: reply to any email you receive from GROWN., or use the address published on the sign-in page once it is set.</p>
  );
}
