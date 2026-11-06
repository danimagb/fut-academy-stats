// Uploading teams from this phone to the cloud (directors).
import { $ } from '@/shared/lib/dom';
import { getTeam, teamPlayers } from '@/data/queries';
import { syncNow } from '@/data/session';
import { openSheet } from '@/shared/ui/sheet';
import { toast } from '@/shared/ui/toast';
import { localTeams, syncState } from '@/data/sync';
import { RECORD_KINDS, db, isCloudTeam, saveQuiet, teamIdOf } from '@/data/store';
import { esc } from '@/shared/lib/html';
import { teamLabel } from '@/domain/titles';
import { t } from '@/shared/i18n/i18n';
import { rerender } from '@/shared/lib/rerender';

// Upload teams from this phone: they become cloud teams with this user as director.
export function uploadTeams(ids: readonly string[]): void {
  syncState.error = ''; // a previous upload's error (it stays until the next upload)
  for (const id of ids) {
    if (!getTeam(id) || isCloudTeam(id)) continue;
    db.sync.teams[id] = 'director';
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

// After the first sign-in on this phone (director accounts): which local teams to upload?
export function offerUpload(): void {
  if (!$('#sheet')?.hidden || document.querySelector('.dialog')) return;
  openSheet(`
    <h3>${t('uploadTitle')}</h3>
    <p class="hint">${t('uploadHint')}</p>
    <form class="form" data-form="upload-teams">
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
