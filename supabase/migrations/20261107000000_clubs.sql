-- Fut Academy Stats: clubs, club managers and team roles (docs/clubs-plan.md).
--
-- Every cloud team belongs to a club. Two levels of roles:
--   club_members.role  'manager' (UI: Coordenador): everything in every team of the club;
--                      'staff': can be given a role in the club's teams.
--   team_members.role  'manager' (UI: Diretor): players and games of the team;
--                      'coach'   (UI: Treinador): read-only.
-- The admin creates clubs and sets their name, and decides who is in which club (with the
-- `admin` Edge Function, which also creates accounts). Club managers create the club's teams,
-- give the club's people roles in them and set the club's short name.
--
-- Replaces from 20261102000000_cloud_sync_schema.sql: accounts.kind (and can_create_teams()),
-- the 'director' team role (renamed 'manager'), is_team_director(), add_team_coach(), the
-- "creator becomes director" and "last director" triggers, and the policies of teams,
-- team_members, players, games and accounts.
--
-- Existing data: one club per distinct teams.club text, holding those teams; everyone in
-- those teams becomes staff of the club, and admins in them become its managers.
--
-- Re-runnable ("if not exists", "create or replace", "drop ... if exists").

-- ---------------------------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------------------------

create table if not exists public.clubs (
  id          text primary key default gen_random_uuid()::text,
  name        text not null,                     -- set by the admin
  short_name  text not null default '',          -- e.g. 'PFC', set by a club manager; '' = none
  created_by  uuid references auth.users on delete set null default auth.uid(),
  created_at  timestamptz default now(),
  updated_at  timestamptz not null default now()  -- set by trigger
);

create table if not exists public.club_members (
  club_id     text references public.clubs on delete cascade,
  user_id     uuid references public.accounts on delete cascade,
  role        text not null check (role in ('manager', 'staff')),
  invited_by  uuid references auth.users on delete set null,
  created_at  timestamptz default now(),
  primary key (club_id, user_id)
);

create index if not exists club_members_user_idx on public.club_members (user_id);
-- Two clubs can't have the same name (ignoring case and spaces around it).
create unique index if not exists clubs_name_key on public.clubs (lower(btrim(name)));

alter table public.teams add column if not exists club_id text references public.clubs on delete cascade;
create index if not exists teams_club_idx on public.teams (club_id);

do $do$
begin
  alter table public.clubs drop constraint if exists clubs_id_length;
  alter table public.clubs add constraint clubs_id_length check (char_length(id) between 1 and 100);
  alter table public.clubs drop constraint if exists clubs_name_length;
  alter table public.clubs add constraint clubs_name_length check (char_length(btrim(name)) between 1 and 200);
  alter table public.clubs drop constraint if exists clubs_short_name_length;
  alter table public.clubs add constraint clubs_short_name_length check (char_length(short_name) <= 20);
end;
$do$;

comment on table public.clubs is
  'A club (e.g. Padroense FC). Created and named by the admin; its managers set short_name. Holds teams.';
comment on table public.club_members is
  'Who belongs to a club: manager (everything in its teams) or staff (can be given roles in its teams). Written by the admin.';
comment on column public.teams.club is
  'The club''s name, copied from clubs.name by a trigger (kept for display, PDFs and offline use).';
comment on table public.team_members is
  'Roles in a team: manager (players and games) or coach (read-only). Only staff of the team''s club. Written by the club''s managers and the admin.';

-- ---------------------------------------------------------------------------------------------
-- Existing data (does nothing on a re-run)
-- ---------------------------------------------------------------------------------------------

-- The old triggers must go before team_members rows are changed: the last-director rule would
-- refuse renaming 'director' to 'manager'.
drop trigger if exists keep_last_director on public.team_members;
drop trigger if exists add_creator_as_director on public.teams;

-- One club per distinct club name of the teams without a club.
insert into public.clubs (name, created_by)
select distinct on (lower(btrim(t.club)))
  coalesce(nullif(btrim(t.club), ''), 'Club'), null::uuid
from public.teams t
where t.club_id is null
order by lower(btrim(t.club)), t.created_at, t.id
on conflict do nothing;

update public.teams t
set club_id = c.id, club = c.name
from public.clubs c
where t.club_id is null
  and lower(btrim(c.name)) = lower(coalesce(nullif(btrim(t.club), ''), 'Club'));

-- Everyone in a team is staff of its club; admins are its managers.
insert into public.club_members (club_id, user_id, role)
select distinct on (t.club_id, m.user_id)
  t.club_id, m.user_id, case when a.is_admin then 'manager' else 'staff' end
