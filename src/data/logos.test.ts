import { beforeEach, describe, expect, it } from 'vitest';
import { initStore, db } from './store';
import { LOGOS_KEY, clearLogos, logoSrc, logoUrl, refreshLogos, reloadLogos } from './logos';

const cached = (v: number) => ({ v, img: 'data:image/png;base64,AA==', jpeg: 'data:image/jpeg;base64,/9j/' });

describe('club logos on the phone', () => {
  beforeEach(() => {
    localStorage.clear();
    initStore();
    reloadLogos();
  });

  it('keeps logos whose version is current and forgets those of clubs without one', async () => {
    localStorage.setItem(LOGOS_KEY, JSON.stringify({ c1: cached(2), c2: cached(1), c3: cached(1) }));
    reloadLogos();
    db.sync.clubs = {
      c1: { name: 'A', shortName: '', logoVersion: 2 },
      c2: { name: 'B', shortName: '', logoVersion: null },
    };
    const calls: string[] = [];
    const changed = await refreshLogos((url) => {
      calls.push(String(url));
      return Promise.resolve(new Response(null, { status: 404 }));
    });
    expect(changed).toBe(true);
    expect(calls).toEqual([]); // c1 is current; nothing to download
    expect(logoSrc('c1')).toBe('data:image/png;base64,AA==');
    expect(logoSrc('c2')).toBeNull();
    expect(logoSrc('c3')).toBeNull();
    expect(Object.keys(JSON.parse(localStorage.getItem(LOGOS_KEY) ?? '{}'))).toEqual(['c1']);
  });

  it('downloads a logo whose version changed, from the public URL with the version', async () => {
    db.sync.clubs = { c1: { name: 'A', shortName: '', logoVersion: 3 } };
    const calls: string[] = [];
    await refreshLogos((url) => {
      calls.push(String(url));
      return Promise.resolve(new Response(null, { status: 500 })); // offline-ish: retried later
    });
    expect(calls).toEqual([logoUrl('c1', 3)]);
    expect(calls[0]).toMatch(/\/storage\/v1\/object\/public\/club-logos\/c1\/logo\?v=3$/);
    expect(logoSrc('c1')).toBeNull();
  });

  it('signing out forgets every logo', () => {
    localStorage.setItem(LOGOS_KEY, JSON.stringify({ c1: cached(1) }));
    reloadLogos();
    clearLogos();
    expect(logoSrc('c1')).toBeNull();
    expect(localStorage.getItem(LOGOS_KEY)).toBeNull();
  });
});
