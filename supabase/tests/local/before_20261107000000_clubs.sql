-- Data as it was before the clubs migration (accounts with a kind, 'director' roles, teams with a
-- club name only), so tests/clubs_migration.test.sql can check what the migration made of it.
-- Ids start with 5eed / 'seed-' so they don't clash with the RLS tests.

insert into auth.users (id, email) values
  ('5eed0000-0000-0000-0000-00000000000a', 'seed-admin@example.com'),
  ('5eed0000-0000-0000-0000-00000000000b', 'seed-coach@example.com'),
  ('5eed0000-0000-0000-0000-00000000000c', 'seed-other@example.com');

insert into public.accounts (user_id, email, kind, is_admin) values
  ('5eed0000-0000-0000-0000-00000000000a', 'seed-admin@example.com', 'director', true),
  ('5eed0000-0000-0000-0000-00000000000b', 'seed-coach@example.com', 'coach', false),
  ('5eed0000-0000-0000-0000-00000000000c', 'seed-other@example.com', 'director', false);

-- Inserted as the service role would (no signed-in user): the creator trigger needs created_by.
insert into public.teams (id, club, name, created_by) values
  ('seed-t1', 'Padroense FC', 'Sub-7B', '5eed0000-0000-0000-0000-00000000000a'),
  ('seed-t2', ' padroense fc ', 'Sub-8', '5eed0000-0000-0000-0000-00000000000a'),
  ('seed-t3', 'Other Club', 'Sub-10', '5eed0000-0000-0000-0000-00000000000c'),
  ('seed-t4', '', 'No club', '5eed0000-0000-0000-0000-00000000000c');

insert into public.team_members (team_id, user_id, role) values
  ('seed-t1', '5eed0000-0000-0000-0000-00000000000b', 'coach');

insert into public.players (id, team_id, name) values ('seed-p1', 'seed-t1', 'Rui');
insert into public.games (id, team_id, data) values ('seed-g1', 'seed-t1', '{}');
