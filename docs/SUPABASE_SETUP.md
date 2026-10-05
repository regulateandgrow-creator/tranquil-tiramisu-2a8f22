# Connecting accounts (Supabase) — founder walkthrough

Takes about ten minutes. Until this is done, GROWN. runs in **demo mode** with the fictional demo user.

## 1. Create the project

1. Go to https://supabase.com and sign in (GitHub login is fine).
2. **New project** → name it `grown` → choose a strong database password (save it in your password manager) → pick the region closest to your users → **Create**.
3. Wait for the project to finish provisioning (about two minutes).

## 2. Copy the two public values

In the project: **Settings → API** (or **Project Settings → API Keys**).

- **Project URL** → this is `NEXT_PUBLIC_SUPABASE_URL`
- **anon / public key** (newer projects call it the **publishable** key, starting `sb_publishable_`) → this is `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Both are safe to expose to the browser. Do **not** copy the `service_role` / secret key into anything that starts with `NEXT_PUBLIC_`.

## 3. Tell Supabase where the app lives

**Authentication → URL Configuration**

- **Site URL:** `http://localhost:3000` while developing. Change to your real domain when deployed.
- **Redirect URLs:** add `http://localhost:3000/auth/confirm` (and later `https://your-domain.com/auth/confirm`).

## 4. Point the magic-link email at the app

**Authentication → Email Templates → Magic Link**

Replace the link in the template body with:

```html
<h2>Your GROWN. sign-in link</h2>
<p>Tap the link below to sign in. It works once and expires soon.</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Sign in to GROWN.</a></p>
```

Keep the subject plain, for example `Your GROWN. sign-in link`. No marketing copy in this milestone.

Do the same for the **Confirm signup** template if it is enabled, using `type=email` as well. (Magic link signs up new users automatically, so most projects only need the Magic Link template.)

## 5. Paste the values into the app

In the project folder, copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxx   (or the long eyJ… anon key)
```

Restart `npm run dev`. The app now requires sign-in and the demo account disappears.

## 6. Try it

1. Open http://localhost:3000 → you are sent to **Sign in**.
2. Enter your email → **Send me a sign-in link**.
3. Open the email, tap the link → you land on Home, greeted by name.
4. The sidebar (desktop) or Settings (mobile) has **Sign out**.

## Things to know during private beta

- Supabase's built-in email service is limited to a small number of emails per hour on free projects, and one link per minute per address. That is enough for a handful of testers. Before inviting more people, connect a real email provider under **Authentication → SMTP Settings** (Resend, Postmark, and others have free tiers).
- The first name shown after sign-in comes from the email address until Stage 2 adds a profile where she can set it.
- Nothing is stored in the database yet. Stage 2 adds the tables and the per-row security rules.
