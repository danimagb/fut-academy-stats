// A random id for this installation of the app, so a live game knows which phone logs it
// (the same person may be signed in on two phones). Kept in localStorage; a new one if missing.
const KEY = 'fut-academy-stats.device';

let id: string | null = null;

export function deviceId(): string {
  if (id) return id;
  try {
    id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
  } catch {
    id ??= crypto.randomUUID();
  }
  return id;
}
