-- RLS tests for the cloud sync schema (supabase/migrations/*_cloud_sync_schema.sql).
-- Run with `supabase test db`, or locally with supabase/tests/local/run.sh.
--
-- Users are simulated the way Supabase does it: switch to the anon or authenticated role and set
-- the JWT claims that auth.uid() reads. `reset role` goes back to the superuser for set-up and
-- for checking what really is in the tables. Everything is rolled back at the end.
--
--   user  id                                    account kind        role in the tests
--   A     00000000-0000-0000-0000-00000000000a  director            creates team t1 (director)
--   B     00000000-0000-0000-0000-00000000000b  director            second director of t1 (later)
--   C     00000000-0000-0000-0000-00000000000c  coach               coach of t1 (read-only)
--   O     00000000-0000-0000-0000-00000000000f  director            outsider (creates team t3)
--   D     00000000-0000-0000-0000-00000000000d  coach + is_admin    the admin (creates team td)
--   E     00000000-0000-0000-0000-00000000000e  coach               added by email; director of td
--   G     00000000-0000-0000-0000-000000000007  coach               account deleted by the admin
--   N     00000000-0000-0000-0000-000000000009  (no account)        auth user without cloud access

begin;
select plan(186);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'c@example.com'),
  ('00000000-0000-0000-0000-00000000000f', 'o@example.com'),
  ('00000000-0000-0000-0000-00000000000d', 'd@example.com'),
  ('00000000-0000-0000-0000-00000000000e', 'e@example.com'),
  ('00000000-0000-0000-0000-000000000007', 'g@example.com'),
  ('00000000-0000-0000-0000-000000000009', 'n@example.com');

-- Accounts are created by the admin (service role / SQL editor). E's email is given in mixed case.
insert into public.accounts (user_id, email, kind, is_admin) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com', 'director', false),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.com', 'director', false),
  ('00000000-0000-0000-0000-00000000000c', 'c@example.com', 'coach',    false),
  ('00000000-0000-0000-0000-00000000000f', 'o@example.com', 'director', false),
  ('00000000-0000-0000-0000-00000000000d', 'd@example.com', 'coach',    true),
  ('00000000-0000-0000-0000-00000000000e', ' E@Example.COM', 'coach',   false),
  ('00000000-0000-0000-0000-000000000007', 'g@example.com', 'coach',    false);

-- =============================================================================================
-- Anonymous (anon key, not signed in): nothing but ping
-- =============================================================================================
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select throws_ok('select * from public.teams',        '42501', null, 'anon: cannot select teams');
select throws_ok('select * from public.players',      '42501', null, 'anon: cannot select players');
select throws_ok('select * from public.games',        '42501', null, 'anon: cannot select games');
select throws_ok('select * from public.team_members', '42501', null, 'anon: cannot select team_members');
select throws_ok($$insert into public.teams (id) values ('x')$$,
  '42501', null, 'anon: cannot insert teams');
select throws_ok($$insert into public.players (id, team_id) values ('x', 'x')$$,
  '42501', null, 'anon: cannot insert players');
select throws_ok($$insert into public.games (id, team_id, data) values ('x', 'x', '{}')$$,
  '42501', null, 'anon: cannot insert games');
select throws_ok($$insert into public.team_members (team_id, user_id, role)
                   values ('x', '00000000-0000-0000-0000-00000000000f', 'director')$$,
  '42501', null, 'anon: cannot insert team_members');
select is((select count(*)::int from public.ping), 1, 'anon: can select ping');
select throws_ok('update public.ping set pinged_at = now()', '42501', null, 'anon: cannot update ping');
select throws_ok('delete from public.ping', '42501', null, 'anon: cannot delete ping');
select throws_ok($$select public.is_team_member('t1')$$,
  '42501', null, 'anon: cannot execute is_team_member');
select throws_ok($$select public.is_team_director('t1')$$,
  '42501', null, 'anon: cannot execute is_team_director');
select throws_ok('select * from public.accounts', '42501', null, 'anon: cannot select accounts');
select throws_ok('select public.is_admin()', '42501', null, 'anon: cannot execute is_admin');
select throws_ok('select public.can_create_teams()', '42501', null, 'anon: cannot execute can_create_teams');
select throws_ok($$select public.shares_team_with('00000000-0000-0000-0000-00000000000a')$$,
  '42501', null, 'anon: cannot execute shares_team_with');
select throws_ok($$select public.add_team_coach('t1', 'c@example.com')$$,
  '42501', null, 'anon: cannot execute add_team_coach');

reset role;

-- =============================================================================================
-- Accounts: own row only; nothing writable except by the admin; who may create teams
-- =============================================================================================
select is((select email from public.accounts where user_id = '00000000-0000-0000-0000-00000000000e'), 'e@example.com',
  'accounts: email is stored lower-case and trimmed');
select throws_ok($$insert into public.accounts (user_id, email, kind)
                   values ('00000000-0000-0000-0000-000000000009', 'C@EXAMPLE.COM', 'coach')$$,
  '23505', null, 'accounts: email is unique, ignoring case');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';

select is((select count(*)::int from public.accounts), 1, 'C: sees only their own account (no teams yet)');
select is((select kind from public.accounts), 'coach', 'C: can read their own account');
with u as (update public.accounts set kind = 'director' where user_id = '00000000-0000-0000-0000-00000000000c' returning 1)
select is(count(*)::int, 0, 'C: cannot change their own account kind') from u;
select throws_ok($$update public.accounts set is_admin = true where user_id = '00000000-0000-0000-0000-00000000000c'$$,
  '42501', null, 'C: cannot make themselves admin');
with d as (delete from public.accounts where user_id = '00000000-0000-0000-0000-00000000000c' returning 1)
select is(count(*)::int, 0, 'C: cannot delete their own account') from d;
select ok(not public.can_create_teams() and not public.is_admin(),
  'C: a coach account cannot create teams and is not admin');
select throws_ok($$insert into public.teams (id, club, name) values ('tc', 'x', 'x')$$,
  '42501', null, 'C: a coach account cannot create a team');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000009","role":"authenticated"}';

select is((select count(*)::int from public.accounts), 0, 'N: without an account, sees no accounts');
select throws_ok($$insert into public.accounts (user_id, email, kind)
                   values ('00000000-0000-0000-0000-000000000009', 'n@example.com', 'director')$$,
  '42501', null, 'N: cannot create their own account');
select throws_ok($$insert into public.teams (id, club, name) values ('tn', 'x', 'x')$$,
  '42501', null, 'N: a user without an account cannot create a team');

reset role;

-- =============================================================================================
-- Director A creates team t1 and manages its players and games
-- =============================================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

-- Client-sent created_by and updated_at must be ignored.
with ins as (
  insert into public.teams (id, club, name, created_by, updated_at)
  values ('t1', 'Fut Academy', 'U12', '00000000-0000-0000-0000-00000000000f', '2000-01-01')
  returning id
)
select is(count(*)::int, 1, 'A: insert team ... returning returns the new row') from ins;

select is((select created_by from public.teams where id = 't1'),
  '00000000-0000-0000-0000-00000000000a'::uuid, 'A: teams.created_by is set to auth.uid()');
select ok((select updated_at > '2020-01-01' from public.teams where id = 't1'),
  'A: teams.updated_at is set by the server');
select is((select role from public.team_members
           where team_id = 't1' and user_id = '00000000-0000-0000-0000-00000000000a'),
  'director', 'A: the creator is made director of the new team');
select ok(public.is_team_director('t1'), 'A: is_team_director(t1) is true');
select ok(public.can_create_teams(), 'A: a director account can create teams');

with up as (
  insert into public.teams (id, club, name) values ('t1', 'Fut Academy', 'U12 A')
  on conflict (id) do update set club = excluded.club, name = excluded.name
  returning name
)
select is(min(name), 'U12 A', 'A: upsert of an existing team updates it (with returning)') from up;

-- A second upsert of a new team, in one statement, also works (first upload of local data).
with up as (
  insert into public.teams (id, club, name) values ('t2', 'Fut Academy', 'U14')
  on conflict (id) do update set club = excluded.club, name = excluded.name
  returning id
)
select is(count(*)::int, 1, 'A: upsert of a new team inserts it (with returning)') from up;

select lives_ok($$
  insert into public.players (id, team_id, number, name, full_name, updated_at) values
    ('p1', 't1', '7', 'Rui', 'Rui Costa', '2000-01-01'),
    ('p2', 't1', '9', 'Ana', 'Ana Silva', '2000-01-01')
  on conflict (id) do update set team_id = excluded.team_id, number = excluded.number,
    name = excluded.name, full_name = excluded.full_name, deleted_at = excluded.deleted_at
$$, 'A: can upsert new players');
select ok((select bool_and(updated_at > '2020-01-01') from public.players),
  'A: players.updated_at is set by the server, not the client');

-- Remember p1's updated_at (a setting, so it survives role switches; local to the transaction).
do $$ begin
  perform set_config('test.p1_updated_at',
    (select updated_at::text from public.players where id = 'p1'), true);
end $$;

with up as (
  insert into public.players (id, team_id, number, name, full_name, updated_at)
  values ('p1', 't1', '10', 'Rui', 'Rui Costa', '2000-01-01')
  on conflict (id) do update set team_id = excluded.team_id, number = excluded.number,
    name = excluded.name, full_name = excluded.full_name, updated_at = excluded.updated_at
  returning number
)
select is(min(number), '10', 'A: can upsert an existing player') from up;
select ok((select updated_at > current_setting('test.p1_updated_at')::timestamptz
           from public.players where id = 'p1'),
  'A: players.updated_at advances on update (client value ignored)');

with u as (update public.players set name = 'Rui C.' where id = 'p1' returning 1)
select is(count(*)::int, 1, 'A: can update a player') from u;

with u as (update public.players set deleted_at = now() where id = 'p2' returning 1)
select is(count(*)::int, 1, 'A: can soft-delete a player') from u;
select ok((select deleted_at is not null from public.players where id = 'p2'),
  'A: a soft-deleted player is still visible (as a tombstone for sync)');
with d as (delete from public.players where id = 'p2' returning 1)
select is(count(*)::int, 1, 'A: can hard-delete a player') from d;

select throws_ok($$update public.players set id = 'p1-new' where id = 'p1'$$,
  '23514', null, 'A: cannot change a player id');

select lives_ok($$
  insert into public.games (id, team_id, date, status, data, updated_by, updated_at) values
    ('g1', 't1', '2026-11-01', 'scheduled', '{"opponent":"FC Porto"}',
     '00000000-0000-0000-0000-00000000000f', '2000-01-01'),
    ('g2', 't1', '2026-11-08', 'scheduled', '{"opponent":"SL Benfica"}', null, null)
  on conflict (id) do update set team_id = excluded.team_id, date = excluded.date,
    status = excluded.status, data = excluded.data, deleted_at = excluded.deleted_at
$$, 'A: can upsert new games');
select is((select count(*)::int from public.games
           where updated_by = '00000000-0000-0000-0000-00000000000a' and updated_at > '2020-01-01'),
  2, 'A: games.updated_by = auth.uid() and updated_at is set by the server');

with up as (
  insert into public.games (id, team_id, date, status, data)
  values ('g1', 't1', '2026-11-01', 'live', '{"opponent":"FC Porto","events":[]}')
  on conflict (id) do update set status = excluded.status, data = excluded.data
  returning status
)
select is(min(status), 'live', 'A: can upsert an existing game') from up;

with u as (update public.games set deleted_at = now() where id = 'g2' returning 1)
select is(count(*)::int, 1, 'A: can soft-delete a game') from u;
with u as (update public.games set deleted_at = null where id = 'g2' returning 1)
select is(count(*)::int, 1, 'A: can restore a soft-deleted game') from u;

select throws_ok($$update public.games set id = 'g1-new' where id = 'g1'$$,
  '23514', null, 'A: cannot change a game id');
select throws_ok($$update public.teams set id = 't1-new' where id = 't1'$$,
  '23514', null, 'A: cannot change a team id');

with u as (update public.teams set created_by = '00000000-0000-0000-0000-00000000000f'
           where id = 't1' returning created_by)
select is(min(created_by::text)::uuid, '00000000-0000-0000-0000-00000000000a'::uuid,
  'A: teams.created_by cannot be changed (kept as is)') from u;

-- A is director of t1 and t2, so A may move a game between them.
with u as (update public.games set team_id = 't2' where id = 'g2' returning 1)
select is(count(*)::int, 1, 'A: can move a game between two teams they direct') from u;

with ins as (insert into public.games (id, team_id, data) values ('g3', 't1', '{}') returning 1)
select is(count(*)::int, 1, 'A: can insert a game') from ins;
with d as (delete from public.games where id = 'g3' returning 1)
select is(count(*)::int, 1, 'A: can hard-delete a game') from d;

select throws_ok('truncate public.players', '42501', null, 'authenticated: cannot truncate (TRUNCATE ignores RLS)');

reset role;

-- =============================================================================================
-- Coach C of t1: read-only
-- =============================================================================================
insert into public.team_members (team_id, user_id, role, invited_by) values
  ('t1', '00000000-0000-0000-0000-00000000000c', 'coach', '00000000-0000-0000-0000-00000000000a');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';

select is((select count(*)::int from public.teams), 1, 'C: sees only t1');
select is((select count(*)::int from public.players), 1, 'C: sees the players of t1');
select is((select count(*)::int from public.games), 1, 'C: sees the games of t1');
select is((select count(*)::int from public.team_members), 2, 'C: sees the members of t1');
select is((select string_agg(email, ',' order by email) from public.accounts),
  'a@example.com,c@example.com', 'C: sees the accounts of teammates (and own), no others');
select ok(public.is_team_member('t1') and not public.is_team_director('t1'),
  'C: is a member but not a director of t1');

with u as (update public.teams set name = 'hacked' where id = 't1' returning 1)
select is(count(*)::int, 0, 'C: cannot update the team') from u;
with u as (update public.teams set deleted_at = now() where id = 't1' returning 1)
select is(count(*)::int, 0, 'C: cannot soft-delete the team') from u;
with d as (delete from public.teams where id = 't1' returning 1)
select is(count(*)::int, 0, 'C: cannot delete the team') from d;
select throws_ok($$
  insert into public.teams (id, club, name) values ('t1', 'x', 'hacked')
  on conflict (id) do update set name = excluded.name
$$, '42501', null, 'C: cannot upsert over the team');

select throws_ok($$insert into public.players (id, team_id, name) values ('p9', 't1', 'x')$$,
  '42501', null, 'C: cannot insert a player');
with u as (update public.players set name = 'hacked' where id = 'p1' returning 1)
select is(count(*)::int, 0, 'C: cannot update a player') from u;
with u as (update public.players set deleted_at = now() where id = 'p1' returning 1)
select is(count(*)::int, 0, 'C: cannot soft-delete a player') from u;
with d as (delete from public.players where id = 'p1' returning 1)
select is(count(*)::int, 0, 'C: cannot delete a player') from d;
select throws_ok($$
  insert into public.players (id, team_id, name) values ('p1', 't1', 'hacked')
  on conflict (id) do update set name = excluded.name
$$, '42501', null, 'C: cannot upsert over an existing player');

select throws_ok($$insert into public.games (id, team_id, data) values ('g9', 't1', '{}')$$,
  '42501', null, 'C: cannot insert a game');
with u as (update public.games set status = 'hacked' where id = 'g1' returning 1)
select is(count(*)::int, 0, 'C: cannot update a game') from u;
with u as (update public.games set deleted_at = now() where id = 'g1' returning 1)
select is(count(*)::int, 0, 'C: cannot soft-delete a game') from u;
with d as (delete from public.games where id = 'g1' returning 1)
select is(count(*)::int, 0, 'C: cannot delete a game') from d;
select throws_ok($$
  insert into public.games (id, team_id, data) values ('g1', 't1', '{"hacked":true}')
  on conflict (id) do update set data = excluded.data
$$, '42501', null, 'C: cannot upsert over an existing game');

with d as (delete from public.team_members
           where user_id = '00000000-0000-0000-0000-00000000000a' returning 1)
select is(count(*)::int, 0, 'C: cannot remove another member') from d;
with u as (update public.team_members set role = 'director'
           where user_id = '00000000-0000-0000-0000-00000000000c' returning 1)
select is(count(*)::int, 0, 'C: cannot change their own role (promote themselves)') from u;
select throws_ok($$insert into public.team_members (team_id, user_id, role)
                   values ('t2', '00000000-0000-0000-0000-00000000000c', 'director')$$,
  '42501', null, 'C: cannot add themselves to another team');

reset role;

select is((select name from public.teams where id = 't1'), 'U12 A', 'after C: team unchanged');
select is((select name || '/' || (deleted_at is null) from public.players where id = 'p1'),
  'Rui C./true', 'after C: player unchanged');
select is((select status || '/' || (data ? 'hacked')::text || '/' || (deleted_at is null)
           from public.games where id = 'g1'),
  'live/false/true', 'after C: game unchanged');

-- =============================================================================================
-- Outsider O: sees nothing of t1, can't write to it or claim it
-- =============================================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000f","role":"authenticated"}';

select is((select count(*)::int from public.teams), 0, 'O: sees no teams');
select is((select count(*)::int from public.players), 0, 'O: sees no players');
select is((select count(*)::int from public.games), 0, 'O: sees no games');
select is((select count(*)::int from public.team_members), 0, 'O: sees no members');
select ok(not public.is_team_member('t1'), 'O: is_team_member(t1) is false');
select is((select count(*)::int from public.accounts), 1, 'O: sees only their own account');

select throws_ok($$insert into public.players (id, team_id, name) values ('p9', 't1', 'x')$$,
  '42501', null, 'O: cannot insert a player into t1');
select throws_ok($$insert into public.games (id, team_id, data) values ('g9', 't1', '{}')$$,
  '42501', null, 'O: cannot insert a game into t1');
select throws_ok($$
  insert into public.players (id, team_id, name) values ('p1', 't1', 'hacked')
  on conflict (id) do update set name = excluded.name
$$, '42501', null, 'O: cannot upsert over a player of t1');
-- Upserting into one's own team with an id that exists in another team (an attempt to move it).
select lives_ok($$insert into public.teams (id, club, name) values ('t3', 'Other', 'U10')$$,
  'O: can create their own team');
select throws_ok($$
  insert into public.games (id, team_id, data) values ('g1', 't3', '{}')
  on conflict (id) do update set team_id = excluded.team_id, data = excluded.data
$$, '42501', null, 'O: cannot pull a game of t1 into their team with an upsert');
select throws_ok($$
  insert into public.teams (id, club, name) values ('t1', 'Mine', 'Mine')
  on conflict (id) do update set club = excluded.club, name = excluded.name
$$, '42501', null, 'O: cannot claim t1 with an upsert');
-- A plain insert of an existing id fails on the primary key (it reveals that the id exists, but
-- ids are random UUIDs and nothing else is revealed).
select throws_ok($$insert into public.teams (id, club, name) values ('t1', 'Mine', 'Mine')$$,
  '23505', null, 'O: cannot claim t1 with a plain insert');
select throws_ok($$insert into public.team_members (team_id, user_id, role)
                   values ('t1', '00000000-0000-0000-0000-00000000000f', 'director')$$,
  '42501', null, 'O: cannot add themselves to t1');
with u as (update public.teams set name = 'hacked' where id = 't1' returning 1)
select is(count(*)::int, 0, 'O: cannot update t1') from u;
with d as (delete from public.teams where id = 't1' returning 1)
select is(count(*)::int, 0, 'O: cannot delete t1') from d;
with d as (delete from public.team_members where team_id = 't1' returning 1)
select is(count(*)::int, 0, 'O: cannot remove members of t1') from d;
select is((select count(*)::int from public.teams), 1, 'O: sees only their own team t3');

reset role;

select is((select club || '/' || name from public.teams where id = 't1'), 'Fut Academy/U12 A',
  'after O: t1 unchanged');
select is((select count(*)::int from public.team_members
           where team_id = 't1' and user_id = '00000000-0000-0000-0000-00000000000f'),
  0, 'after O: O is not a member of t1');
select is((select team_id from public.games where id = 'g1'), 't1', 'after O: g1 still in t1');
select is((select count(*)::int from public.players where team_id = 't1'), 1,
  'after O: no player added to t1');

-- =============================================================================================
-- Moving records: a director can't move a game or player to a team they don't direct
-- =============================================================================================
insert into public.team_members (team_id, user_id, role) values
  ('t3', '00000000-0000-0000-0000-00000000000a', 'coach');  -- A is only a coach of t3

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

select throws_ok($$update public.games set team_id = 't3' where id = 'g1'$$,
  '42501', null, 'A: cannot move a game to a team where they are only a coach');
select throws_ok($$update public.players set team_id = 't3' where id = 'p1'$$,
  '42501', null, 'A: cannot move a player to a team where they are only a coach');
select throws_ok($$update public.games set team_id = 'nope' where id = 'g1'$$,
  '42501', null, 'A: cannot move a game to a team that does not exist / they are not in');
select throws_ok($$
  insert into public.games (id, team_id, data) values ('g1', 't3', '{}')
  on conflict (id) do update set team_id = excluded.team_id
$$, '42501', null, 'A: cannot move a game to t3 with an upsert');
select is((select count(*)::int from public.games where team_id = 't3'), 0,
  'A: t3 still has no games');

-- =============================================================================================
-- Directors add coaches by email with add_team_coach(); no direct inserts or role changes
-- =============================================================================================
select is(public.add_team_coach('t1', '  E@EXAMPLE.com '), 'added',
  'A: add_team_coach adds an existing account (email matched ignoring case)');
select is((select role || '/' || invited_by from public.team_members
           where team_id = 't1' and user_id = '00000000-0000-0000-0000-00000000000e'),
  'coach/00000000-0000-0000-0000-00000000000a', 'A: the new member is a coach, invited by A');
select is(public.add_team_coach('t1', 'e@example.com'), 'already_member',
  'A: add_team_coach on a current member returns already_member');
select is(public.add_team_coach('t1', 'nobody@example.com'), 'no_account',
  'A: add_team_coach with an unknown email returns no_account');
select is(public.add_team_coach('t1', 'n@example.com'), 'no_account',
  'A: add_team_coach for an auth user without an account returns no_account');
select throws_ok($$insert into public.team_members (team_id, user_id, role)
                   values ('t1', '00000000-0000-0000-0000-000000000007', 'coach')$$,
  '42501', null, 'A: a director cannot insert members directly (only through add_team_coach)');
select throws_ok($$insert into public.team_members (team_id, user_id, role)
                   values ('t1', '00000000-0000-0000-0000-000000000007', 'director')$$,
  '42501', null, 'A: a director cannot add a director');
with u as (update public.team_members set role = 'director'
           where team_id = 't1' and user_id = '00000000-0000-0000-0000-00000000000e' returning 1)
select is(count(*)::int, 0, 'A: a director cannot change roles') from u;
with d as (delete from public.team_members where team_id = 't1' and user_id = '00000000-0000-0000-0000-00000000000e' returning 1)
select is(count(*)::int, 1, 'A: a director can remove a coach from their team') from d;
select is(public.add_team_coach('t1', 'e@example.com'), 'added',
  'A: a removed coach can be added again');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select throws_ok($$select public.add_team_coach('t1', 'g@example.com')$$,
  '42501', null, 'C: a coach of the team cannot add coaches');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000f","role":"authenticated"}';
select throws_ok($$select public.add_team_coach('t1', 'g@example.com')$$,
  '42501', null, 'O: a director of another team cannot add coaches to t1');
select is(public.add_team_coach('t3', 'g@example.com'), 'added', 'O: can add a coach to their own team');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000009","role":"authenticated"}';
select throws_ok($$select public.add_team_coach('t1', 'n@example.com')$$,
  '42501', null, 'N: a user without an account cannot add coaches');

-- =============================================================================================
-- Admin D: sees all teams, members and accounts (not players/games); manages any membership
-- =============================================================================================
reset role;
do $$ begin
  perform set_config('test.n_teams',    (select count(*)::text from public.teams), true);
  perform set_config('test.n_members',  (select count(*)::text from public.team_members), true);
  perform set_config('test.n_accounts', (select count(*)::text from public.accounts), true);
end $$;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated"}';

select is((select count(*)::int from public.teams), current_setting('test.n_teams')::int,
  'D (admin): sees all teams');
select is((select count(*)::int from public.team_members), current_setting('test.n_members')::int,
  'D (admin): sees all team members');
select is((select count(*)::int from public.accounts), current_setting('test.n_accounts')::int,
  'D (admin): sees all accounts');
select is((select count(*)::int from public.players) + (select count(*)::int from public.games), 0,
  'D (admin): sees no players or games of teams they are not a member of');
with u as (update public.teams set name = 'hacked' where id = 't1' returning 1)
select is(count(*)::int, 0, 'D (admin): cannot edit a team they do not direct') from u;

select lives_ok($$insert into public.teams (id, club, name) values ('td', 'Admin FC', 'U8')$$,
  'D (admin): can create a team (even with a coach account kind)');
select is(public.add_team_coach('td', 'e@example.com'), 'added', 'D (admin): adds E to td');
with u as (update public.team_members set role = 'director'
           where team_id = 'td' and user_id = '00000000-0000-0000-0000-00000000000e' returning 1)
select is(count(*)::int, 1, 'D (admin): can promote a member to director') from u;
select is(public.add_team_coach('t3', 'b@example.com'), 'added',
  'D (admin): can use add_team_coach on a team they are not in');
with u as (update public.team_members set role = 'director'
           where team_id = 't3' and user_id = '00000000-0000-0000-0000-00000000000b' returning 1)
select is(count(*)::int, 1, 'D (admin): can change a role in any team') from u;
with d as (delete from public.team_members where team_id = 't3' and user_id = '00000000-0000-0000-0000-00000000000b' returning 1)
select is(count(*)::int, 1, 'D (admin): can remove a director from any team') from d;
select lives_ok($$insert into public.team_members (team_id, user_id, role)
                  values ('t2', '00000000-0000-0000-0000-000000000007', 'director')$$,
  'D (admin): can insert a membership directly, as director');
with d as (delete from public.team_members where team_id = 't2' and user_id = '00000000-0000-0000-0000-000000000007' returning 1)
select is(count(*)::int, 1, 'D (admin): can remove that membership') from d;
select throws_ok($$delete from public.team_members where team_id = 't3' and user_id = '00000000-0000-0000-0000-00000000000f'$$,
  '23514', null, 'D (admin): cannot remove the last director of a team');
select throws_ok($$update public.team_members set role = 'coach'
                   where team_id = 't3' and user_id = '00000000-0000-0000-0000-00000000000f'$$,
  '23514', null, 'D (admin): cannot demote the last director of a team');

with u as (update public.accounts set kind = 'director' where user_id = '00000000-0000-0000-0000-00000000000c' returning kind)
select is(min(kind), 'director', 'D (admin): can change the kind of an account') from u;
with u as (update public.accounts set kind = 'coach' where user_id = '00000000-0000-0000-0000-00000000000c' returning kind)
select is(min(kind), 'coach', 'D (admin): can change it back') from u;
select throws_ok($$update public.accounts set is_admin = true where user_id = '00000000-0000-0000-0000-00000000000c'$$,
  '42501', null, 'D (admin): cannot set is_admin through the API');
select throws_ok($$update public.accounts set email = 'x@example.com' where user_id = '00000000-0000-0000-0000-00000000000c'$$,
  '42501', null, 'D (admin): cannot change an email through the API');
with d as (delete from public.accounts where user_id = '00000000-0000-0000-0000-00000000000d' returning 1)
select is(count(*)::int, 0, 'D (admin): cannot delete their own account') from d;
with d as (delete from public.accounts where user_id = '00000000-0000-0000-0000-000000000007' returning 1)
select is(count(*)::int, 1, 'D (admin): can delete another account') from d;

reset role;
select is((select count(*)::int from public.team_members where user_id = '00000000-0000-0000-0000-000000000007'), 0,
  'account delete: the user''s memberships are removed');

-- A coach-kind account made director of td by the admin can sync (upsert) td, but not create teams.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000e","role":"authenticated"}';
with up as (
  insert into public.teams (id, club, name) values ('td', 'Admin FC', 'U8 E')
  on conflict (id) do update set name = excluded.name
  returning name
)
select is(min(name), 'U8 E', 'E: as director of td (coach account), can upsert td') from up;
select throws_ok($$insert into public.teams (id, club, name) values ('te', 'x', 'x')$$,
  '42501', null, 'E: a coach account still cannot create a new team');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

-- =============================================================================================
-- Members: a team always keeps a director; members can leave
-- =============================================================================================
select throws_ok($$delete from public.team_members
                   where team_id = 't1' and user_id = '00000000-0000-0000-0000-00000000000a'$$,
  '23514', null, 'A: the last director cannot leave t1');
select throws_ok($$delete from public.team_members where team_id = 't2'$$,
  '23514', null, 'A: the last director of t2 cannot be removed');
with d as (delete from public.team_members
           where team_id = 't3' and user_id = '00000000-0000-0000-0000-00000000000a' returning 1)
select is(count(*)::int, 1, 'A: a coach can leave a team (A leaves t3)') from d;

reset role;
insert into public.team_members (team_id, user_id, role, invited_by) values
  ('t1', '00000000-0000-0000-0000-00000000000b', 'director', '00000000-0000-0000-0000-00000000000a');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';

select is((select count(*)::int from public.games), 1, 'B: as a new director, sees the games of t1');
with u as (update public.games set status = 'finished' where id = 'g1' returning updated_by)
select is(min(updated_by::text)::uuid, '00000000-0000-0000-0000-00000000000b'::uuid,
  'B: can update a game, and updated_by becomes B') from u;
with up as (
  insert into public.teams (id, club, name, created_by) values ('t1', 'Fut Academy', 'U12 B',
    '00000000-0000-0000-0000-00000000000b')
  on conflict (id) do update set name = excluded.name, created_by = excluded.created_by
  returning created_by
)
select is(min(created_by::text)::uuid, '00000000-0000-0000-0000-00000000000a'::uuid,
  'B: can upsert the team (even sending created_by); created_by stays A') from up;
with d as (delete from public.team_members
           where team_id = 't1' and user_id = '00000000-0000-0000-0000-00000000000a' returning 1)
select is(count(*)::int, 0, 'B: a director cannot remove another director') from d;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated"}';
with d as (delete from public.team_members
           where team_id = 't1' and user_id = '00000000-0000-0000-0000-00000000000a' returning 1)
select is(count(*)::int, 1, 'D (admin): with two directors, the admin can remove one (A)') from d;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select throws_ok($$delete from public.team_members
                   where team_id = 't1' and user_id = '00000000-0000-0000-0000-00000000000b'$$,
  '23514', null, 'B: now the last director, B cannot leave');

reset role;

select throws_ok($$update public.team_members set role = 'coach'
                   where team_id = 't1' and user_id = '00000000-0000-0000-0000-00000000000b'$$,
  '23514', null, 'service role / admin: cannot demote the last director either');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

select is((select count(*)::int from public.teams where id = 't1'), 0,
  'A: after being removed, no longer sees t1 (even as its creator)');
select is((select count(*)::int from public.games where team_id = 't1'), 0,
  'A: after being removed, no longer sees the games of t1');
with u as (update public.games set status = 'x' where team_id = 't1' returning 1)
select is(count(*)::int, 0, 'A: after being removed, cannot update the games of t1') from u;

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';

with d as (delete from public.team_members
           where team_id = 't1' and user_id = '00000000-0000-0000-0000-00000000000c' returning 1)
select is(count(*)::int, 1, 'C: a coach can leave the team') from d;
select is((select count(*)::int from public.teams), 0, 'C: after leaving, sees no teams');

-- =============================================================================================
-- Deleting a team or a user still works (cascades are not blocked by the last-director rule)
-- =============================================================================================
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

select lives_ok($$insert into public.players (id, team_id, name) values ('p20', 't2', 'Zé')$$,
  'A: can add a player to t2');
with d as (delete from public.teams where id = 't2' returning 1)
select is(count(*)::int, 1, 'A: a director can delete the team') from d;

reset role;

select is((select count(*)::int from public.team_members where team_id = 't2'), 0,
  'team delete: members removed');
select is((select count(*)::int from public.players where team_id = 't2')
        + (select count(*)::int from public.games where team_id = 't2'), 0,
  'team delete: players and games removed');
select lives_ok($$delete from auth.users where id = '00000000-0000-0000-0000-00000000000f'$$,
  'deleting a user who is the last director of a team works');
select is((select count(*)::int from public.team_members
           where user_id = '00000000-0000-0000-0000-00000000000f'), 0,
  'user delete: memberships removed');

-- =============================================================================================
-- Data checks (migration *_data_checks.sql): what can be stored, whoever writes it
-- =============================================================================================
reset role;
select is((select count(*)::int from pg_constraint
           where conname like any (array['teams\_%', 'players\_%', 'games\_%', 'accounts\_email\_length'])
             and contype = 'c' and not convalidated), 0,
  'checks: all data checks are validated on the existing rows');
select lives_ok($$insert into public.games (id, team_id, date, status, data) values
  ('gx', 't1', '2026-11-05', 'finished', '{"id":"gx","status":"finished","clock":{"running":false,"startedAt":null,"elapsedMs":4933,"period":2},"events":[{"id":"8fd5bc8d-3be5-4815-9e91-6a68654098b2","t":2167,"wall":1793918599972,"type":"goal","playerId":"643e009f-7634-4ccb-b6f0-9762103f0b5a"},{"id":"c593de1e-cc24-4a0c-b1da-af06fcc8e009","t":2501,"wall":1793918600306,"type":"oppgoal"}],"marks":[{"type":"start","period":1,"t":0,"wall":1793918597805},{"type":"end","period":1,"t":3466,"wall":1793918601271},{"type":"start","period":2,"t":3466,"wall":1793918605604},{"type":"end","period":2,"t":4933,"wall":1793918607071}],"alerted":{},"date":"2026-11-05","time":"22:00","opponent":"Rival","formatId":"U7","field":3,"periods":2,"periodMin":20,"maxExtra":10,"squad":["643e009f-7634-4ccb-b6f0-9762103f0b5a","c2501cd8-cb4e-4991-aba1-277e4b89c2a8","20779df4-6453-4308-ad29-15b8ca99944b","76bcd9e5-6733-4b32-8a2e-fc2cbc1eb7e8"],"starters":["643e009f-7634-4ccb-b6f0-9762103f0b5a","c2501cd8-cb4e-4991-aba1-277e4b89c2a8","20779df4-6453-4308-ad29-15b8ca99944b","76bcd9e5-6733-4b32-8a2e-fc2cbc1eb7e8"],"gkId":"643e009f-7634-4ccb-b6f0-9762103f0b5a","names":{"643e009f-7634-4ccb-b6f0-9762103f0b5a":{"name":"P1","number":"1","fullName":""},"c2501cd8-cb4e-4991-aba1-277e4b89c2a8":{"name":"P2","number":"2","fullName":""},"20779df4-6453-4308-ad29-15b8ca99944b":{"name":"P3","number":"3","fullName":""},"76bcd9e5-6733-4b32-8a2e-fc2cbc1eb7e8":{"name":"P4","number":"4","fullName":""}},"teamId":"t1","club":"Test FC","team":"U8","home":true,"round":"","formation":"2-1","lineup":["643e009f-7634-4ccb-b6f0-9762103f0b5a","c2501cd8-cb4e-4991-aba1-277e4b89c2a8","20779df4-6453-4308-ad29-15b8ca99944b","76bcd9e5-6733-4b32-8a2e-fc2cbc1eb7e8"],"autoStopped":null}')$$,
  'checks: a real game written by the app is accepted');
select throws_ok($$insert into public.games (id, team_id, status, data) values ('gy', 't1', 'hacked', '{}')$$,
  '23514', null, 'checks: unknown game status is refused');
select throws_ok($$insert into public.games (id, team_id, data) values ('gy', 't1', '[1, 2]')$$,
  '23514', null, 'checks: game data that is not an object is refused');
select throws_ok($$insert into public.games (id, team_id, data) values ('gy', 't1', '{"id":"other"}')$$,
  '23514', null, 'checks: game data with another id is refused');
select throws_ok($$insert into public.games (id, team_id, data) values ('gy', 't1', '{"teamId":"t3"}')$$,
  '23514', null, 'checks: game data with another team is refused');
select throws_ok($$insert into public.games (id, team_id, data) values ('gy', 't1', '{"events":"x"}')$$,
  '23514', null, 'checks: events that are not a list are refused');
select throws_ok($$insert into public.games (id, team_id, status, data) values ('gy', 't1', 'live', '{"status":"finished"}')$$,
  '23514', null, 'checks: a status that differs from the one in the data is refused');
select throws_ok($$insert into public.games (id, team_id, data)
  select 'gy', 't1', jsonb_build_object('events', jsonb_agg(jsonb_build_object('id', i))) from generate_series(1, 5001) i$$,
  '23514', null, 'checks: more than 5000 events are refused');
select throws_ok($$insert into public.games (id, team_id, data)
  select 'gy', 't1', jsonb_build_object('junk', string_agg(md5(i::text), '')) from generate_series(1, 40000) i$$,
  '23514', null, 'checks: a game document over 256 KB is refused');
select throws_ok($$insert into public.teams (id, club) values ('tx', repeat('x', 501))$$,
  '23514', null, 'checks: a 501-character club name is refused');
select throws_ok($$insert into public.players (id, team_id, name) values ('px', 't1', repeat('x', 501))$$,
  '23514', null, 'checks: a 501-character player name is refused');
select throws_ok($$insert into public.teams (id) values (repeat('x', 101))$$,
  '23514', null, 'checks: a 101-character id is refused');

-- service_role (Edge Functions) bypasses RLS.
set local role service_role;
set local request.jwt.claims = '{"role":"service_role"}';
select is((select count(*)::int from public.teams), 3, 'service_role: sees all teams');
select lives_ok($$insert into public.team_members (team_id, user_id, role, invited_by)
                  values ('t1', '00000000-0000-0000-0000-00000000000c', 'coach',
                          '00000000-0000-0000-0000-00000000000b')$$,
  'service_role: can add a member (invite)');
reset role;

select * from finish();
rollback;
