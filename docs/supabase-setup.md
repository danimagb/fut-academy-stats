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
- Keep the **Email** provider enabled. People sign in with email + password (and get a code by
  email the first time or when they forget the password).
- **Passwords**: under the Email provider (or **Authentication → Policies / Passwords**), set
  the **minimum password length to 8** (the app asks for 8 too). Supabase stores passwords only
  as bcrypt hashes.
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

## 4. Send a code instead of a link (first sign-in and forgotten passwords)

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
   Then do the same with each later file in `supabase/migrations/`, in name order (for example
   `20261106000000_data_checks.sql`, the checks on what can be stored). Each file can be run
   again safely.
3. Check in **Table Editor** that `accounts`, `teams`, `team_members`, `players`, `games` and `ping`
   exist and each shows RLS as enabled.

(With the Supabase CLI you could instead run `supabase link` and `supabase db push`.)

## 7. Create your own user and make it the admin

1. In **Authentication → Users → Add user → Create new user**:
   - Email: your email.
   - Tick **Auto confirm user**. A password isn't needed: you'll sign in with a code.
2. In **SQL Editor → New query**, run this (with your email), to give yourself an account
   with admin rights:

   ```sql
   insert into public.accounts (user_id, email, is_admin)
   select id, lower(email), true
   from auth.users
   where email = 'your@email.com';
   ```

   It should say "1 row affected". If it says 0 rows, the user from step 1 doesn't exist (check
   **Authentication → Users**). This is the only time you need SQL: from then on you give
   other people access from the app's Admin page (once the `admin` function from step 9 is
   deployed).

From the app's Admin page you then create the clubs and choose their managers (you can make
yourself the manager of a club, to create its teams).

## 8. Send the app's connection details

In **Project Settings → API Keys** (or **Settings → API**), copy:

- the **Project URL** (`https://<something>.supabase.co`);
- the **publishable key** (`sb_publishable_…`), or, on older projects, the **anon public** key.

Both are **meant to be public**: they go into the app's `src/shared/config.ts` and anyone can see them.
Access is protected by the database's Row Level Security rules.

**Never share or commit the `secret` / `service_role` key** or the database password. Those
give full access and bypass all the rules.

## 9. Deploy the `admin` Edge Function (for the app's Admin page)

The app's Admin page gives people access and removes it through a small server function,
`admin`, which runs inside Supabase with the service role key (Supabase provides that key to
the function itself; you never copy it anywhere). Everything else on the Admin page goes
straight to the database.

**Before you give anyone else access**, make sure custom SMTP (step 3) works: the person signs
in with a code sent by email, and the built-in sender may only email your own address.

In the dashboard:

1. Open **Edge Functions** → **Deploy a new function** → **Via Editor**.
2. Name it exactly `admin` (the app calls it by that name).
3. Delete the example code, paste the whole content of `supabase/functions/admin/index.ts` from
   this repo, and click **Deploy function**.
4. Leave **Verify JWT** (sometimes shown as "Enforce JWT verification" / "Verify JWT with legacy
   secret", in the function's **Details** or settings) **on**, as it is by default. The app sends
   your signed-in session (a JWT) with every call, so the check passes, and calls without a
   session are rejected before the function runs. The function also checks the session itself
   and that your account is the admin.
   - If the Admin page says _"The admin function refused your sign-in (Invalid JWT)"_ even
     after signing out and in again, the project signs sessions with the newer JWT signing keys,
     which that legacy check doesn't understand. Then turn **Verify JWT off** for this function
     and save: it is still safe, because the function verifies the session and the admin flag on
     its own.
5. Test it: in the app, sign in with your admin account → **Profile → Account → Admin** →
   **Give access** with a second email of yours (as a coach account). It should say the person
   can now sign in; the email appears under **Accounts** (and in **Authentication → Users**).
   Remove it again with ✕.

If something fails, **Edge Functions → admin → Logs** shows the error.

With the Supabase CLI instead: `supabase functions deploy admin` (from the repo root, after
`supabase link`); add `--no-verify-jwt` only in the case described in point 4.

Give access to people only from the Admin page. They then open the app, go to
**Profile → Account**, type their email and the code they receive.

## 10. GitHub integration (migrations and the `admin` function deploy themselves)

With the integration, merging into `main` applies new files in `supabase/migrations/` to the
project and deploys the Edge Functions listed in `supabase/config.toml` (today: `admin`, with
**Verify JWT on**). Nothing has to be pasted by hand any more. The app itself is still deployed
by GitHub Pages; both happen on the same merge, so a migration and the app code that needs it
go out together.

### Before turning on "Deploy to production": tell Supabase which migrations already ran

The migrations so far were applied by hand (SQL editor), so the project has no record of them,
and the integration would run every file again on the first deploy. They are written to be
re-runnable, but don't rely on that: record them as applied first. In **SQL Editor**, check:

```sql
select version, name from supabase_migrations.schema_migrations order by version;
```

If that fails (no such table) or doesn't list `20261102000000`, `20261105000000` and
`20261106000000`, run (only list the migrations that really are on the project):

```sql
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text primary key, statements text[], name text
);
insert into supabase_migrations.schema_migrations (version, name) values
  ('20261102000000', 'cloud_sync_schema'),
  ('20261105000000', 'lock_finished_games'),
  ('20261106000000', 'data_checks')
on conflict (version) do nothing;
```

(With the Supabase CLI this is
`supabase migration repair --status applied 20261102000000 20261105000000 20261106000000`.)

### Settings

**Project Settings → Integrations → GitHub Integration**, repository `danimagb/fut-academy-stats`:

- **Working directory**: `.` (the `supabase/` folder is at the repository root).
- **Production branch**: `main`.
- **Deploy to production**: on.
- **Automatic branching** (a preview database for each branch / PR): only on the **Pro plan**,
  billed per branch and hour while it exists, and not covered by the spend cap. If on, also
  turn on **Supabase changes only**, so branches that don't touch `supabase/` get none. A
  preview starts empty: its schema is built from the migrations, there is no seed data and no
  users (sign-ups are off, as in production).

On production, `supabase/config.toml` changes nothing but the functions: it has no `[remotes]`
block for the project, so its `[auth]` and other settings only apply to preview branches.
Production's Auth settings (sign-ups off, SMTP, 8-digit codes) stay as set in steps 2–4.

### Required check

In GitHub, **Settings → Branches** (or **Rules**) for `main`: require the **Supabase Preview**
check (once it has run on a PR) as well as CI. CI's _Database and functions_ job runs the
migrations and the RLS tests on a plain Postgres (`supabase/tests/local/run.sh`) and the Edge
Function tests on every PR.

If a deploy fails, the PR (or the commit on `main`) shows the Supabase check with a link to its
logs; Supabase can also email you about failed branch deploys.
