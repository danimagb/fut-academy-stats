// Ask the browser not to clear our storage when space runs low or the site isn't used for a
// while (Safari can otherwise remove website data after ~7 days without a visit). Asked once
// there is data to protect.

let persisted: boolean | null = null;
let asked = false;

/** Whether the browser agreed to keep the data; null where it can't say (or wasn't asked yet). */
export const persistedState = (): boolean | null => persisted;

/** Asks once, when `hasData`. Resolves true when it asked (so the caller can re-render). */
export async function requestPersistence(hasData: boolean): Promise<boolean> {
  const st = navigator.storage;
  if (asked || !st?.persist || !hasData) return false;
  asked = true;
  try {
    persisted = (await st.persisted()) || (await st.persist());
  } catch {
    persisted = false;
  }
  return true;
}
