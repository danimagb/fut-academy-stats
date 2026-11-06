-- Fut Academy Stats: club logos (docs/clubs-plan.md, "Club logo").
--
-- One image per club in the Storage bucket `club-logos`, at `<club_id>/logo`. The bucket is
-- public for reading (a crest isn't private, and a plain URL works in <img> and the service
-- worker) and only takes small images. Only the club's managers and the admin write there.
-- clubs.logo_version says whether there is a logo (null = none) and changes with every new one,
-- so phones know when to download it again: set_club_logo() bumps it after an upload (or clears
-- it after a removal), which also moves clubs.updated_at.
-- Re-runnable.

alter table public.clubs add column if not exists logo_version int;

create or replace function public.set_club_logo(_club_id text, _present boolean)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  _version int;
begin
  if not (public.is_club_manager(_club_id) or public.is_admin()) then
    raise exception 'only the club''s managers can change its logo'
      using errcode = 'insufficient_privilege';
  end if;
  update public.clubs
  set logo_version = case when _present then coalesce(logo_version, 0) + 1 else null end
  where id = _club_id
  returning logo_version into _version;
  if not found then
    raise exception 'no such club' using errcode = 'no_data_found';
  end if;
  return _version;
end;
$$;

revoke execute on function public.set_club_logo(text, boolean) from public, anon;
grant execute on function public.set_club_logo(text, boolean) to authenticated, service_role;

-- The bucket: public reads, images of at most 512 KB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('club-logos', 'club-logos', true, 524288, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Writes: the first folder of the path is the club; its managers (or the admin) may write.
-- Select is needed too for uploads that replace a file (upsert); the files are public anyway.
drop policy if exists club_logos_select on storage.objects;
create policy club_logos_select on storage.objects for select to authenticated
  using (bucket_id = 'club-logos');

drop policy if exists club_logos_insert on storage.objects;
create policy club_logos_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'club-logos'
    and (public.is_club_manager((storage.foldername(name))[1]) or public.is_admin())
  );

drop policy if exists club_logos_update on storage.objects;
create policy club_logos_update on storage.objects for update to authenticated
  using (
    bucket_id = 'club-logos'
    and (public.is_club_manager((storage.foldername(name))[1]) or public.is_admin())
  )
  with check (
    bucket_id = 'club-logos'
    and (public.is_club_manager((storage.foldername(name))[1]) or public.is_admin())
  );

drop policy if exists club_logos_delete on storage.objects;
create policy club_logos_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'club-logos'
    and (public.is_club_manager((storage.foldername(name))[1]) or public.is_admin())
  );
