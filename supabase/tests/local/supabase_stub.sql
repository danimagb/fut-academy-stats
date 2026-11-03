-- Minimal stand-in for the Supabase environment, so the migration and the RLS tests can run on a
-- plain local Postgres (used by run.sh only; never apply this to a real Supabase project).
--
-- It recreates what the migration and the tests rely on:
--   * the API roles anon, authenticated (subject to RLS) and service_role (bypasses RLS);
--   * auth.users (only the columns used here) and auth.uid() / auth.role(), which read the
--     JWT claims from the request.jwt.claims setting like Supabase does;
--   * Supabase's default privileges, which grant everything on new public tables and functions
--     to the API roles, so the migration's revokes are really tested.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end
$$;

create schema if not exists auth;

create table if not exists auth.users (
  id    uuid primary key,
  email text
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(
    coalesce(
      current_setting('request.jwt.claim.sub', true),
      current_setting('request.jwt.claims', true)::jsonb ->> 'sub'
    ),
    ''
  )::uuid;
$$;

create or replace function auth.role()
returns text
language sql
stable
as $$
  select nullif(
    coalesce(
      current_setting('request.jwt.claim.role', true),
      current_setting('request.jwt.claims', true)::jsonb ->> 'role'
    ),
    ''
  )::text;
$$;

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema auth   to anon, authenticated, service_role;
grant execute on function auth.uid(), auth.role() to anon, authenticated, service_role;

-- Like Supabase: new objects created by postgres in public are fully granted to the API roles.
alter default privileges in schema public grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
