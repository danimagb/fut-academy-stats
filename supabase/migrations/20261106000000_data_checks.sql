-- Sanity checks on what can be stored (TypeScript plan, step 5.5).
--
-- Row Level Security decides WHO may write a team's rows; these CHECK constraints limit WHAT
-- can be written, for anyone calling the API directly. They are deliberately loose (the app
-- writes far less): the detailed checks on a game's events live in the app
-- (src/domain/validate.ts), which also checks everything it downloads.
--
-- Re-runnable: each constraint is dropped and added again. Constraints are added NOT VALID (so
-- existing rows don't block the migration) and then validated; if an existing row breaks one,
-- it stays NOT VALID (still enforced for new writes) and a notice names it. Find such rows with
-- the queries in the comments at the end.

-- ---------------------------------------------------------------------------------------------
-- Helper: (re)create a CHECK constraint, then try to validate it.
-- ---------------------------------------------------------------------------------------------
create or replace function pg_temp.add_check(_table regclass, _name text, _expr text)
returns void
language plpgsql
as $$
begin
  execute format('alter table %s drop constraint if exists %I', _table, _name);
  execute format('alter table %s add constraint %I check (%s) not valid', _table, _name, _expr);
  begin
    execute format('alter table %s validate constraint %I', _table, _name);
  exception when check_violation then
    raise notice 'Existing rows in % break %: it is enforced for new writes only', _table, _name;
  end;
end;
$$;

do $do$
begin
-- ---------------------------------------------------------------------------------------------
-- teams, players, accounts: ids and text of a sensible length
-- ---------------------------------------------------------------------------------------------
perform pg_temp.add_check('public.teams', 'teams_id_length', 'char_length(id) between 1 and 100');
perform pg_temp.add_check('public.teams', 'teams_text_length',
  'char_length(club) <= 500 and char_length(name) <= 500');

perform pg_temp.add_check('public.players', 'players_id_length', 'char_length(id) between 1 and 100');
perform pg_temp.add_check('public.players', 'players_text_length',
  'char_length(number) <= 500 and char_length(name) <= 500 and char_length(full_name) <= 500');

perform pg_temp.add_check('public.accounts', 'accounts_email_length', 'char_length(email) <= 320');

-- ---------------------------------------------------------------------------------------------
-- games: the status, the size of the game document and its basic shape
-- ---------------------------------------------------------------------------------------------
perform pg_temp.add_check('public.games', 'games_id_length', 'char_length(id) between 1 and 100');
perform pg_temp.add_check('public.games', 'games_status',
  $c$status is null or status in ('scheduled', 'live', 'break', 'finished')$c$);
-- 256 KB: a long game is a few KB; this only stops someone storing huge documents.
perform pg_temp.add_check('public.games', 'games_data_size', 'pg_column_size(data) <= 262144');
perform pg_temp.add_check('public.games', 'games_data_object', $c$jsonb_typeof(data) = 'object'$c$);
-- The id and team inside the document, when present, are the row's own.
perform pg_temp.add_check('public.games', 'games_data_ids',
  $c$(data->>'id' is null or data->>'id' = id) and (data->>'teamId' is null or data->>'teamId' = team_id)$c$);
-- Lists the app relies on are lists (when present), and a game has a sensible number of events.
perform pg_temp.add_check('public.games', 'games_data_lists', $c$
  coalesce(jsonb_typeof(data->'events'), 'array') = 'array'
  and coalesce(jsonb_typeof(data->'marks'), 'array') = 'array'
  and coalesce(jsonb_typeof(data->'squad'), 'array') = 'array'
  and coalesce(jsonb_typeof(data->'starters'), 'array') = 'array'
  and (jsonb_typeof(data->'events') is distinct from 'array' or jsonb_array_length(data->'events') <= 5000)
$c$);
-- The status inside the document matches the column (the app writes both).
perform pg_temp.add_check('public.games', 'games_data_status',
  $c$data->>'status' is null or status is null or data->>'status' = status$c$);
end;
$do$;

-- Rows that break a check (run in the SQL editor if the migration printed a notice):
--   select id from public.games where not (status is null or status in ('scheduled','live','break','finished'));
--   select id, pg_column_size(data) from public.games where pg_column_size(data) > 262144;
--   select id from public.games where data->>'id' <> id or data->>'teamId' <> team_id;
--   select id from public.teams where char_length(club) > 500 or char_length(name) > 500;
