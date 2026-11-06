// Uploading teams from this phone to the cloud, into a club this user manages.
import { $ } from '@/shared/lib/dom';
import { getTeam, teamPlayers } from '@/data/queries';
import { cloud, syncNow } from '@/data/session';
import { managedClubs } from '@/data/auth';
import { openSheet } from '@/shared/ui/sheet';
import { toast } from '@/shared/ui/toast';
import { localTeams, syncState } from '@/data/sync';
import { RECORD_KINDS, db, isCloudTeam, saveQuiet, syncGameTeams, teamIdOf } from '@/data/store';
import { esc } from '@/shared/lib/html';
import { teamLabel } from '@/domain/titles';
import { t } from '@/shared/i18n/i18n';
import { rerender } from '@/shared/lib/rerender';

/** The club a team from this phone goes into: the given one if this user manages it, else the first. */
export function uploadClub(clubId?: string): { id: string; name: string } | undefined {
  const clubs = managedClubs(cloud.account);
  return clubs.find((c) => c.id === clubId) ?? clubs[0];
}

// Upload teams from this phone into a club this user manages: they become cloud teams of the
// club (its name replaces the team's club name), and this user manages them as club manager.
export function uploadTeams(ids: readonly string[], clubId?: string): void {
  const club = uploadClub(clubId);
  if (!club) return;
  syncState.error = ''; // a previous upload's error (it stays until the next upload)
  for (const id of ids) {
    const tm = getTeam(id);
    if (!tm || isCloudTeam(id)) continue;
    Object.assign(tm, { clubId: club.id, club: club.name });
    syncGameTeams(db, id);
    db.sync.teams[id] = 'club_manager';
    if (!db.sync.uploads.includes(id)) db.sync.uploads.push(id);
    for (const kind of RECORD_KINDS)
      for (const r of db[kind] as { id: string; teamId?: string; dirty?: boolean }[])
        if (teamIdOf(kind, r) === id) r.dirty = true;
  }
  saveQuiet();
  toast(t('uploading'));
  rerender();
  void syncNow();
}

// After the first sign-in on this phone (club managers): which local teams to upload, and into
// which club (asked only when this user manages more than one)?
export function offerUpload(): void {
  if (!$('#sheet')?.hidden || document.querySelector('.dialog')) return;
  const clubs = managedClubs(cloud.account);
  if (!clubs.length) return;
  const clubField =
    clubs.length > 1
      ? `<label>${t('club')}<select name="club">${clubs
          .map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`)
          .join('')}</select></label>`
      : `<input type="hidden" name="club" value="${esc(clubs[0]?.id ?? '')}">`;
  openSheet(`
    <h3>${t('uploadTitle')}</h3>
    <p class="hint">${t('uploadHint')}</p>
    <form class="form" data-form="upload-teams">
      ${clubField}
      <div class="check-list">${localTeams()
        .map(
          (tm) => `
        <label class="check"><input type="checkbox" name="team" value="${esc(tm.id)}" checked>
          <span class="grow"><strong>${esc(teamLabel(tm))}</strong>
          <span class="muted small sub-line">${t('playersCount', { n: teamPlayers(tm.id).length })}</span></span></label>`,
        )
        .join('')}
      </div>
      <button class="btn primary block">${t('uploadSelected')}</button>
      <button type="button" class="btn ghost block" data-action="close-sheet">${t('notNow')}</button>
    </form>`);
}
