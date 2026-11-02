# Supabase setup (one-time, done by the maintainer)

This is what the project owner does in the Supabase dashboard. Nothing here needs code.
Supabase renames menus from time to time; if a name below doesn't match exactly, look for
the closest one.

## 1. Create the project

1. Sign up at <https://supabase.com> (GitHub sign-in is fine) and create an organization
   (personal, Free plan).
2. **New project**:
   - Name: `fut-academy-stats`.
   - Database password: generate a strong one and keep it in a password manager. The app
     never uses it.
   - **Region: an EU region** (e.g. Frankfurt or Ireland), because the data includes
     children's names.
   - Plan: Free.

## 2. Make sign-in invite-only

In **Authentication → Sign In / Providers** (or **Authentication → Settings**):

- Turn **off** "Allow new users to sign up". Nobody can create an account on their own any more.
- Keep the **Email** provider enabled.
- Leave other providers (Google, Apple, …) off for now.

## 3. Send a 6-digit code instead of a link

The app signs people in with a code typed into the app. On iPhone, a link would open in
Safari instead of the home-screen app.

In **Authentication → Emails → Templates → Magic Link** (also used for sign-in codes),
replace the body with something like:

```html
<h2>Fut Academy Stats</h2>
<p>O teu código de acesso / Your sign-in code:</p>
<p style="font-size:28px;font-weight:bold;letter-spacing:4px">{{ .Token }}</p>
<p>Válido durante 1 hora. / Valid for 1 hour.</p>
```

Subject, for example: `Código de acesso Fut Academy Stats`.

If there is an "Email OTP length" setting, set it to **6**. Expiry: 3600 seconds (1 hour) is fine.

## 4. Site URL

In **Authentication → URL Configuration**:

- Site URL: `https://danimagb.github.io/fut-academy-stats/`
- Additional redirect URLs: the same URL (needed later for Google/Apple sign-in, if ever added).

## 5. Email sending (needed before inviting other coaches)

Supabase's built-in email service is only for testing: it sends very few emails per hour and
may only deliver to the addresses of your Supabase organization's members. That's enough
for you to sign in yourself, but **not for invited coaches**.

Before step 6 of the plan (invites), set up a free SMTP provider (e.g. Resend or Brevo):
create an account there, verify a sender address or domain, and enter its SMTP details in
**Authentication → Emails → SMTP Settings**.

## 6. Create the database tables

1. Open **SQL Editor → New query**.
2. Paste the whole content of `supabase/migrations/20261102000000_cloud_sync_schema.sql`
   from this repo and click **Run**. It should finish with "Success. No rows returned".
3. Check in **Table Editor** that `teams`, `team_members`, `players`, `games` and `ping`
   exist and each shows RLS as enabled.

(With the Supabase CLI you could instead run `supabase link` and `supabase db push`.)

## 7. Create your own user

In **Authentication → Users → Add user → Create new user**:

- Email: your email.
- Tick **Auto confirm user**. A password isn't needed: you'll sign in with a code.

You'll become a team's director automatically when you upload or create that team from the app.

## 8. Send the app's connection details

In **Project Settings → API Keys** (or **Settings → API**), copy:

- the **Project URL** (`https://<something>.supabase.co`);
- the **publishable key** (`sb_publishable_…`), or, on older projects, the **anon public** key.

Both are **meant to be public**: they go into the app's `config.js` and anyone can see them.
Access is protected by the database's Row Level Security rules.

**Never share or commit the `secret` / `service_role` key** or the database password. Those
give full access and bypass all the rules.
