// Whether the app is known to be installed on this kind of device, so the browser stops
// suggesting it. Opened from the home screen, the app notes it on the phone and in the account
// (user metadata `installedOn`). The phone's note is enough on Android, where the installed app
// and Chrome share storage. On iPhones the installed app has storage of its own, apart from
// Safari's, so Safari learns it from the account (the same one is signed in on both).
import { installPlatforms } from '@/domain/validate';
import type { InstallPlatform } from '@/domain/types';
import { cloud, sb } from './session';

const KEY = 'fut-academy-stats.installedOn'; // platforms the app is known to be installed on

function onPhone(): InstallPlatform[] {
  try {
    return installPlatforms(JSON.parse(localStorage.getItem(KEY) ?? '[]'));
  } catch {
    return [];
  }
}

function notePhone(p: InstallPlatform): void {
  const list = onPhone();
  if (!list.includes(p)) localStorage.setItem(KEY, JSON.stringify([...list, p]));
}

const inAccount = (meta: unknown): InstallPlatform[] =>
  installPlatforms((meta as { installedOn?: unknown } | null | undefined)?.installedOn);

/** Is the app known to be installed on this kind of device? */
export const knownInstalled = (p: InstallPlatform): boolean =>
  onPhone().includes(p) || inAccount(cloud.session?.user.user_metadata).includes(p);

let askedAccount = false;
let toldAccount = false;

/**
 * Opened from the home screen: notes it on the phone and in the account. In the browser: asks the
 * account once per start whether it was installed since. Returns true when that changed what's known.
 */
export async function checkInstalled(p: InstallPlatform, standalone: boolean): Promise<boolean> {
  if (standalone) notePhone(p);
  if (!sb || !cloud.session) return false;
  const meta = cloud.session.user.user_metadata;
  if (standalone) {
    const list = inAccount(meta);
    if (!list.includes(p) && !toldAccount) {
      toldAccount = true;
      const { error } = await sb.auth.updateUser({ data: { installedOn: [...list, p] } });
      if (error) toldAccount = false; // offline: after the next sync
    }
    return false;
  }
  if (knownInstalled(p) || askedAccount) return false;
  askedAccount = true;
  // The session's copy of the account is from sign-in: the installed app may have noted it since.
  const { data } = await sb.auth.getUser();
  if (!inAccount(data.user?.user_metadata).includes(p)) return false;
  notePhone(p);
  return true;
}