from public.team_members m
join public.teams t on t.id = m.team_id
join public.accounts a on a.user_id = m.user_id
order by t.club_id, m.user_id
on conflict (club_id, user_id) do nothing;

alter table public.teams alter column club_id set not null;

alter table public.team_members drop constraint if exists team_members_role_check;
update public.team_members set role = 'manager' where role = 'director';
alter table public.team_members add constraint team_members_role_check
  check (role in ('manager', 'coach'));

-- ---------------------------------------------------------------------------------------------
-- Helper functions for policies
-- ---------------------------------------------------------------------------------------------
-- SECURITY DEFINER so policies can read the membership tables without going through their RLS
-- (no recursion). search_path is empty, so every name is schema-qualified.

create or replace function public.is_club_member(_club_id text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.club_members m where m.club_id = _club_id and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_club_manager(_club_id text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.club_members m
    where m.club_id = _club_id and m.user_id = auth.uid() and m.role = 'manager'
  );
$$;

-- The signed-in user manages the club the team belongs to.
create or replace function public.manages_team_club(_team_id text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.teams t
    join public.club_members m on m.club_id = t.club_id
    where t.id = _team_id and m.user_id = auth.uid() and m.role = 'manager'
  );
$$;

create or replace function public.is_team_manager(_team_id text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.team_members m
    where m.team_id = _team_id and m.user_id = auth.uid() and m.role = 'manager'
  );
$$;

-- Sees the team, its players, games and staff.
create or replace function public.can_read_team(_team_id text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_team_member(_team_id) or public.manages_team_club(_team_id);
$$;

-- Writes the team's players and games.
create or replace function public.can_play_team(_team_id text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_team_manager(_team_id) or public.manages_team_club(_team_id);
$$;

-- Changes the team itself and who has a role in it.
create or replace function public.can_manage_team(_team_id text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.manages_team_club(_team_id) or public.is_admin();
$$;

-- True if _user_id is in a club the signed-in user manages (to list the club's people).
create or replace function public.manages_club_of(_user_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.club_members mine
    join public.club_members theirs on theirs.club_id = mine.club_id
    where mine.user_id = auth.uid() and mine.role = 'manager' and theirs.user_id = _user_id
  );
$$;

create or replace function public.club_has_teams(_club_id text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.teams t where t.club_id = _club_id and t.deleted_at is null);
$$;

-- The teams the signed-in user has access to, with the role the app works with:
-- 'club_manager' (manages the team's club; wins over a team role), 'team_manager', 'team_coach'.
-- Soft-deleted teams are included (the sync pull removes them from the phone).
create or replace function public.my_teams()
returns table (team_id text, role text)
language sql stable security definer set search_path = ''
as $$
  select t.id, 'club_manager'
  from public.teams t
  join public.club_members c on c.club_id = t.club_id
  where c.user_id = auth.uid() and c.role = 'manager'
  union all
  select m.team_id, case m.role when 'manager' then 'team_manager' else 'team_coach' end
  from public.team_members m
  where m.user_id = auth.uid()
    and not public.manages_team_club(m.team_id);
$$;

do $do$
declare
  f text;
begin
  foreach f in array array[
    'public.is_club_member(text)', 'public.is_club_manager(text)', 'public.manages_team_club(text)',
    'public.is_team_manager(text)', 'public.can_read_team(text)', 'public.can_play_team(text)',
    'public.can_manage_team(text)', 'public.manages_club_of(uuid)', 'public.club_has_teams(text)',
    'public.my_teams()'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
  end loop;
end;
$do$;

-- ---------------------------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------------------------

-- Same as in the first migration, plus clubs (created_by like teams).
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
  elsif tg_table_name in ('teams', 'clubs') then
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

drop trigger if exists set_row_metadata on public.clubs;
create trigger set_row_metadata before insert or update on public.clubs
  for each row execute function public.set_row_metadata();

-- Only the admin changes a club's name (club managers may change short_name). Not checked for
-- the service role / SQL editor (no signed-in user).
create or replace function public.guard_club_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.name is distinct from old.name and auth.uid() is not null and not public.is_admin() then
    raise exception 'only the admin can rename a club'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_club_name on public.clubs;
create trigger guard_club_name before update on public.clubs
  for each row execute function public.guard_club_name();

-- teams.club is always the club's name (whatever the client sends).
create or replace function public.set_team_club_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.club := coalesce((select c.name from public.clubs c where c.id = new.club_id), new.club);
  return new;
end;
$$;

drop trigger if exists set_team_club_name on public.teams;
create trigger set_team_club_name before insert or update on public.teams
  for each row execute function public.set_team_club_name();

-- A club's new name reaches its teams (and, through updated_at, the phones).
create or replace function public.copy_club_name_to_teams()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.teams set club = new.name where club_id = new.id and club is distinct from new.name;
  return null;
end;
$$;

drop trigger if exists copy_club_name_to_teams on public.clubs;
create trigger copy_club_name_to_teams after update of name on public.clubs
  for each row execute function public.copy_club_name_to_teams();

-- Only staff (or managers) of a team's club can have a role in the team. invited_by is the
-- signed-in user (kept as given for the service role).
create or replace function public.check_team_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.teams t
    join public.club_members c on c.club_id = t.club_id
    where t.id = new.team_id and c.user_id = new.user_id
  ) then
    raise exception 'only people of the team''s club can have a role in it'
      using errcode = 'check_violation';
  end if;
  if tg_op = 'INSERT' then
    new.invited_by := coalesce(auth.uid(), new.invited_by);
  else
    new.invited_by := old.invited_by;
  end if;
  return new;
end;
$$;

drop trigger if exists check_team_member on public.team_members;
create trigger check_team_member before insert or update on public.team_members
  for each row execute function public.check_team_member();

create or replace function public.set_club_member_inviter()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.invited_by := coalesce(auth.uid(), new.invited_by);
  else
    new.invited_by := old.invited_by;
  end if;
  return new;
end;
$$;

drop trigger if exists set_club_member_inviter on public.club_members;
create trigger set_club_member_inviter before insert or update on public.club_members
  for each row execute function public.set_club_member_inviter();

-- Leaving a club (or being removed) also removes the person's roles in its teams.
create or replace function public.remove_team_roles_with_club()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.team_members m
  using public.teams t
  where t.id = m.team_id and t.club_id = old.club_id and m.user_id = old.user_id;
  return null;
end;
$$;

drop trigger if exists remove_team_roles_with_club on public.club_members;
create trigger remove_team_roles_with_club after delete on public.club_members
  for each row execute function public.remove_team_roles_with_club();

-- A team moved to another club (admin) keeps only the roles of people in the new club.
create or replace function public.remove_team_roles_outside_club()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.team_members m
  where m.team_id = new.id
    and not exists (
      select 1 from public.club_members c where c.club_id = new.club_id and c.user_id = m.user_id
    );
  return null;
end;
$$;

drop trigger if exists remove_team_roles_outside_club on public.teams;
create trigger remove_team_roles_outside_club after update of club_id on public.teams
  for each row when (new.club_id is distinct from old.club_id)
  execute function public.remove_team_roles_outside_club();

revoke execute on function public.set_row_metadata()               from public, anon, authenticated;
revoke execute on function public.guard_club_name()                from public, anon, authenticated;
revoke execute on function public.set_team_club_name()             from public, anon, authenticated;
revoke execute on function public.copy_club_name_to_teams()        from public, anon, authenticated;
revoke execute on function public.check_team_member()              from public, anon, authenticated;
revoke execute on function public.set_club_member_inviter()        from public, anon, authenticated;
revoke execute on function public.remove_team_roles_with_club()    from public, anon, authenticated;
revoke execute on function public.remove_team_roles_outside_club() from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------------------------

revoke all on public.clubs, public.club_members from public, anon, authenticated;
grant select, insert, delete, update (name, short_name) on public.clubs to authenticated;
grant select, insert, delete, update (role) on public.club_members to authenticated;
grant all on public.clubs, public.club_members to service_role;

-- ---------------------------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------------------------

alter table public.clubs        enable row level security;
alter table public.club_members enable row level security;

-- clubs: seen by their people and the admin; created, named and deleted by the admin (a club
-- can only be deleted once it has no teams); short_name also by its managers.
drop policy if exists clubs_select on public.clubs;
create policy clubs_select on public.clubs for select to authenticated
  using (public.is_club_member(id) or public.is_admin());

drop policy if exists clubs_insert on public.clubs;
create policy clubs_insert on public.clubs for insert to authenticated
  with check (public.is_admin());

drop policy if exists clubs_update on public.clubs;
create policy clubs_update on public.clubs for update to authenticated
  using (public.is_club_manager(id) or public.is_admin())
  with check (public.is_club_manager(id) or public.is_admin());

drop policy if exists clubs_delete on public.clubs;
create policy clubs_delete on public.clubs for delete to authenticated
  using (public.is_admin() and not public.club_has_teams(id));

-- club_members: your own rows, the club's managers and the admin see them; only the admin
-- writes them.
drop policy if exists club_members_select on public.club_members;
create policy club_members_select on public.club_members for select to authenticated
  using (user_id = (select auth.uid()) or public.is_club_manager(club_id) or public.is_admin());

drop policy if exists club_members_insert on public.club_members;
create policy club_members_insert on public.club_members for insert to authenticated
  with check (public.is_admin());

drop policy if exists club_members_update on public.club_members;
create policy club_members_update on public.club_members for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists club_members_delete on public.club_members;
create policy club_members_delete on public.club_members for delete to authenticated
  using (public.is_admin());

-- accounts: own row, the admin, teammates, and the people of the clubs you manage. No updates
-- (kind is gone; email and is_admin never changed through the API).
drop policy if exists accounts_select on public.accounts;
create policy accounts_select on public.accounts for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_admin()
    or public.shares_team_with(user_id)
    or public.manages_club_of(user_id)
  );
drop policy if exists accounts_update on public.accounts;

-- teams: seen by their members, the club's managers and the admin; created in a club by its
-- managers or the admin; changed and deleted by them. The admin can move a team to another club.
-- teams_select checks club_id on the row itself (not through manages_team_club), so that
-- "insert ... returning" works for the new row.
drop policy if exists teams_select on public.teams;
create policy teams_select on public.teams for select to authenticated
  using (public.is_team_member(id) or public.is_club_manager(club_id) or public.is_admin());

drop policy if exists teams_insert on public.teams;
create policy teams_insert on public.teams for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (public.is_club_manager(club_id) or public.is_admin())
  );

drop policy if exists teams_update on public.teams;
create policy teams_update on public.teams for update to authenticated
  using (public.can_manage_team(id))
  with check (public.is_club_manager(club_id) or public.is_admin());

drop policy if exists teams_delete on public.teams;
create policy teams_delete on public.teams for delete to authenticated
  using (public.can_manage_team(id));

-- team_members: seen by whoever sees the team and the admin; written by the club's managers and
-- the admin; anyone can leave a team.
drop policy if exists team_members_select on public.team_members;
create policy team_members_select on public.team_members for select to authenticated
  using (public.can_read_team(team_id) or public.is_admin());

drop policy if exists team_members_insert on public.team_members;
create policy team_members_insert on public.team_members for insert to authenticated
  with check (public.can_manage_team(team_id));

drop policy if exists team_members_update on public.team_members;
create policy team_members_update on public.team_members for update to authenticated
  using (public.can_manage_team(team_id))
  with check (public.can_manage_team(team_id));

drop policy if exists team_members_delete on public.team_members;
create policy team_members_delete on public.team_members for delete to authenticated
  using (public.can_manage_team(team_id) or user_id = (select auth.uid()));

-- players and games: seen by whoever sees the team; written by its team managers and the club's
-- managers. Moving one to another team needs that right in both (USING: old row, CHECK: new).
drop policy if exists players_select on public.players;
create policy players_select on public.players for select to authenticated
  using (public.can_read_team(team_id));

drop policy if exists players_insert on public.players;
create policy players_insert on public.players for insert to authenticated
  with check (public.can_play_team(team_id));

drop policy if exists players_update on public.players;
create policy players_update on public.players for update to authenticated
  using (public.can_play_team(team_id))
  with check (public.can_play_team(team_id));

drop policy if exists players_delete on public.players;
create policy players_delete on public.players for delete to authenticated
  using (public.can_play_team(team_id));

drop policy if exists games_select on public.games;
create policy games_select on public.games for select to authenticated
  using (public.can_read_team(team_id));

drop policy if exists games_insert on public.games;
create policy games_insert on public.games for insert to authenticated
  with check (public.can_play_team(team_id));

drop policy if exists games_update on public.games;
create policy games_update on public.games for update to authenticated
  using (public.can_play_team(team_id))
  with check (public.can_play_team(team_id));

drop policy if exists games_delete on public.games;
create policy games_delete on public.games for delete to authenticated
  using (public.can_play_team(team_id));

-- ---------------------------------------------------------------------------------------------
-- What the clubs model replaces (after the policies that used it)
-- ---------------------------------------------------------------------------------------------

drop function if exists public.add_team_coach(text, text);
drop function if exists public.is_team_director(text);
drop function if exists public.team_has_members(text);
drop function if exists public.can_create_teams();
drop function if exists public.keep_last_director();
drop function if exists public.add_team_creator_as_director();
alter table public.accounts drop column if exists kind;

comment on table public.accounts is
  'Who may use the cloud (given by the admin through the admin Edge Function); is_admin manages clubs, people and all teams. Clubs and roles are in club_members / team_members.';
