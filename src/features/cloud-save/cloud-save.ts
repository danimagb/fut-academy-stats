// Saving a change to a team, its players or a game straight to the cloud (data/cloud-change):
// while it's being sent the toast says so; if it didn't reach the cloud, nothing changed and the
// toast says why. Resolves true when it's saved.
import { cloudChange } from '@/data/cloud-change';
import { t } from '@/shared/i18n/i18n';
import { rerender } from '@/shared/lib/rerender';
import { toast } from '@/shared/ui/toast';

let busy = false;

export async function saveToCloud(apply: () => void): Promise<boolean> {
  if (busy) return false; // one at a time (a second tap while the first is on its way)
  busy = true;
  toast(t('saving'));
  try {
    const r = await cloudChange(apply);
    if (r === 'ok') {
      toast(t('savedCloud'));
      return true;
    }
    toast(t(r === 'offline' ? 'needsInternet' : r === 'refused' ? 'notAllowed' : 'saveFailed'));
    rerender(); // show what is really there
    return false;
  } finally {
    busy = false;
  }
}
