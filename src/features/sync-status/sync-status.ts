// What the app says about sync: the status line on Profile.
import { plural } from '@/shared/i18n/i18n';
import { pendingCount, syncState } from '@/data/sync';
import { db } from '@/data/store';
import { esc } from '@/shared/lib/html';
import { locale, t } from '@/shared/i18n/i18n';

export function agoText(ms: number): string {
  const min = Math.floor((Date.now() - ms) / 60000);
  if (min < 1) return t('agoNow');
  if (min < 60) return t('agoMin', { n: min });
  if (min < 24 * 60) return t('agoHour', { n: Math.floor(min / 60) });
  return new Date(ms).toLocaleDateString(locale(), { day: 'numeric', month: 'short' });
}

export function syncStatusText(): string {
  const n = pendingCount();
  const { status, error } = syncState;
  let s: string;
  if (status === 'running') s = t('syncing');
  else if (status === 'offline') s = n ? plural('syncWaitingOffline', n) : t('syncOffline');
  else if (status === 'failed') s = t('syncFailed');
  else if (db.sync.lastSyncAt)
    s = t('syncedAgo', { ago: agoText(db.sync.lastSyncAt) }) + (n ? ` · ${plural('syncWaiting', n)}` : '');
  else s = n ? plural('syncWaiting', n) : t('syncNever');
  return error ? `${s}<br>${esc(error)}` : s;
}

// Update the status line in place (no re-render, so nothing being typed is disturbed).
export function showSyncStatus(): void {
  const el = document.getElementById('sync-status');
  if (el) el.innerHTML = syncStatusText();
}
