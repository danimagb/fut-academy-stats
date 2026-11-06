// Club logos: uploaded by a club's managers to the public Storage bucket `club-logos`
// (<clubId>/logo), and kept on this phone so screens and PDFs have them offline. The cache is its
// own localStorage key (not `db`: backups and change tracking don't carry images), refreshed after
// each sync for the clubs whose logo version changed.
import { CLOUD } from '@/shared/config';
import { dataUrlBytes, dataUrlOf, jpegOnWhite, squareLogo } from '@/shared/lib/image';
import { db } from './store';

export const LOGOS_KEY = 'fut-academy-stats.logos';
const BUCKET = 'club-logos';

/** One club's logo on this phone: its version, the image (for screens), a JPEG copy (for PDFs). */
type Cached = { v: number; img: string; jpeg: string };

function load(): Record<string, Cached> {
  try {
    const o = JSON.parse(localStorage.getItem(LOGOS_KEY) ?? '{}') as unknown;
    return o && typeof o === 'object' && !Array.isArray(o) ? (o as Record<string, Cached>) : {};
  } catch {
    return {};
  }
}
let cache = load();
function store(): void {
  try {
    localStorage.setItem(LOGOS_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn('Logos: could not keep them on this phone', e);
  }
}

export const logoPath = (clubId: string): string => `${clubId}/logo`;
export const logoUrl = (clubId: string, version: number): string =>
  `${CLOUD.supabaseUrl}/storage/v1/object/public/${BUCKET}/${logoPath(clubId)}?v=${version}`;

/** The club's logo for an <img>, if this phone has it. */
export const logoSrc = (clubId: string | null | undefined): string | null =>
  (clubId && cache[clubId]?.img) || null;

/** Size in pixels of the stored logos (square). */
export const LOGO_PX = 256;

const clubIdOfTeam = (teamId: string | null | undefined): string | undefined =>
  db.teams.find((tm) => tm.id === teamId)?.clubId;
/** The logo of a team's club, for an <img> (null: local team, no logo, or not downloaded). */
export const teamLogoSrc = (teamId: string | null | undefined): string | null =>
  logoSrc(clubIdOfTeam(teamId));
/**
 * What a team's crest shows: the club's logo if the phone has it, else initials from the club's
 * short name or name. `fallbackName`: the club name kept in a game (its team may be gone).
 */
export function teamCrest(
  teamId: string | null | undefined,
  fallbackName = '',
): { name: string; shortName: string; src: string | null } {
  const tm = db.teams.find((x) => x.id === teamId);
  const club = tm?.clubId ? db.sync.clubs[tm.clubId] : undefined;
  return {
    name: club?.name || tm?.club || fallbackName || tm?.name || '',
    shortName: club?.shortName ?? '',
    src: logoSrc(tm?.clubId),
  };
}

/** The logo of a team's club as JPEG bytes, for the PDFs. */
export const teamLogoJpeg = (teamId: string | null | undefined): Uint8Array | null =>
  logoJpeg(clubIdOfTeam(teamId));

/** The club's logo as JPEG bytes (square, 256 px), for the PDFs. */
export function logoJpeg(clubId: string | null | undefined): Uint8Array | null {
  const jpeg = clubId ? cache[clubId]?.jpeg : null;
  return jpeg ? dataUrlBytes(jpeg) : null;
}

/** Keeps the logo of a club from an image already in hand (just uploaded). */
export async function keepLogo(clubId: string, version: number, image: Blob): Promise<void> {
  cache[clubId] = { v: version, img: await dataUrlOf(image), jpeg: await jpegOnWhite(image, LOGO_PX) };
  store();
}

/**
 * Downloads the logos whose version changed, and forgets those of clubs without a logo or no
 * longer known. Returns whether anything changed. Failures (offline) are retried next time.
 */
export async function refreshLogos(fetcher: typeof fetch = fetch): Promise<boolean> {
  let changed = false;
  for (const id of Object.keys(cache)) {
    const v = db.sync.clubs[id]?.logoVersion;
    if (v == null) {
      delete cache[id];
      changed = true;
    }
  }
  for (const [id, club] of Object.entries(db.sync.clubs)) {
    const v = club.logoVersion;
    if (v == null || cache[id]?.v === v) continue;
    try {
      const res = await fetcher(logoUrl(id, v));
      if (!res.ok) continue;
      await keepLogo(id, v, await res.blob());
      changed = true;
    } catch (e) {
      console.warn('Logos: download failed', id, e);
    }
  }
  if (changed) store();
  return changed;
}

/** Forgets a club's logo (removed). */
export function forgetLogo(clubId: string): void {
  delete cache[clubId];
  store();
}

/** Forgets every logo (signing out). */
export function clearLogos(): void {
  cache = {};
  try {
    localStorage.removeItem(LOGOS_KEY);
  } catch {}
}

/** Re-reads the cache (tests). */
export const reloadLogos = (): void => {
  cache = load();
};

export { squareLogo };
