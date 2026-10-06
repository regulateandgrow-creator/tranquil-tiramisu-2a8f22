import { LegalPage, LegalSection, SupportLine } from "@/components/legal/Legal";

export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <LegalPage eyebrow="Your body. Your rules." title="Privacy" intro="What GROWN. keeps, what it never collects, and what you can do about it. Written to be read, not scrolled past." updated="October 2026">
      <LegalSection title="What we keep">
        <p>GROWN. stores only what the features you use need. Nothing is collected because a database could hold it.</p>
        <ul>
          <li><strong>Your account:</strong> your email address, used only to send sign-in links.</li>
          <li><strong>Your preferences:</strong> your first name, your Hide weight entirely setting, and your Life Is Lifing mode.</li>
          <li><strong>Your daily check-in:</strong> a feeling chip and up to seven body signals (energy, sleep, hunger, cravings, digestion, mood, movement), each a 1 to 5 tap.</li>
          <li><strong>Nourish and Move:</strong> meal tags from a fixed list, plant servings, glasses of water, movement kinds, a rough duration, strength areas. Chips, not free text.</li>
          <li><strong>Weekly Body Meeting:</strong> one intention chip and one reflection chip per week.</li>
          <li><strong>GROWN. Intelligence:</strong> the products you looked up, the goals you chose (including anything you typed under Other), the Breakdown we produced, and your decision on each product.</li>
        </ul>
      </LegalSection>

      <LegalSection title="What we never collect">
        <ul>
          <li><strong>Your weight.</strong> There is no field for it anywhere, and the database rejects any attempt to store one. With Hide weight entirely on (the default), no screen, prompt, or AI output may ask for, show, infer, or use it.</li>
          <li>Calories, grams, distances, heart rate, photos, location, contacts, or anything from other apps.</li>
          <li><strong>Label photos.</strong> When you scan a product, the photo is read once in memory to identify the product and is never stored or logged.</li>
          <li><strong>Pages you link.</strong> When you paste a product link, we read the page once to find the product name and keep nothing else from it.</li>
        </ul>
      </LegalSection>

      <LegalSection title="How GROWN. Intelligence uses AI">
        <p>Product research and your personalized Breakdown are produced by Anthropic&apos;s Claude models, called from our servers only. Your personal context reaches a prompt through one guarded path that allows only your stated goals and the seven non-scale signals, and scrubs weight from anything you typed when Hide weight entirely is on.</p>
        <p>Product facts (what is in a product, what the evidence says, what it costs) are shared between members and contain nothing about any member. Your Breakdown is yours alone and is never shown to another member.</p>
        <p>For a short, fixed window (currently 14 days) we keep the raw prompts and outputs of each analysis so we can fix problems. After that they are deleted automatically. Our long-term records of an analysis hold only identifiers, timings, token counts, and check results, never your goals in words.</p>
      </LegalSection>

      <LegalSection title="Who else touches your data">
        <ul>
          <li><strong>Supabase</strong> hosts the database and sends sign-in emails. Every table is protected so that only you can read your own rows.</li>
          <li><strong>Anthropic</strong> processes the text of Intelligence requests to produce research and Breakdowns, as described above.</li>
          <li><strong>Our hosting provider</strong> runs the app and keeps standard server logs, which never contain your wellness details.</li>
        </ul>
        <p>We do not sell data, share it with advertisers, or use it to train anything.</p>
      </LegalSection>

      <LegalSection title="Cookies">
        <p>One session cookie keeps you signed in. There are no tracking or advertising cookies. In demo mode, with no account, your taps live only in your own browser.</p>
      </LegalSection>

      <LegalSection title="Your rights">
        <ul>
          <li><strong>See it:</strong> everything we keep about you is visible in the app, on My Body, Nourish, Move, My Products, Progress, and the Weekly Body Meeting.</li>
          <li><strong>Change it:</strong> every tap can be changed or cleared on the day it belongs to.</li>
          <li><strong>Delete it:</strong> Settings has a Delete my account button. It removes your account and everything tied to it immediately. Shared product facts, which contain nothing about you, stay.</li>
        </ul>
        <SupportLine />
      </LegalSection>

      <LegalSection title="Changes">
        <p>If what we keep changes, this page changes first, and the date above moves. We will not add a kind of data quietly.</p>
      </LegalSection>
    </LegalPage>
  );
}
