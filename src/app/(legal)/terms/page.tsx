import { LegalPage, LegalSection, SupportLine } from "@/components/legal/Legal";

export const metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <LegalPage eyebrow="Plain terms" title="Terms of use" intro="Short, because the important parts are short. Using GROWN. means you agree with them." updated="October 2026">
      <LegalSection title="What GROWN. is">
        <p>GROWN.™ is a healthy-aging literacy platform for women 40 and over. It helps you learn your body, learn your food, and learn what is worth your money.</p>
        <p><strong>It is not medical advice.</strong> GROWN. does not diagnose, treat, or prescribe, and it never tells you to start or stop a medication or supplement. Everything it produces, including GROWN. Intelligence Breakdowns and Works For Me patterns, is information to bring to your own judgement and, where it matters, to your clinician.</p>
      </LegalSection>

      <LegalSection title="Associations, not causes">
        <p>Works For Me and the Weekly Body Meeting describe what has tended to show up alongside what in your own logs. They are never statements that one thing caused another, and they are not a basis for medical decisions.</p>
      </LegalSection>

      <LegalSection title="GROWN. Intelligence">
        <p>Product research is assembled from public sources by an AI model and checked against rules we wrote, including that every cited source was actually found during that research. It can still be incomplete or wrong. Prices are observed on a date and change. Treat a Breakdown as a well-read friend&apos;s take, not a guarantee, and check the label and the price before you buy.</p>
        <p>Analyses are limited per day so the service stays fair and affordable. The limit is shown in the app.</p>
      </LegalSection>

      <LegalSection title="Your account">
        <ul>
          <li>You need to be an adult to use GROWN.</li>
          <li>Sign-in is by email link. Keep your email account secure; anyone with access to it can sign in as you.</li>
          <li>You can delete your account at any time from Settings. Deletion is immediate and permanent.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Fair use">
        <p>Use GROWN. for yourself. Do not try to access another member&apos;s data, overload the service, or feed it content that is not yours to share. We may pause an account that does.</p>
      </LegalSection>

      <LegalSection title="Availability and changes">
        <p>GROWN. is young and will change. Features may be added, changed, or removed, and the service may be unavailable at times. If we ever retire GROWN., you will be told in advance and given a way to take your data with you.</p>
      </LegalSection>

      <LegalSection title="Liability">
        <p>GROWN. is provided as is. To the extent the law allows, we are not liable for decisions you make based on it. Nothing here limits rights the law gives you that cannot be limited.</p>
        <SupportLine />
      </LegalSection>
    </LegalPage>
  );
}
