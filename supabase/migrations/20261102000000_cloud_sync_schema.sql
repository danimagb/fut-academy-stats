-- Fut Academy Stats: cloud sync schema (teams, members, players, games) with Row Level Security.
-- See docs/cloud-sync-plan.md ("Data model", "Row Level Security").
--
-- Roles per team (team_members.role):
--   director: reads and writes the team, its players and games; removes members; deletes the team.
--   coach:    read-only (team, players, games, member list).
-- The anon role gets nothing except select on public.ping (keep-alive job).
--
-- Written to be re-runnable: "if not exists", "create or replace", "drop ... if exists".

-- ---------------------------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------------------------

create table if not exists public.teams (
  id          text primary key,                -- app id (old short id or UUID string), from the client
  club        text not null default '',
  name        text not null default '',
  -- set null (not restrict) so deleting a user in the dashboard isn't blocked by teams they made
  created_by  uuid references auth.users on delete set null default auth.uid(),
  created_at  timestamptz default now(),
  updated_at  timestamptz not null default now(),  -- set by trigger, never trusted from the client
  deleted_at  timestamptz                          -- soft delete (tombstone for sync)
);

create table if not exists public.team_members (
  team_id     text references public.teams on delete cascade,
  user_id     uuid references auth.users on delete cascade,
  role        text not null check (role in ('director', 'coach')),
  invited_by  uuid references auth.users on delete set null,
  created_at  timestamptz default now(),
  primary key (team_id, user_id)
);

