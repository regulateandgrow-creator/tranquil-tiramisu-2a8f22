"use client";

import { useActionState } from "react";
import { MailCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { sendMagicLink, type SignInState } from "./actions";

const initial: SignInState = { status: "idle" };

export function SignInForm() {
  const [state, action, pending] = useActionState(sendMagicLink, initial);

  if (state.status === "sent") {
    return (
      <div className="animate-fade" aria-live="polite">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sage-soft text-espresso">
          <MailCheck className="h-6 w-6" strokeWidth={1.75} />
        </span>
        <h2 className="mt-4 font-serif text-2xl font-medium text-espresso">Check your email</h2>
        <p className="mt-2 text-[15px] text-espresso-soft">
          We sent a sign-in link to <span className="font-semibold text-espresso">{state.email}</span>.
          Open it on this device and you&apos;re in. No password needed.
        </p>
        <form action={action} className="mt-6">
          <input type="hidden" name="email" value={state.email} />
          <p className="text-sm text-espresso-soft">
            Didn&apos;t arrive? Check your spam folder, or{" "}
            <button type="submit" disabled={pending} className="font-semibold text-espresso underline-offset-4 hover:underline">
              send it again
            </button>
            .
          </p>
        </form>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-semibold text-espresso">
          Your email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          defaultValue={state.email ?? ""}
          aria-invalid={state.status === "error" ? true : undefined}
          aria-describedby={state.status === "error" ? "email-error" : "email-help"}
        />
        {state.status === "error" ? (
          <p id="email-error" role="alert" className="mt-2 text-sm text-rose">
            {state.message}
          </p>
        ) : (
          <p id="email-help" className="mt-2 text-sm text-espresso-soft">
            We&apos;ll email you a link that signs you in. No password to remember.
          </p>
        )}
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={pending} icon={<ArrowRight />}>
        {pending ? "Sending your link…" : "Send me a sign-in link"}
      </Button>
    </form>
  );
}
