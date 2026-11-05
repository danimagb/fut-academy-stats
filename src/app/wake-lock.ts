// Keeps the screen on during a live game (where the browser supports it).

let lock: WakeLockSentinel | null = null;
let pending = false;

/** Holds the screen wake lock while `want` (and the page is visible), and releases it otherwise. */
export async function keepScreenOn(want: boolean): Promise<void> {
  const wanted = want && document.visibilityState === 'visible';
  try {
    if (wanted && !lock && !pending && 'wakeLock' in navigator) {
      pending = true;
      lock = await navigator.wakeLock.request('screen');
      lock.addEventListener('release', () => (lock = null));
    } else if (!wanted && lock) {
      await lock.release();
      lock = null;
    }
  } catch {
    // Refused (e.g. battery saver) or not allowed now: the screen just behaves as usual.
  } finally {
    pending = false;
  }
}