create table if not exists public.players (
  id          text primary key,
  team_id     text not null references public.teams on delete cascade,
  number      text not null default '',
  name        text not null default '',
  full_name   text not null default '',
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create table if not exists public.games (
  id          text primary key,
  team_id     text not null references public.teams on delete cascade,
  date        date,
  status      text,
  data        jsonb not null,                    -- the full game object, as in the app
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users on delete set null default auth.uid(),
  deleted_at  timestamptz
);

-- Single-row table read by the keep-alive job (anon key), so the free project isn't paused.
create table if not exists public.ping (
  id         int primary key default 1 check (id = 1),
  pinged_at  timestamptz not null default now()
);
insert into public.ping (id) values (1) on conflict (id) do nothing;

-- Sync pulls "rows of my teams with updated_at > last sync".
create index if not exists players_team_updated_idx on public.players (team_id, updated_at);
create index if not exists games_team_updated_idx   on public.games (team_id, updated_at);
-- "Which teams am I in?" (the primary key already covers lookups by team_id).
create index if not exists team_members_user_idx    on public.team_members (user_id);

comment on table public.teams is
  'A team (club + name). Visible to its members; written by its directors. Soft-deleted via deleted_at.';
comment on table public.team_members is
  'Who can access a team and how: director (read/write) or coach (read-only). Rows are added by the team-creation trigger or the invite-coach Edge Function (service role).';
comment on table public.players is
  'Players of a team. Visible to team members; written by team directors. Soft-deleted via deleted_at.';
comment on table public.games is
  'Games of a team, each stored as one jsonb document (data). Visible to team members; written by team directors. Soft-deleted via deleted_at.';
comment on table public.ping is
  'Single row read by a keep-alive job with the anon key. Holds no user data.';

-- ---------------------------------------------------------------------------------------------
-- Helper functions for policies
-- ---------------------------------------------------------------------------------------------
-- SECURITY DEFINER so they read team_members without going through its RLS (a policy on
-- team_members that queried team_members would recurse). search_path is empty, so every name
-- is schema-qualified.

create or replace function public.is_team_member(_team_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_members m
    where m.team_id = _team_id and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_team_director(_team_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_members m
    where m.team_id = _team_id and m.user_id = auth.uid() and m.role = 'director'
  );
$$;

-- True while a team has no members at all. That is only the case inside the statement that
-- creates it: the AFTER INSERT trigger that adds the creator as director runs at the end of the
-- statement, after RLS has checked the RETURNING row (see the teams select policy).
create or replace function public.team_has_members(_team_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.team_members m where m.team_id = _team_id);
$$;

revoke execute on function public.is_team_member(text)   from public, anon;
revoke execute on function public.is_team_director(text) from public, anon;
revoke execute on function public.team_has_members(text) from public, anon;
grant  execute on function public.is_team_member(text)   to authenticated, service_role;
grant  execute on function public.is_team_director(text) to authenticated, service_role;
grant  execute on function public.team_has_members(text) to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------------------------

-- Server-side bookkeeping for teams, players and games:
--  * updated_at = clock_timestamp() on every insert and update (client value ignored).
--    clock_timestamp() rather than now(): now() is frozen at transaction start, so a row
--    updated twice in one transaction would keep the same value.
--  * games.updated_by = the signed-in user.
--  * teams.created_by = the signed-in user on insert, and kept unchanged on update (silently,
--    so an upsert that sends created_by doesn't fail; with the service role, auth.uid() is
--    null and the given value is kept). Setting it to null is let through: that is what the
--    "on delete set null" foreign key does when the user is deleted.
--  * id can't change. team_id may change (moving a record): RLS checks the old row (USING)
--    and the new row (WITH CHECK), so only a director of both teams can move it.
create or replace function public.set_row_metadata()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.id is distinct from old.id then
    raise exception 'id of a % row cannot be changed', tg_table_name
      using errcode = 'check_violation';
  end if;

  new.updated_at := clock_timestamp();

  if tg_table_name = 'games' then
    new.updated_by := auth.uid();
  elsif tg_table_name = 'teams' then
    if tg_op = 'INSERT' then
      new.created_by := coalesce(auth.uid(), new.created_by);
    else
      if new.created_by is not null then
        new.created_by := old.created_by;
      end if;
      new.created_at := old.created_at;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists set_row_metadata on public.teams;
create trigger set_row_metadata before insert or update on public.teams
  for each row execute function public.set_row_metadata();
drop trigger if exists set_row_metadata on public.players;
create trigger set_row_metadata before insert or update on public.players
  for each row execute function public.set_row_metadata();
drop trigger if exists set_row_metadata on public.games;
create trigger set_row_metadata before insert or update on public.games
  for each row execute function public.set_row_metadata();

-- The creator of a team becomes its director. AFTER INSERT (not BEFORE): with an upsert,
-- BEFORE INSERT triggers also run when the row then conflicts, which would let anyone add
-- themselves to an existing team. AFTER INSERT only runs for rows actually inserted.
create or replace function public.add_team_creator_as_director()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.created_by is not null then
    insert into public.team_members (team_id, user_id, role, invited_by)
    values (new.id, new.created_by, 'director', new.created_by)
    on conflict (team_id, user_id) do nothing;
  end if;
  return null;
end;
$$;

drop trigger if exists add_creator_as_director on public.teams;
create trigger add_creator_as_director after insert on public.teams
  for each row execute function public.add_team_creator_as_director();

-- A team always keeps at least one director: refuse to delete the last director's membership
-- or to change it (role, team or user). Skipped when the team or the user itself is being
-- deleted (the cascade from teams / auth.users), so deleting a team or a user still works.
create or replace function public.keep_last_director()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role <> 'director' then
    return coalesce(new, old);
  end if;
  if tg_op = 'UPDATE' and new.role = 'director'
     and new.team_id = old.team_id and new.user_id = old.user_id then
    return new;
  end if;
  if not exists (select 1 from auth.users u where u.id = old.user_id) then
    return coalesce(new, old);
  end if;

  -- Lock the team row so two directors removing each other at the same time are serialised.
  -- If the team row is gone, this is the cascade of a team delete: allow it.
  perform 1 from public.teams t where t.id = old.team_id for update;
  if not found then
    return coalesce(new, old);
  end if;

  if not exists (
    select 1 from public.team_members m
    where m.team_id = old.team_id and m.role = 'director' and m.user_id <> old.user_id
  ) then
    raise exception 'a team must keep at least one director'
      using errcode = 'check_violation';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists keep_last_director on public.team_members;
create trigger keep_last_director before delete or update on public.team_members
  for each row execute function public.keep_last_director();

-- Trigger functions can't be called directly, but keep them off the API surface anyway.
revoke execute on function public.set_row_metadata()             from public, anon, authenticated;
revoke execute on function public.add_team_creator_as_director() from public, anon, authenticated;
revoke execute on function public.keep_last_director()           from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------------------------
-- Supabase's default privileges grant everything (including TRUNCATE, which ignores RLS) on new
-- tables to anon and authenticated, so start from nothing and grant only what is needed.

revoke all on public.teams, public.team_members, public.players, public.games, public.ping
  from public, anon, authenticated;

grant select, insert, update, delete on public.teams, public.players, public.games to authenticated;
grant select, delete on public.team_members to authenticated;  -- inserts: trigger / service role
grant select on public.ping to anon, authenticated;
grant all on public.teams, public.team_members, public.players, public.games, public.ping
  to service_role;  -- Edge Functions; service_role bypasses RLS

-- ---------------------------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------------------------
-- Notes on how Postgres applies these (checked by supabase/tests/rls.test.sql):
--  * INSERT ... ON CONFLICT DO UPDATE (the client's upsert) must pass the INSERT check on the
--    proposed row and, when the row exists, the SELECT and UPDATE USING policies on the existing
--    row and UPDATE WITH CHECK on the result; a failure is an error, not a silent skip. So a coach
--    or outsider can't overwrite (or "claim") an existing id through an upsert.
--  * Plain UPDATE / DELETE silently skip rows that fail USING (0 rows affected).
--  * (select auth.uid()) is evaluated once per statement instead of once per row.

alter table public.teams        enable row level security;
alter table public.team_members enable row level security;
alter table public.players      enable row level security;
alter table public.games        enable row level security;
alter table public.ping         enable row level security;

-- teams
drop policy if exists teams_select on public.teams;
create policy teams_select on public.teams for select to authenticated
  using (
    public.is_team_member(id)
    -- The creator, during the insert statement only (before the trigger makes them director),
    -- so that "insert ... returning" / upsert with return=representation works.
    or (created_by = (select auth.uid()) and not public.team_has_members(id))
  );

drop policy if exists teams_insert on public.teams;
create policy teams_insert on public.teams for insert to authenticated
  with check (created_by = (select auth.uid()));

drop policy if exists teams_update on public.teams;
create policy teams_update on public.teams for update to authenticated
  using (public.is_team_director(id))
  with check (public.is_team_director(id));

drop policy if exists teams_delete on public.teams;
create policy teams_delete on public.teams for delete to authenticated
  using (public.is_team_director(id));

-- team_members (no insert/update policies: rows come from the trigger or the service role)
drop policy if exists team_members_select on public.team_members;
create policy team_members_select on public.team_members for select to authenticated
  using (public.is_team_member(team_id));

drop policy if exists team_members_delete on public.team_members;
create policy team_members_delete on public.team_members for delete to authenticated
  using (public.is_team_director(team_id) or user_id = (select auth.uid()));  -- or leave a team

-- players
drop policy if exists players_select on public.players;
create policy players_select on public.players for select to authenticated
  using (public.is_team_member(team_id));

drop policy if exists players_insert on public.players;
create policy players_insert on public.players for insert to authenticated
  with check (public.is_team_director(team_id));

drop policy if exists players_update on public.players;
create policy players_update on public.players for update to authenticated
  using (public.is_team_director(team_id))        -- old row's team
  with check (public.is_team_director(team_id));  -- new row's team

drop policy if exists players_delete on public.players;
create policy players_delete on public.players for delete to authenticated
  using (public.is_team_director(team_id));

-- games
drop policy if exists games_select on public.games;
create policy games_select on public.games for select to authenticated
  using (public.is_team_member(team_id));

drop policy if exists games_insert on public.games;
create policy games_insert on public.games for insert to authenticated
  with check (public.is_team_director(team_id));

drop policy if exists games_update on public.games;
create policy games_update on public.games for update to authenticated
  using (public.is_team_director(team_id))
  with check (public.is_team_director(team_id));

drop policy if exists games_delete on public.games;
create policy games_delete on public.games for delete to authenticated
  using (public.is_team_director(team_id));

-- ping
drop policy if exists ping_select on public.ping;
create policy ping_select on public.ping for select to anon, authenticated
  using (true);
