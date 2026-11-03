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

- Turn **off** "Allow new users to sign up" and **Save**. Nobody can create an account on their
  own any more. (Without this, anyone could create an account through Supabase's sign-up
  endpoint, even though such an account would get no access to the data.)
- Keep the **Email** provider enabled.
- Leave other providers (Google, Apple, …) off for now.

## 3. Email sending (custom SMTP)

Supabase only lets you edit the email templates (step 4) once your own email sending (SMTP)
is set up. Its built-in sender is also only for testing: very few emails per hour, possibly
only to your own address. So set this up first.

**Simplest: send through your Gmail account** (no domain needed, ~500 emails/day):

1. Turn on **2-Step Verification** on your Google account (myaccount.google.com → Security).
2. Create an **app password**: myaccount.google.com → Security → **App passwords** (or search
   "App passwords" in the account settings). Name it "Supabase" and copy the 16-character
   password. It can only send email and can be revoked at any time.
3. In **Authentication → Emails → SMTP Settings**, enable custom SMTP:
   - Sender email: your Gmail address
   - Sender name: `Fut Academy Stats`
   - Host: `smtp.gmail.com`, Port: `587`
   - Username: your Gmail address
   - Password: the app password
4. If **Authentication → Rate Limits** shows an email limit, set it to about 30 per hour.

Keep the app password in Supabase only: never in the repo or the app.

Later, for a branded sender (e.g. `noreply@yourclub.pt`), get a domain and a provider such as
Resend or Brevo, and change these SMTP fields.

## 4. Send a 6-digit code instead of a link

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

The code length can be 6 or 8 digits (the app accepts 6 to 10). Expiry: 3600 seconds (1 hour)
is fine.

## 5. Site URL

In **Authentication → URL Configuration**:

- Site URL: `https://danimagb.github.io/fut-academy-stats/`
- Additional redirect URLs: the same URL (needed later for Google/Apple sign-in, if ever added).

## 6. Create the database tables

1. Open **SQL Editor → New query**.
2. Paste the whole content of `supabase/migrations/20261102000000_cloud_sync_schema.sql`
   from this repo and click **Run**. It should finish with "Success. No rows returned".
3. Check in **Table Editor** that `accounts`, `teams`, `team_members`, `players`, `games` and `ping`
   exist and each shows RLS as enabled.

(With the Supabase CLI you could instead run `supabase link` and `supabase db push`.)

## 7. Create your own user and make it the admin

1. In **Authentication → Users → Add user → Create new user**:
   - Email: your email.
   - Tick **Auto confirm user**. A password isn't needed: you'll sign in with a code.
2. In **SQL Editor → New query**, run this (with your email), to give yourself a director
   account with admin rights:

   ```sql
   insert into public.accounts (user_id, email, kind, is_admin)
   select id, lower(email), 'director', true
   from auth.users
   where email = 'your@email.com';
   ```

   It should say "1 row affected". If it says 0 rows, the user from step 1 doesn't exist (check
   **Authentication → Users**). This is the only time you need SQL: from then on you give
   other people access from the app's Admin page.

You become a team's director automatically when you create or upload that team from the app.

## 8. Send the app's connection details

In **Project Settings → API Keys** (or **Settings → API**), copy:

- the **Project URL** (`https://<something>.supabase.co`);
- the **publishable key** (`sb_publishable_…`), or, on older projects, the **anon public** key.

Both are **meant to be public**: they go into the app's `config.js` and anyone can see them.
Access is protected by the database's Row Level Security rules.

**Never share or commit the `secret` / `service_role` key** or the database password. Those
give full access and bypass all the rules.
