-- Fut Academy Stats: one phone logs a live game (README, "Cloud sync": one phone per game).
--
-- When a game is kicked off, the phone that did it writes itself in the game as its owner:
-- data.owner = { userId, email, deviceId, at }. While the game is live (status 'live' or
-- 'break'), an update is only taken from the owner (same user, the owner unchanged), or from
-- someone taking over (a team manager or club manager on another phone, "Continue on this
-- phone"): the new owner is the signed-in user and names the device it takes over from
-- (data.owner.from = the old owner's deviceId). That keeps a second phone that started the
-- same game offline, or one that still has an old copy, from overwriting the owner's events.
--
-- Like the finished-game lock, a refused update keeps the old data and status instead of
-- raising an error (an error would refuse the whole upload batch); updated_at still moves, so
-- the other phone downloads the owner's version on its next sync. Who may write the game at all
-- is still decided by RLS. The service role / SQL editor (no signed-in user) is not checked.
-- Triggers fire in name order: guard_finished_game, guard_live_game, set_row_metadata.
-- Re-runnable.

create or replace function public.guard_live_game()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  _old jsonb := old.data -> 'owner';
  _new jsonb := new.data -> 'owner';
  _me text := auth.uid()::text;
begin
  if old.status not in ('live', 'break') or _me is null
     or _old is null or jsonb_typeof(_old) <> 'object' then
    return new;
  end if;
  -- The owner carries on (or finishes the game).
  if _old ->> 'userId' = _me and _new is not distinct from _old then
    return new;
  end if;
  -- Taking over on purpose: the new owner is this user and knows which device it replaces.
  if jsonb_typeof(_new) = 'object' and _new ->> 'userId' = _me
     and _new ->> 'from' is not null and _new ->> 'from' = _old ->> 'deviceId' then
    return new;
  end if;
  new.status := old.status;
  new.data := old.data;
  return new;
end;
$$;

revoke execute on function public.guard_live_game() from public, anon, authenticated;

drop trigger if exists guard_live_game on public.games;
create trigger guard_live_game before update on public.games
  for each row execute function public.guard_live_game();
