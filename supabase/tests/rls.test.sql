-- RLS tests for the cloud schema (supabase/migrations/*.sql), with clubs (20261107000000_clubs.sql).
-- Run with `supabase test db`, or locally with supabase/tests/local/run.sh.
--
-- Users are simulated the way Supabase does it: switch to the anon or authenticated role and set
-- the JWT claims that auth.uid() reads. `reset role` goes back to the superuser for set-up and
-- for checking what really is in the tables. Everything is rolled back at the end.
--
--   user  id                                    in the tests
--   A     00000000-0000-0000-0000-00000000000a  club manager of c1 (Test FC)
--   M     00000000-0000-0000-0000-00000000000b  staff of c1, team manager of t1
--   C     00000000-0000-0000-0000-00000000000c  staff of c1, team coach of t1 (read-only)
--   S     00000000-0000-0000-0000-000000000005  staff of c1 without a role in any team
--   K     00000000-0000-0000-0000-00000000000f  club manager of c2 (another club)
--   G     00000000-0000-0000-0000-000000000007  staff of c2; account deleted by the admin
--   D     00000000-0000-0000-0000-00000000000d  the admin (in no club)
--   N     00000000-0000-0000-0000-000000000009  auth user without an account
--
-- The data the migration test seeds (ids 5eed... / seed-...) is in the database too, so the
-- admin's counts are compared with what is really there.

begin;
select plan(218);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'm@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'c@example.com'),
  ('00000000-0000-0000-0000-000000000005', 's@example.com'),
  ('00000000-0000-0000-0000-00000000000f', 'k@example.com'),
  ('00000000-0000-0000-0000-000000000007', 'g@example.com'),
  ('00000000-0000-0000-0000-00000000000d', 'd@example.com'),
  ('00000000-0000-0000-0000-000000000009', 'n@example.com');

-- Accounts are created by the admin (Edge Function, service role). M's email is in mixed case.
insert into public.accounts (user_id, email, is_admin) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com', false),
  ('00000000-0000-0000-0000-00000000000b', ' M@Example.COM', false),
  ('00000000-0000-0000-0000-00000000000c', 'c@example.com', false),
  ('00000000-0000-0000-0000-000000000005', 's@example.com', false),
  ('00000000-0000-0000-0000-00000000000f', 'k@example.com', false),
  ('00000000-0000-0000-0000-000000000007', 'g@example.com', false),
  ('00000000-0000-0000-0000-00000000000d', 'd@example.com', true);

insert into public.clubs (id, name) values ('c1', 'Test FC'), ('c2', 'Outro FC');
insert into public.club_members (club_id, user_id, role) values
  ('c1', '00000000-0000-0000-0000-00000000000a', 'manager'),
  ('c1', '00000000-0000-0000-0000-00000000000b', 'staff'),
  ('c1', '00000000-0000-0000-0000-00000000000c', 'staff'),
  ('c1', '00000000-0000-0000-0000-000000000005', 'staff'),
  ('c2', '00000000-0000-0000-0000-00000000000f', 'manager'),
  ('c2', '00000000-0000-0000-0000-000000000007', 'staff');

-- =============================================================================================
-- Anonymous (anon key, not signed in): nothing but ping
-- =============================================================================================
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select throws_ok('select * from public.clubs',        '42501', null, 'anon: cannot select clubs');
select throws_ok('select * from public.club_members', '42501', null, 'anon: cannot select club_members');
select throws_ok('select * from public.teams',        '42501', null, 'anon: cannot select teams');
select throws_ok('select * from public.players',      '42501', null, 'anon: cannot select players');
select throws_ok('select * from public.games',        '42501', null, 'anon: cannot select games');
select throws_ok('select * from public.team_members', '42501', null, 'anon: cannot select team_members');
select throws_ok('select * from public.accounts',     '42501', null, 'anon: cannot select accounts');
select throws_ok($$insert into public.clubs (id, name) values ('x', 'x')$$,
  '42501', null, 'anon: cannot insert clubs');
select throws_ok($$insert into public.teams (id, club_id) values ('x', 'c1')$$,
  '42501', null, 'anon: cannot insert teams');
select throws_ok($$insert into public.games (id, team_id, data) values ('x', 'x', '{}')$$,
  '42501', null, 'anon: cannot insert games');
select is((select count(*)::int from public.ping), 1, 'anon: can select ping');
select throws_ok('update public.ping set pinged_at = now()', '42501', null, 'anon: cannot update ping');
select throws_ok('select public.my_teams()', '42501', null, 'anon: cannot execute my_teams');
select throws_ok($$select public.is_club_manager('c1')$$, '42501', null, 'anon: cannot execute is_club_manager');
select throws_ok($$select public.can_read_team('t1')$$, '42501', null, 'anon: cannot execute can_read_team');
select throws_ok($$select public.can_play_team('t1')$$, '42501', null, 'anon: cannot execute can_play_team');
select throws_ok('select public.is_admin()', '42501', null, 'anon: cannot execute is_admin');
select throws_ok($$select public.manages_club_of('00000000-0000-0000-0000-00000000000a')$$,
  '42501', null, 'anon: cannot execute manages_club_of');

reset role;

-- =============================================================================================
-- What the clubs migration removed
-- =============================================================================================
select hasnt_column('public', 'accounts', 'kind', 'accounts.kind is gone');
select hasnt_function('public', 'add_team_coach', 'add_team_coach() is gone');
select hasnt_function('public', 'is_team_director', 'is_team_director() is gone');
select hasnt_function('public', 'can_create_teams', 'can_create_teams() is gone');
select throws_ok($$insert into public.team_members (team_id, user_id, role)
                   values ('seed-t1', '5eed0000-0000-0000-0000-00000000000b', 'director')$$,
  '23514', null, 'team_members: the director role no longer exists');
select throws_ok($$insert into public.club_members (club_id, user_id, role)
                   values ('c1', '00000000-0000-0000-0000-000000000007', 'coach')$$,
  '23514', null, 'club_members: only manager or staff');

-- =============================================================================================
-- Accounts: emails; nobody changes accounts through the API
-- =============================================================================================
select is((select email from public.accounts where user_id = '00000000-0000-0000-0000-00000000000b'),
  'm@example.com', 'accounts: email is stored lower-case and trimmed');
select throws_ok($$insert into public.accounts (user_id, email)
                   values ('00000000-0000-0000-0000-000000000009', 'C@EXAMPLE.COM')$$,
  '23505', null, 'accounts: email is unique, ignoring case');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000005","role":"authenticated"}';
select is((select string_agg(email, ',') from public.accounts), 's@example.com',
  'S (staff, no team): sees only their own account');
select throws_ok($$update public.accounts set is_admin = true where user_id = '00000000-0000-0000-0000-000000000005'$$,
  '42501', null, 'S: cannot make themselves admin');
with d as (delete from public.accounts where user_id = '00000000-0000-0000-0000-000000000005' returning 1)
select is(count(*)::int, 0, 'S: cannot delete their own account') from d;

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000009","role":"authenticated"}';
select is((select count(*)::int from public.accounts), 0, 'N: without an account, sees no accounts');
select is((select count(*)::int from public.clubs), 0, 'N: sees no clubs');
select throws_ok($$insert into public.accounts (user_id, email) values ('00000000-0000-0000-0000-000000000009', 'n@example.com')$$,
  '42501', null, 'N: cannot create their own account');
select throws_ok($$insert into public.teams (id, club_id, name) values ('tn', 'c1', 'x')$$,
  '42501', null, 'N: cannot create a team');
select is((select count(*)::int from public.my_teams()), 0, 'N: my_teams() is empty');

reset role;

-- =============================================================================================
-- Clubs: seen by their people; created and named by the admin; short name by its managers
-- =============================================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

select is((select string_agg(id, ',') from public.clubs), 'c1', 'A: sees only their club');
select ok(public.is_club_manager('c1') and not public.is_club_manager('c2'), 'A: is manager of c1 only');
select throws_ok($$insert into public.clubs (id, name) values ('cx', 'Mine')$$,
  '42501', null, 'A: a club manager cannot create a club');
with u as (update public.clubs set short_name = 'PFC' where id = 'c1' returning short_name)
select is(min(short_name), 'PFC', 'A: can set the short name of their club') from u;
select throws_ok($$update public.clubs set name = 'Renamed' where id = 'c1'$$,
  '42501', null, 'A: cannot rename their club (admin only)');
with u as (update public.clubs set short_name = 'X' where id = 'c2' returning 1)
select is(count(*)::int, 0, 'A: cannot change another club') from u;
with d as (delete from public.clubs where id = 'c1' returning 1)
select is(count(*)::int, 0, 'A: cannot delete their club') from d;
select is((select string_agg(user_id::text || ':' || role, ',' order by role, user_id) from public.club_members),
  '00000000-0000-0000-0000-00000000000a:manager,00000000-0000-0000-0000-000000000005:staff,'
  '00000000-0000-0000-0000-00000000000b:staff,00000000-0000-0000-0000-00000000000c:staff',
  'A: sees the people of their club (and no other club''s)');
select is((select string_agg(email, ',' order by email) from public.accounts),
  'a@example.com,c@example.com,m@example.com,s@example.com',
  'A: sees the accounts of their club''s people, no others');
select throws_ok($$insert into public.club_members (club_id, user_id, role)
                   values ('c1', '00000000-0000-0000-0000-000000000007', 'staff')$$,
  '42501', null, 'A: cannot add people to the club (admin only)');
with u as (update public.club_members set role = 'manager'
           where club_id = 'c1' and user_id = '00000000-0000-0000-0000-000000000005' returning 1)
select is(count(*)::int, 0, 'A: cannot make someone a club manager') from u;
with d as (delete from public.club_members
           where club_id = 'c1' and user_id = '00000000-0000-0000-0000-000000000005' returning 1)
select is(count(*)::int, 0, 'A: cannot remove people from the club') from d;

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000005","role":"authenticated"}';
select is((select string_agg(id || '/' || short_name, ',') from public.clubs), 'c1/PFC',
  'S (staff): sees their club, with its short name');
select is((select count(*)::int from public.club_members), 1, 'S: sees only their own club membership');
with u as (update public.clubs set short_name = 'S' where id = 'c1' returning 1)
select is(count(*)::int, 0, 'S: staff cannot change the club') from u;
with u as (update public.club_members set role = 'manager'
           where user_id = '00000000-0000-0000-0000-000000000005' returning 1)
select is(count(*)::int, 0, 'S: cannot make themselves a club manager') from u;

reset role;

-- =============================================================================================
-- Club manager A creates teams in their club and manages players and games
-- =============================================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';

-- Client-sent club, created_by and updated_at are ignored.
with ins as (
  insert into public.teams (id, club_id, club, name, created_by, updated_at)
  values ('t1', 'c1', 'Whatever', 'Sub-7B', '00000000-0000-0000-0000-00000000000f', '2000-01-01')
  returning club
)
select is(min(club), 'Test FC', 'A: insert team ... returning works; club is the club''s name') from ins;
select is((select created_by from public.teams where id = 't1'),
  '00000000-0000-0000-0000-00000000000a'::uuid, 'A: teams.created_by is set to auth.uid()');
select ok((select updated_at > '2020-01-01' from public.teams where id = 't1'),
  'A: teams.updated_at is set by the server');
select is((select count(*)::int from public.team_members where team_id = 't1'), 0,
  'A: creating a team gives nobody a team role (the club manager reaches it through the club)');
select is((select string_agg(team_id || ':' || role, ',') from public.my_teams()), 't1:club_manager',
  'A: my_teams() lists t1 as club_manager');

with up as (
  insert into public.teams (id, club_id, name) values ('t1', 'c1', 'Sub-7A')
  on conflict (id) do update set name = excluded.name, club_id = excluded.club_id
  returning name
)
select is(min(name), 'Sub-7A', 'A: upsert of an existing team updates it') from up;
with up as (
  insert into public.teams (id, club_id, name) values ('t1b', 'c1', 'Sub-8')
  on conflict (id) do update set name = excluded.name
  returning id
)
select is(count(*)::int, 1, 'A: upsert of a new team inserts it') from up;
select throws_ok($$insert into public.teams (id, club_id, name) values ('tx', 'c2', 'x')$$,
  '42501', null, 'A: cannot create a team in another club');
select throws_ok($$insert into public.teams (id, name) values ('tx', 'x')$$,
  '42501', null, 'A: cannot create a team without a club');
select throws_ok($$update public.teams set club_id = 'c2' where id = 't1'$$,
  '42501', null, 'A: cannot move a team to another club');
select throws_ok($$update public.teams set id = 't1-new' where id = 't1'$$,
  '23514', null, 'A: cannot change a team id');
with u as (update public.teams set created_by = '00000000-0000-0000-0000-00000000000f'
           where id = 't1' returning created_by)
select is(min(created_by::text)::uuid, '00000000-0000-0000-0000-00000000000a'::uuid,
  'A: teams.created_by cannot be changed (kept as is)') from u;

select lives_ok($$
  insert into public.players (id, team_id, number, name, full_name, updated_at) values
    ('p1', 't1', '7', 'Rui', 'Rui Costa', '2000-01-01'),
    ('p2', 't1', '9', 'Ana', 'Ana Silva', '2000-01-01')
  on conflict (id) do update set team_id = excluded.team_id, number = excluded.number,
    name = excluded.name, full_name = excluded.full_name, deleted_at = excluded.deleted_at
$$, 'A: can upsert new players');
select ok((select bool_and(updated_at > '2020-01-01') from public.players where team_id = 't1'),
  'A: players.updated_at is set by the server, not the client');
do $$ begin
  perform set_config('test.p1_updated_at',
    (select updated_at::text from public.players where id = 'p1'), true);
end $$;
with u as (update public.players set number = '10' where id = 'p1' returning 1)
select is(count(*)::int, 1, 'A: can update a player') from u;
select ok((select updated_at > current_setting('test.p1_updated_at')::timestamptz
           from public.players where id = 'p1'),
  'A: players.updated_at advances on update');
with u as (update public.players set deleted_at = now() where id = 'p2' returning 1)
select is(count(*)::int, 1, 'A: can soft-delete a player') from u;
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
with u as (update public.games set team_id = 't1b' where id = 'g2' returning 1)
select is(count(*)::int, 1, 'A: can move a game between two teams of their club') from u;
with u as (update public.games set team_id = 't1' where id = 'g2' returning 1)
select is(count(*)::int, 1, 'A: and back') from u;
select throws_ok($$update public.games set id = 'g1-new' where id = 'g1'$$,
  '23514', null, 'A: cannot change a game id');

-- A finished game: existing events can be edited or removed, nothing new is recorded
-- (20261105000000_lock_finished_games.sql).
select lives_ok($$
  insert into public.games (id, team_id, status, data) values ('g4', 't1', 'finished',
    '{"status":"finished","events":[{"id":"e1","type":"goal","playerId":"p1"}]}')
$$, 'A: can insert a finished game with its events');
with up as (
  insert into public.games (id, team_id, status, data) values ('g4', 't1', 'finished',
    '{"status":"finished","events":[{"id":"e1","type":"goal","playerId":"p1"},{"id":"e2","type":"yellow","playerId":"p1"}]}')
  on conflict (id) do update set status = excluded.status, data = excluded.data
  returning data
)
select is((select jsonb_path_query_array(data, '$.events[*].id') from up), '["e1"]'::jsonb,
  'finished game: a new event is dropped');
with up as (
  insert into public.games (id, team_id, status, data) values ('g4', 't1', 'finished',
    '{"status":"finished","events":[{"id":"e1","type":"goal","playerId":"p2"}]}')
  on conflict (id) do update set status = excluded.status, data = excluded.data
  returning data
)
select is((select data #>> '{events,0,playerId}' from up), 'p2',
  'finished game: an existing goal can be edited (scorer changed)');
with up as (
  insert into public.games (id, team_id, status, data) values ('g4', 't1', 'live',
    '{"status":"live","events":[{"id":"e9","type":"goal","playerId":"p1"}]}')
  on conflict (id) do update set status = excluded.status, data = excluded.data
  returning status, data
)
select is((select status || ' ' || (data ->> 'status') || ' ' || (data #>> '{events,0,playerId}') from up),
  'finished finished p2', 'finished game: cannot go back to live (data and status kept)');
with d as (delete from public.games where id = 'g4' returning 1)
select is(count(*)::int, 1, 'A: can hard-delete a finished game') from d;

select throws_ok('truncate public.players', '42501', null, 'authenticated: cannot truncate (TRUNCATE ignores RLS)');

-- =============================================================================================
-- A gives the club's people roles in the club's teams
-- =============================================================================================
with ins as (
  insert into public.team_members (team_id, user_id, role, invited_by) values
    ('t1', '00000000-0000-0000-0000-00000000000b', 'manager', '00000000-0000-0000-0000-00000000000f'),
    ('t1', '00000000-0000-0000-0000-00000000000c', 'manager', null)
  returning 1
)
select is(count(*)::int, 2, 'A: can give club staff roles in a club team') from ins;
select is((select string_agg(distinct invited_by::text, ',') from public.team_members where team_id = 't1'),
  '00000000-0000-0000-0000-00000000000a', 'A: invited_by is the club manager (client value ignored)');
with u as (update public.team_members set role = 'coach'
           where team_id = 't1' and user_id = '00000000-0000-0000-0000-00000000000c' returning role)
select is(min(role), 'coach', 'A: can change a role') from u;
with up as (
  insert into public.team_members (team_id, user_id, role)
  values ('t1b', '00000000-0000-0000-0000-00000000000c', 'manager')
  on conflict (team_id, user_id) do update set role = excluded.role
  returning role
)
select is(min(role), 'manager', 'A: can upsert a role (C manager of t1b)') from up;
with d as (delete from public.team_members
           where team_id = 't1b' and user_id = '00000000-0000-0000-0000-00000000000c' returning 1)
select is(count(*)::int, 1, 'A: can remove a role') from d;
select throws_ok($$insert into public.team_members (team_id, user_id, role)
                   values ('t1', '00000000-0000-0000-0000-000000000007', 'coach')$$,
  '23514', null, 'A: cannot give a role to someone outside the club');
select throws_ok($$insert into public.team_members (team_id, user_id, role)
                   values ('t1', '00000000-0000-0000-0000-000000000009', 'coach')$$,
  '23514', null, 'A: cannot give a role to someone without an account');
select is((select string_agg(email, ',' order by email) from public.accounts),
  'a@example.com,c@example.com,m@example.com,s@example.com',
  'A: still sees only their club''s accounts');

reset role;

-- =============================================================================================
-- Team manager M of t1: players and games, not the team or its staff
-- =============================================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';

select is((select string_agg(id, ',') from public.teams), 't1', 'M: sees only t1');
select is((select string_agg(team_id || ':' || role, ',') from public.my_teams()), 't1:team_manager',
  'M: my_teams() lists t1 as team_manager');
select is((select count(*)::int from public.games), 2, 'M: sees the games of t1');
select is((select count(*)::int from public.team_members), 2, 'M: sees the staff of t1');
select is((select string_agg(email, ',' order by email) from public.accounts),
  'c@example.com,m@example.com', 'M: sees the accounts of teammates (and own), no others');
select is((select count(*)::int from public.club_members), 1, 'M: sees only their own club membership');
select is((select string_agg(id, ',') from public.clubs), 'c1', 'M: sees their club');

with ins as (insert into public.players (id, team_id, name) values ('p3', 't1', 'Zé') returning 1)
select is(count(*)::int, 1, 'M: can add a player') from ins;
with u as (update public.players set name = 'Zé M.' where id = 'p3' returning 1)
select is(count(*)::int, 1, 'M: can edit a player') from u;
with d as (delete from public.players where id = 'p3' returning 1)
select is(count(*)::int, 1, 'M: can remove a player') from d;
with ins as (insert into public.games (id, team_id, data) values ('g3', 't1', '{}') returning 1)
select is(count(*)::int, 1, 'M: can create a game') from ins;
with u as (update public.games set status = 'live', data = '{"status":"live"}' where id = 'g3' returning updated_by)
select is(min(updated_by::text)::uuid, '00000000-0000-0000-0000-00000000000b'::uuid,
  'M: can run a game (updated_by = M)') from u;
with u as (update public.games set status = 'finished', data = '{"status":"finished"}' where id = 'g3' returning 1)
select is(count(*)::int, 1, 'M: can finish a game') from u;
with d as (delete from public.games where id = 'g3' returning 1)
select is(count(*)::int, 1, 'M: can delete a game') from d;
select throws_ok($$update public.games set team_id = 't1b' where id = 'g1'$$,
  '42501', null, 'M: cannot move a game to a team they don''t manage');

with u as (update public.teams set name = 'hacked' where id = 't1' returning 1)
select is(count(*)::int, 0, 'M: cannot rename the team') from u;
with d as (delete from public.teams where id = 't1' returning 1)
select is(count(*)::int, 0, 'M: cannot delete the team') from d;
select throws_ok($$
  insert into public.teams (id, club_id, name) values ('t1', 'c1', 'hacked')
  on conflict (id) do update set name = excluded.name
$$, '42501', null, 'M: cannot upsert the team');
select throws_ok($$insert into public.team_members (team_id, user_id, role)
                   values ('t1', '00000000-0000-0000-0000-000000000005', 'coach')$$,
  '42501', null, 'M: cannot give roles in the team');
with u as (update public.team_members set role = 'manager'
           where team_id = 't1' and user_id = '00000000-0000-0000-0000-00000000000c' returning 1)
select is(count(*)::int, 0, 'M: cannot change roles') from u;
with d as (delete from public.team_members
           where team_id = 't1' and user_id = '00000000-0000-0000-0000-00000000000c' returning 1)
select is(count(*)::int, 0, 'M: cannot remove the coach') from d;
with u as (update public.clubs set short_name = 'M' where id = 'c1' returning 1)
select is(count(*)::int, 0, 'M: cannot change the club') from u;

reset role;

-- =============================================================================================
-- Team coach C of t1: read-only
-- =============================================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';

select is((select string_agg(team_id || ':' || role, ',') from public.my_teams()), 't1:team_coach',
  'C: my_teams() lists t1 as team_coach');
select is((select count(*)::int from public.teams), 1, 'C: sees t1');
select is((select count(*)::int from public.players), 1, 'C: sees the players of t1');
select is((select count(*)::int from public.games), 2, 'C: sees the games of t1');
select ok(public.can_read_team('t1') and not public.can_play_team('t1'), 'C: reads t1 but cannot write it');

with u as (update public.teams set name = 'hacked' where id = 't1' returning 1)
select is(count(*)::int, 0, 'C: cannot update the team') from u;
select throws_ok($$insert into public.players (id, team_id, name) values ('p9', 't1', 'x')$$,
  '42501', null, 'C: cannot insert a player');
with u as (update public.players set name = 'hacked' where id = 'p1' returning 1)
select is(count(*)::int, 0, 'C: cannot update a player') from u;
with d as (delete from public.players where id = 'p1' returning 1)
select is(count(*)::int, 0, 'C: cannot delete a player') from d;
select throws_ok($$
  insert into public.players (id, team_id, name) values ('p1', 't1', 'hacked')
  on conflict (id) do update set name = excluded.name
$$, '42501', null, 'C: cannot upsert over an existing player');
select throws_ok($$insert into public.games (id, team_id, data) values ('g9', 't1', '{}')$$,
  '42501', null, 'C: cannot insert a game');
with u as (update public.games set data = '{"hacked":true}' where id = 'g1' returning 1)
select is(count(*)::int, 0, 'C: cannot update a game') from u;
with u as (update public.games set deleted_at = now() where id = 'g1' returning 1)
select is(count(*)::int, 0, 'C: cannot soft-delete a game') from u;
select throws_ok($$
  insert into public.games (id, team_id, data) values ('g1', 't1', '{"hacked":true}')
  on conflict (id) do update set data = excluded.data
$$, '42501', null, 'C: cannot upsert over an existing game');
with u as (update public.team_members set role = 'manager'
           where user_id = '00000000-0000-0000-0000-00000000000c' returning 1)
select is(count(*)::int, 0, 'C: cannot promote themselves') from u;

reset role;

select is((select name from public.teams where id = 't1'), 'Sub-7A', 'after M and C: team unchanged');
select is((select name || '/' || (deleted_at is null) from public.players where id = 'p1'),
  'Rui/true', 'after C: player unchanged');
select is((select (data ? 'hacked')::text || '/' || (deleted_at is null) from public.games where id = 'g1'),
  'false/true', 'after C: game unchanged');

-- =============================================================================================
-- Staff S of c1 without a team role: sees the club, no teams
-- =============================================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000005","role":"authenticated"}';

select is((select count(*)::int from public.teams), 0, 'S: sees no teams');
select is((select count(*)::int from public.players) + (select count(*)::int from public.games), 0,
  'S: sees no players or games');
select is((select count(*)::int from public.my_teams()), 0, 'S: my_teams() is empty');
select throws_ok($$insert into public.teams (id, club_id, name) values ('ts', 'c1', 'x')$$,
  '42501', null, 'S: staff cannot create teams');
select throws_ok($$insert into public.team_members (team_id, user_id, role)
                   values ('t1', '00000000-0000-0000-0000-000000000005', 'manager')$$,
  '42501', null, 'S: cannot give themselves a role');

reset role;

-- =============================================================================================
-- Club manager K of another club: nothing of c1
-- =============================================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000f","role":"authenticated"}';

select is((select string_agg(id, ',') from public.clubs), 'c2', 'K: sees only their own club');
select is((select count(*)::int from public.teams), 0, 'K: sees no teams of c1');
select is((select count(*)::int from public.players) + (select count(*)::int from public.games), 0,
  'K: sees no players or games of c1');
select is((select count(*)::int from public.team_members), 0, 'K: sees no staff of c1');
select ok(not public.can_read_team('t1') and not public.can_manage_team('t1'), 'K: no access to t1');
select is((select string_agg(email, ',' order by email) from public.accounts),
  'g@example.com,k@example.com', 'K: sees only their club''s accounts');

select lives_ok($$insert into public.teams (id, club_id, name) values ('t2', 'c2', 'Sub-10')$$,
  'K: can create a team in their club');
select lives_ok($$insert into public.team_members (team_id, user_id, role)
                  values ('t2', '00000000-0000-0000-0000-000000000007', 'coach')$$,
  'K: can give their staff a role');
select throws_ok($$insert into public.team_members (team_id, user_id, role)
                   values ('t2', '00000000-0000-0000-0000-000000000005', 'manager')$$,
  '23514', null, 'K: cannot give a role to staff of another club');
select throws_ok($$insert into public.team_members (team_id, user_id, role)
                   values ('t1', '00000000-0000-0000-0000-000000000005', 'coach')$$,
  '42501', null, 'K: cannot give roles in a team of another club');
select throws_ok($$insert into public.players (id, team_id, name) values ('p9', 't1', 'x')$$,
  '42501', null, 'K: cannot insert a player into t1');
select throws_ok($$
  insert into public.games (id, team_id, data) values ('g1', 't2', '{}')
  on conflict (id) do update set team_id = excluded.team_id, data = excluded.data
$$, '42501', null, 'K: cannot pull a game of t1 into their team with an upsert');
select throws_ok($$
  insert into public.teams (id, club_id, name) values ('t1', 'c2', 'Mine')
  on conflict (id) do update set club_id = excluded.club_id, name = excluded.name
$$, '42501', null, 'K: cannot claim t1 with an upsert');
select throws_ok($$insert into public.teams (id, club_id, name) values ('t1', 'c2', 'Mine')$$,
  '23505', null, 'K: cannot claim t1 with a plain insert');
with u as (update public.teams set name = 'hacked' where id = 't1' returning 1)
select is(count(*)::int, 0, 'K: cannot update t1') from u;
with d as (delete from public.team_members where team_id = 't1' returning 1)
select is(count(*)::int, 0, 'K: cannot remove the staff of t1') from d;

reset role;

select is((select club_id || '/' || name from public.teams where id = 't1'), 'c1/Sub-7A', 'after K: t1 unchanged');
select is((select team_id from public.games where id = 'g1'), 't1', 'after K: g1 still in t1');
select is((select count(*)::int from public.team_members where team_id = 't1'), 2, 'after K: staff of t1 unchanged');

-- =============================================================================================
-- Club logos (20261108000000_club_logos.sql): written by the club's managers and the admin
-- =============================================================================================
select is((select public::text || '/' || file_size_limit from storage.buckets where id = 'club-logos'),
  'true/524288', 'logos: the club-logos bucket is public, 512 KB at most');

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
select throws_ok($$insert into storage.objects (bucket_id, name) values ('club-logos', 'c1/logo')$$,
  '42501', null, 'anon: cannot upload a logo');
select throws_ok($$select public.set_club_logo('c1', true)$$, '42501', null, 'anon: cannot execute set_club_logo');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select lives_ok($$insert into storage.objects (bucket_id, name) values ('club-logos', 'c1/logo')$$,
  'A: a club manager can upload their club''s logo');
select throws_ok($$insert into storage.objects (bucket_id, name) values ('club-logos', 'c2/logo')$$,
  '42501', null, 'A: cannot upload another club''s logo');
with u as (update storage.objects set metadata = '{}' where name = 'c1/logo' returning 1)
select is(count(*)::int, 1, 'A: can replace their club''s logo') from u;
select is(public.set_club_logo('c1', true), 1, 'A: set_club_logo gives the first logo version 1');
select is(public.set_club_logo('c1', true), 2, 'A: a new logo bumps the version');
select throws_ok($$select public.set_club_logo('c2', true)$$, '42501', null, 'A: cannot set another club''s logo');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select throws_ok($$insert into storage.objects (bucket_id, name) values ('club-logos', 'c1/other')$$,
  '42501', null, 'M (team manager): cannot upload the club''s logo');
with d as (delete from storage.objects where name = 'c1/logo' returning 1)
select is(count(*)::int, 0, 'M: cannot delete the club''s logo') from d;
select throws_ok($$select public.set_club_logo('c1', false)$$, '42501', null, 'M: cannot remove the club''s logo');
select is((select logo_version from public.clubs where id = 'c1'), 2, 'M: sees the club''s logo version');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000f","role":"authenticated"}';
with d as (delete from storage.objects where name = 'c1/logo' returning 1)
select is(count(*)::int, 0, 'K (another club): cannot delete c1''s logo') from d;

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
with d as (delete from storage.objects where name = 'c1/logo' returning 1)
select is(count(*)::int, 1, 'A: can delete their club''s logo') from d;
select is(public.set_club_logo('c1', false), null::int, 'A: removing the logo clears the version');

reset role;

-- =============================================================================================
-- Admin D: clubs and people; sees all teams and staff (not players or games)
-- =============================================================================================
do $$ begin
  perform set_config('test.n_clubs',    (select count(*)::text from public.clubs), true);
  perform set_config('test.n_teams',    (select count(*)::text from public.teams), true);
  perform set_config('test.n_members',  (select count(*)::text from public.team_members), true);
  perform set_config('test.n_people',   (select count(*)::text from public.club_members), true);
  perform set_config('test.n_accounts', (select count(*)::text from public.accounts), true);
end $$;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated"}';

select is((select count(*)::int from public.clubs), current_setting('test.n_clubs')::int, 'D (admin): sees all clubs');
select is((select count(*)::int from public.teams), current_setting('test.n_teams')::int, 'D (admin): sees all teams');
select is((select count(*)::int from public.team_members), current_setting('test.n_members')::int,
  'D (admin): sees all team staff');
select is((select count(*)::int from public.club_members), current_setting('test.n_people')::int,
  'D (admin): sees all club people');
select is((select count(*)::int from public.accounts), current_setting('test.n_accounts')::int,
  'D (admin): sees all accounts');
select is((select count(*)::int from public.players) + (select count(*)::int from public.games), 0,
  'D (admin): sees no players or games of clubs they are not in');
with u as (update public.players set name = 'hacked' where id = 'p1' returning 1)
select is(count(*)::int, 0, 'D (admin): cannot edit players of a club they are not in') from u;

select lives_ok($$insert into public.clubs (id, name, short_name) values ('c3', 'Novo Clube', 'NC')$$,
  'D (admin): can create a club');
select is((select created_by from public.clubs where id = 'c3'), '00000000-0000-0000-0000-00000000000d'::uuid,
  'D (admin): clubs.created_by is set to auth.uid()');
select throws_ok($$insert into public.clubs (id, name) values ('c4', ' test fc ')$$,
  '23505', null, 'clubs: two clubs cannot have the same name (case and spaces ignored)');
with u as (update public.clubs set name = 'Test F.C.' where id = 'c1' returning 1)
select is(count(*)::int, 1, 'D (admin): can rename a club') from u;
select is((select club from public.teams where id = 't1'), 'Test F.C.',
  'D (admin): the new club name reaches its teams');
select lives_ok($$insert into public.club_members (club_id, user_id, role)
                  values ('c3', '00000000-0000-0000-0000-000000000005', 'manager')$$,
  'D (admin): can add someone to a club as manager');
with u as (update public.club_members set role = 'staff'
           where club_id = 'c3' and user_id = '00000000-0000-0000-0000-000000000005' returning role)
select is(min(role), 'staff', 'D (admin): can change a club role') from u;
select lives_ok($$insert into public.team_members (team_id, user_id, role)
                  values ('t1', '00000000-0000-0000-0000-000000000005', 'coach')$$,
  'D (admin): can give a role in any team');
select lives_ok($$insert into public.teams (id, club_id, name) values ('t3', 'c3', 'Sub-12')$$,
  'D (admin): can create a team in any club');
with d as (delete from public.clubs where id = 'c3' returning 1)
select is(count(*)::int, 0, 'D (admin): cannot delete a club that still has teams') from d;
with d as (delete from public.teams where id = 't3' returning 1)
select is(count(*)::int, 1, 'D (admin): can delete a team') from d;
with d as (delete from public.clubs where id = 'c3' returning 1)
select is(count(*)::int, 1, 'D (admin): can delete a club without teams') from d;

-- Removing someone from a club removes their roles in its teams.
with d as (delete from public.club_members
           where club_id = 'c1' and user_id = '00000000-0000-0000-0000-000000000005' returning 1)
select is(count(*)::int, 1, 'D (admin): can remove someone from a club') from d;
select is((select count(*)::int from public.team_members where user_id = '00000000-0000-0000-0000-000000000005'), 0,
  'leaving a club removes the person''s roles in its teams');

-- Moving a team to another club keeps only the roles of that club's people.
with u as (update public.teams set club_id = 'c1' where id = 't2' returning club)
select is(min(club), 'Test F.C.', 'D (admin): can move a team to another club') from u;
select is((select count(*)::int from public.team_members where team_id = 't2'), 0,
  'a moved team loses the roles of people outside the new club');
with u as (update public.teams set club_id = 'c2' where id = 't2' returning 1)
select is(count(*)::int, 1, 'D (admin): moves it back') from u;

select throws_ok($$update public.accounts set is_admin = true where user_id = '00000000-0000-0000-0000-00000000000c'$$,
  '42501', null, 'D (admin): cannot set is_admin through the API');
select throws_ok($$update public.accounts set email = 'x@example.com' where user_id = '00000000-0000-0000-0000-00000000000c'$$,
  '42501', null, 'D (admin): cannot change an email through the API');
with d as (delete from public.accounts where user_id = '00000000-0000-0000-0000-00000000000d' returning 1)
select is(count(*)::int, 0, 'D (admin): cannot delete their own account') from d;
with d as (delete from public.accounts where user_id = '00000000-0000-0000-0000-000000000007' returning 1)
select is(count(*)::int, 1, 'D (admin): can delete another account') from d;

reset role;
select is((select count(*)::int from public.club_members where user_id = '00000000-0000-0000-0000-000000000007')
        + (select count(*)::int from public.team_members where user_id = '00000000-0000-0000-0000-000000000007'), 0,
  'account delete: the person''s club and team roles are removed');

-- =============================================================================================
-- Leaving a team; deleting teams and users
-- =============================================================================================
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';
with d as (delete from public.team_members
           where team_id = 't1' and user_id = '00000000-0000-0000-0000-00000000000c' returning 1)
select is(count(*)::int, 1, 'C: can leave the team') from d;
select is((select count(*)::int from public.teams), 0, 'C: after leaving, sees no teams');

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
with d as (delete from public.team_members
           where team_id = 't1' and user_id = '00000000-0000-0000-0000-00000000000b' returning 1)
select is(count(*)::int, 1, 'A: can remove the team manager (a team may have none)') from d;

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select is((select count(*)::int from public.games where team_id = 't1'), 0,
  'M: after being removed, no longer sees the games of t1');
with u as (update public.games set data = '{}' where team_id = 't1' returning 1)
select is(count(*)::int, 0, 'M: after being removed, cannot update the games of t1') from u;

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
with u as (update public.teams set deleted_at = now() where id = 't1b' returning 1)
select is(count(*)::int, 1, 'A: can soft-delete a team') from u;
select is((select string_agg(team_id, ',' order by team_id) from public.my_teams()), 't1,t1b',
  'A: my_teams() still lists a soft-deleted team (so the phone removes it)');
with d as (delete from public.teams where id = 't1b' returning 1)
select is(count(*)::int, 1, 'A: can delete a team') from d;

reset role;
set local request.jwt.claims = '{}';  -- as in the dashboard: no signed-in user
select lives_ok($$delete from auth.users where id = '00000000-0000-0000-0000-00000000000a'$$,
  'deleting a club manager''s user works');
select is((select count(*)::int from public.teams where id = 't1'), 1, 'user delete: their club''s teams stay');

-- =============================================================================================
-- Data checks (migrations *_data_checks.sql and *_clubs.sql): what can be stored
-- =============================================================================================
select is((select count(*)::int from pg_constraint
           where conname like any (array['teams\_%', 'players\_%', 'games\_%', 'clubs\_%', 'accounts\_email\_length'])
             and contype = 'c' and not convalidated), 0,
  'checks: all data checks are validated on the existing rows');
select throws_ok($$insert into public.games (id, team_id, status, data) values ('gy', 't1', 'hacked', '{}')$$,
  '23514', null, 'checks: unknown game status is refused');
select throws_ok($$insert into public.games (id, team_id, data) values ('gy', 't1', '{"teamId":"t2"}')$$,
  '23514', null, 'checks: game data with another team is refused');
select throws_ok($$insert into public.games (id, team_id, data)
  select 'gy', 't1', jsonb_build_object('junk', string_agg(md5(i::text), '')) from generate_series(1, 40000) i$$,
  '23514', null, 'checks: a game document over 256 KB is refused');
select throws_ok($$insert into public.players (id, team_id, name) values ('px', 't1', repeat('x', 501))$$,
  '23514', null, 'checks: a 501-character player name is refused');
select throws_ok($$insert into public.clubs (id, name) values ('cy', '  ')$$,
  '23514', null, 'checks: a club needs a name');
select throws_ok($$insert into public.clubs (id, name) values ('cy', repeat('x', 201))$$,
  '23514', null, 'checks: a 201-character club name is refused');
select throws_ok($$insert into public.clubs (id, name, short_name) values ('cy', 'Y', repeat('x', 21))$$,
  '23514', null, 'checks: a 21-character short name is refused');

-- service_role (Edge Functions) bypasses RLS.
set local role service_role;
set local request.jwt.claims = '{"role":"service_role"}';
select is((select count(*)::int from public.clubs), current_setting('test.n_clubs')::int, 'service_role: sees all clubs');
select lives_ok($$insert into public.club_members (club_id, user_id, role, invited_by)
                  values ('c2', '00000000-0000-0000-0000-000000000005', 'staff', '00000000-0000-0000-0000-00000000000d')$$,
  'service_role: can add someone to a club (invite)');
select is((select invited_by from public.club_members where club_id = 'c2' and user_id = '00000000-0000-0000-0000-000000000005'),
  '00000000-0000-0000-0000-00000000000d'::uuid, 'service_role: invited_by is kept as given');
reset role;

select * from finish();
rollback;
