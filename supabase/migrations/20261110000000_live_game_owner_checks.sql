-- Fut Academy Stats: tighter checks on who logs a live game (follows 20261109000000_live_game_owner.sql).
--
-- 1. The owner is who the server says it is. Kicking off (a game becoming 'live' or 'break'
--    with an owner, on insert or update) and taking over set data.owner.userId to the signed-in
--    user and data.owner.email to their account's email, whatever the phone sent. So no one can
--    kick off a game in someone else's name, or show another email in "X is logging this game".
-- 2. While a game is live, the rest of the row is guarded too. An update from anyone but its owner
--    (or someone taking it over) already kept the old data and status; now it also keeps the old
--    team_id, date and deleted_at, so it can't be moved to another team or soft-deleted from
--    another phone either. A hard delete from anyone but its owner is skipped (the cascade of a
--    team delete still goes through).
--
-- As before, a refused update adjusts the row instead of raising an error (an error would refuse
-- the whole upload batch); updated_at still moves, so the other phone downloads the server's
-- version on its next sync. Who may write the game at all is still decided by RLS. The service
-- role / SQL editor (no signed-in user) is not checked. Triggers fire in name order:
-- guard_finished_game, guard_live_game, set_row_metadata. Re-runnable.

create or replace function public.guard_live_game()
returns trigger
language plpgsql
security definer -- reads the user's email from public.accounts
set search_path = ''
as $$
declare
  _me text := auth.uid()::text;
  _old jsonb := case when tg_op = 'UPDATE' then old.data -> 'owner' end;
  _new jsonb := new.data -> 'owner';
  _was_live boolean := tg_op = 'UPDATE' and coalesce(old.status in ('live', 'break'), false)
                       and coalesce(jsonb_typeof(_old) = 'object', false);
  _email text;
begin
  if _me is null then
    return new;
  end if;
  _email := (select a.email from public.accounts a where a.user_id = auth.uid());

  if not _was_live then
    -- Kicking off (or no owner yet): the owner is the signed-in user.
    if coalesce(new.status in ('live', 'break'), false) and coalesce(jsonb_typeof(_new) = 'object', false) then
      new.data := jsonb_set(new.data, '{owner}',
        _new || jsonb_build_object('userId', _me, 'email', coalesce(_email, _new ->> 'email', '')));
    end if;
    return new;
  end if;

  -- The owner carries on (or finishes the game).
  if _old ->> 'userId' = _me and _new is not distinct from _old then
    return new;
  end if;
  -- Taking over on purpose: the new owner is this user and knows which device it replaces.
  if coalesce(jsonb_typeof(_new) = 'object' and _new ->> 'userId' = _me
              and _new ->> 'from' = _old ->> 'deviceId', false) then
    new.data := jsonb_set(new.data, '{owner,email}', to_jsonb(coalesce(_email, _new ->> 'email', '')));
    return new;
  end if;
  -- Anyone else: the game stays as it was (only updated_at moves).
  new.status := old.status;
  new.data := old.data;
  new.team_id := old.team_id;
  new.date := old.date;
  new.deleted_at := old.deleted_at;
  return new;
end;
$$;

revoke execute on function public.guard_live_game() from public, anon, authenticated;

drop trigger if exists guard_live_game on public.games;
create trigger guard_live_game before insert or update on public.games
  for each row execute function public.guard_live_game();

-- A live game is deleted only by its owner (or as part of deleting its team).
create or replace function public.guard_live_game_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or coalesce(old.status not in ('live', 'break'), true)
     or coalesce(jsonb_typeof(old.data -> 'owner') <> 'object', true)
     or coalesce(old.data #>> '{owner,userId}' = auth.uid()::text, false) then
    return old;
  end if;
  -- The team row is gone: this is the cascade of a team delete, let it through.
  perform 1 from public.teams t where t.id = old.team_id;
  if not found then
    return old;
  end if;
  return null; -- skipped
end;
$$;

revoke execute on function public.guard_live_game_delete() from public, anon, authenticated;

drop trigger if exists guard_live_game_delete on public.games;
create trigger guard_live_game_delete before delete on public.games
  for each row execute function public.guard_live_game_delete();
