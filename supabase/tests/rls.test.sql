-- RLS tests for the cloud sync schema (supabase/migrations/*_cloud_sync_schema.sql).
-- Run with `supabase test db`, or locally with supabase/tests/local/run.sh.
--
-- Users are simulated the way Supabase does it: switch to the anon or authenticated role and set
-- the JWT claims that auth.uid() reads. `reset role` goes back to the superuser for set-up and
-- for checking what really is in the tables. Everything is rolled back at the end.
--
--   A  00000000-0000-0000-0000-00000000000a  creates team t1 (director)
--   B  00000000-0000-0000-0000-00000000000b  second director of t1 (added later)
--   C  00000000-0000-0000-0000-00000000000c  coach of t1 (read-only)
--   O  00000000-0000-0000-0000-00000000000f  outsider (creates their own team t3)

begin;
select plan(114);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'c@example.com'),
  ('00000000-0000-0000-0000-00000000000f', 'o@example.com');

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
select throws_ok($$update public.team_members set role = 'director'
                   where user_id = '00000000-0000-0000-0000-00000000000c'$$,
  '42501', null, 'C: cannot promote themselves');
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
select is(count(*)::int, 1, 'B: with two directors, B can remove A') from d;
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

-- service_role (Edge Functions) bypasses RLS.
set local role service_role;
set local request.jwt.claims = '{"role":"service_role"}';
select is((select count(*)::int from public.teams), 2, 'service_role: sees all teams');
select lives_ok($$insert into public.team_members (team_id, user_id, role, invited_by)
                  values ('t1', '00000000-0000-0000-0000-00000000000c', 'coach',
                          '00000000-0000-0000-0000-00000000000b')$$,
  'service_role: can add a member (invite)');
reset role;

select * from finish();
rollback;
