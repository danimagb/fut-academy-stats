-- Fut Academy Stats: nothing new is recorded in a finished game.
--
-- Once a game is finished (games.status = 'finished'), an update may still edit or remove its
-- existing events (e.g. change a goal's scorer) and its other details, but:
--  * events whose id wasn't in the game before are dropped;
--  * the game can't leave 'finished' (e.g. a phone that still had it as live): data and status
--    keep their old values; the other columns (date, team_id, deleted_at) still change.
-- This adjusts the row instead of raising an error on purpose: an error would refuse the whole
-- upload batch of the team's games and leave the game waiting to be sent forever. updated_at
-- still moves (set_row_metadata runs after this trigger: triggers fire in name order), so the
-- phone downloads the server's version on its next sync.
-- Re-runnable.

create or replace function public.guard_finished_game()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status is distinct from 'finished' then
    return new;
  end if;

  if new.status is distinct from 'finished' then
    new.status := old.status;
    new.data := old.data;
    return new;
  end if;

  if jsonb_typeof(new.data -> 'events') = 'array' then
    new.data := jsonb_set(new.data, '{events}', coalesce((
      select jsonb_agg(e order by i)
      from jsonb_array_elements(new.data -> 'events') with ordinality as n(e, i)
      where jsonb_typeof(old.data -> 'events') = 'array'
        and exists (
          select 1 from jsonb_array_elements(old.data -> 'events') o
          where o ->> 'id' = e ->> 'id'
        )
    ), '[]'::jsonb));
  end if;

  return new;
end;
$$;

drop trigger if exists guard_finished_game on public.games;
create trigger guard_finished_game before update on public.games
  for each row execute function public.guard_finished_game();
