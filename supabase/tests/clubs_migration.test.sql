-- What 20261107000000_clubs.sql made of the data that was there before it
-- (supabase/tests/local/before_20261107000000_clubs.sql; only run by tests/local/run.sh, which
-- seeds that data before applying the migration).

begin;
select plan(13);

-- Without the seeded data (e.g. `supabase test db`), there is nothing to check.
select exists (select 1 from public.teams where id = 'seed-t1') as seeded \gset
\if :seeded

select is((select count(*)::int from public.clubs where lower(btrim(name)) = 'padroense fc'), 1,
  'one club for "Padroense FC" and " padroense fc " (case and spaces ignored)');
select is((select c.name from public.clubs c join public.teams t on t.club_id = c.id where t.id = 'seed-t1'),
  'Padroense FC', 'the club takes the name as the oldest team wrote it (trimmed)');
select is((select count(distinct club_id)::int from public.teams where id in ('seed-t1', 'seed-t2')), 1,
  'both Padroense teams are in the same club');
select is((select club from public.teams where id = 'seed-t2'), 'Padroense FC',
  'teams.club becomes the club''s name');
select isnt((select club_id from public.teams where id = 'seed-t3'),
  (select club_id from public.teams where id = 'seed-t1'), 'another club name gets its own club');
select is((select c.name from public.clubs c join public.teams t on t.club_id = c.id where t.id = 'seed-t4'),
  'Club', 'a team without a club name goes into a club called "Club"');
select is((select count(*)::int from public.teams where club_id is null), 0, 'every team has a club');

select is((select role from public.club_members m join public.teams t on t.club_id = m.club_id
           where t.id = 'seed-t1' and m.user_id = '5eed0000-0000-0000-0000-00000000000a'),
  'manager', 'the admin who directed Padroense teams is a manager of the club');
select is((select role from public.club_members m join public.teams t on t.club_id = m.club_id
           where t.id = 'seed-t1' and m.user_id = '5eed0000-0000-0000-0000-00000000000b'),
  'staff', 'a coach of a Padroense team is staff of the club');
select is((select role from public.club_members m join public.teams t on t.club_id = m.club_id
           where t.id = 'seed-t3' and m.user_id = '5eed0000-0000-0000-0000-00000000000c'),
  'staff', 'a non-admin director becomes staff of the club');

select is((select role from public.team_members
           where team_id = 'seed-t1' and user_id = '5eed0000-0000-0000-0000-00000000000a'),
  'manager', 'the old director role is now manager');
select is((select role from public.team_members
           where team_id = 'seed-t1' and user_id = '5eed0000-0000-0000-0000-00000000000b'),
  'coach', 'coaches stay coaches');
select is((select count(*)::int from public.players where id = 'seed-p1')
        + (select count(*)::int from public.games where id = 'seed-g1'), 2,
  'players and games are untouched');

\else
select skip('no data from before the migration (only tests/local/run.sh seeds it)', 13);
\endif

select * from finish();
rollback;
