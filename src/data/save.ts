// Saving: the store (with change tracking), the persistent-storage request, and a sync soon
// when cloud teams changed. Every change to `db` is followed by save().
import { route } from '@/shared/lib/route';
import { rerender } from '@/shared/lib/rerender';
import { requestPersistence } from './persist';
import { db, saveStore } from './store';
import { hasCloudChanges, scheduleSync } from './sync';

export function save(): void {
  saveStore();
  void askPersistence();
  if (hasCloudChanges()) scheduleSync();
}

/** Asks the browser to keep our data (see data/persist.ts); Profile shows the answer. */
export async function askPersistence(): Promise<void> {
  if ((await requestPersistence(!!(db.teams.length || db.games.length))) && route().view === 'profile')
    rerender();
}
