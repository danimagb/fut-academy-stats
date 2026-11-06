import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Db } from '@/domain/types';
import { fakeSupabase, type FakeSupabase } from '@/test/fake-supabase';
import { makeGame, makePlayer, makeTeam } from '@/test/factories';
import { db, initStore, normalize, saveQuiet, setDb } from './store';
import { configureSync, pendingCount, removeCloudData, runSync, syncState } from './sync';

let fake: FakeSupabase;
const hooks = {
  onChange: vi.fn<() => void>(),
  onRejected: vi.fn<(n: number) => void>(),
  afterSync: vi.fn<(info: { firstOk: boolean }) => void>(),
  onStatus: vi.fn<() => void>(),
};

/** This phone: `data`, already synced once by user u1 with the given team roles. */
function phone(data: Partial<Db>, roles: Record<string, 'director' | 'coach'>, userId: string | null = 'u1') {
  const copy = structuredClone(data);
  // Records start as already synced (not dirty) unless the test says otherwise.
  for (const kind of ['teams', 'players', 'games'] as const)
    for (const r of copy[kind] ?? [])
      Object.assign(r, { updatedAt: r.updatedAt ?? 1, dirty: r.dirty ?? false });
  const store = normalize({ teams: [], players: [], games: [], ...copy });
  store.sync.userId = userId;
  store.sync.teams = roles;
  store.sync.lastPulledAt = null;
  setDb(store);
  saveQuiet();
}

/** The cloud: rows per table, plus this user's memberships. */
function cloud(rows: Record<string, Record<string, unknown>[]>, roles: Record<string, 'director' | 'coach'>) {
  fake = fakeSupabase({
    ...rows,
    team_members: Object.entries(roles).map(([team_id, role]) => ({ team_id, role, user_id: 'u1' })),
  });
  configureSync({
    client: fake.client,
    canSync: () => true,
    userId: () => 'u1',
    request: () => {},
    ...hooks,
  });
}

const teamRow = (id: string, extra = {}) => ({
  id,
  club: 'Test FC',
  name: 'U8',
  deleted_at: null,
  updated_at: '2026-10-01T00:00:00Z',
  ...extra,
});
const playerRow = (id: string, teamId: string, extra = {}) => ({
  id,
  team_id: teamId,
  number: '1',
  name: `Player ${id}`,
  full_name: '',
  deleted_at: null,
  updated_at: '2026-10-01T00:00:00Z',
  ...extra,
});

beforeEach(() => {
  localStorage.clear();
  initStore();
  vi.clearAllMocks();
  Object.assign(syncState, { status: 'idle', error: '' });
});

describe('push', () => {
  it("uploads changed records of a director's team, then marks them as sent", async () => {
    const T = makeTeam({ id: 'T', dirty: true });
    phone({ teams: [T], players: [makePlayer({ id: 'p1', teamId: 'T', dirty: true })] }, { T: 'director' });
    cloud({}, { T: 'director' });
    await runSync();
    expect(fake.db.players!.map((r) => r.id)).toEqual(['p1']);
    expect(db.players[0]!.dirty).toBe(false);
    expect(syncState.status).toBe('ok');
    expect(pendingCount()).toBe(0);
  });

  it("never uploads a coach's or a local team's changes; a coach's edit is replaced by the cloud", async () => {
    phone(
      {
        teams: [makeTeam({ id: 'C' }), makeTeam({ id: 'L', dirty: true })],
        players: [makePlayer({ id: 'p1', teamId: 'C', name: 'Edited here', dirty: true })],
      },
      { C: 'coach' },
    );
    cloud(
      { teams: [teamRow('C')], players: [playerRow('p1', 'C', { name: 'From the cloud' })] },
      { C: 'coach' },
    );
    await runSync();
    expect(fake.calls.filter((c) => c.op === 'upsert')).toEqual([]);
    expect(db.players.find((p) => p.id === 'p1')!.name).toBe('From the cloud');
    expect(db.teams.map((tm) => tm.id).sort()).toEqual(['C', 'L']); // the local team stays
  });

  it('sends deletions as soft deletes and forgets the tombstone', async () => {
    phone(
      { teams: [makeTeam({ id: 'T' })], deleted: [{ kind: 'players', id: 'p1', teamId: 'T', deletedAt: 1 }] },
      { T: 'director' },
    );
    cloud({ teams: [teamRow('T')], players: [playerRow('p1', 'T')] }, { T: 'director' });
    await runSync();
    expect(fake.db.players![0]!.deleted_at).toBeTruthy();
    expect(db.deleted).toEqual([]);
  });

  it('keeps an edit made while the upload was on its way, for the next sync', async () => {
    phone(
      { teams: [makeTeam({ id: 'T' })], players: [makePlayer({ id: 'p1', teamId: 'T', dirty: true })] },
      { T: 'director' },
    );
    cloud({}, { T: 'director' });
    fake.onUpsert(() => {
      db.players[0]!.name = 'Changed meanwhile';
    });
    await runSync();
    expect(db.players[0]).toMatchObject({ name: 'Changed meanwhile', dirty: true });
  });

  it('a new team the server refuses goes back to being a team on this phone', async () => {
    phone({ teams: [makeTeam({ id: 'T', dirty: true })] }, { T: 'director' });
    db.sync.uploads = ['T'];
    cloud({}, {});
    fake.refuseWith((table) => (table === 'teams' ? { message: 'denied', code: '42501' } : null));
    await runSync();
    expect(db.sync.teams).toEqual({});
    expect(db.teams.map((tm) => tm.id)).toEqual(['T']);
    expect(syncState.error).not.toBe('');
  });
});

describe('pull', () => {
  it('adds new cloud records and removes ones deleted in the cloud', async () => {
    phone(
      { teams: [makeTeam({ id: 'T' })], players: [makePlayer({ id: 'gone', teamId: 'T' })] },
      { T: 'director' },
    );
    cloud(
      {
        teams: [teamRow('T')],
        players: [playerRow('new', 'T'), playerRow('gone', 'T', { deleted_at: '2026-10-02T00:00:00Z' })],
      },
      { T: 'director' },
    );
    await runSync();
    expect(db.players.map((p) => p.id)).toEqual(['new']);
    expect(hooks.onChange).toHaveBeenCalled();
  });

  it('leaves out records that fail the checks, and reports how many', async () => {
    phone({ teams: [makeTeam({ id: 'T' })] }, { T: 'director' });
    const p = makePlayer({ id: 'p1', teamId: 'T' });
    const good = makeGame([p], { id: 'g1', teamId: 'T' });
    const bad = makeGame([p], { id: 'g2', teamId: 'T', status: 'hacked' as never });
    cloud(
      {
        teams: [teamRow('T')],
        games: [good, bad].map((g) => ({
          id: g.id,
          team_id: 'T',
          data: g,
          deleted_at: null,
          updated_at: '2026-10-01T00:00:00Z',
        })),
      },
      { T: 'director' },
    );
    await runSync();
    expect(db.games.map((g) => g.id)).toEqual(['g1']);
    expect(hooks.onRejected).toHaveBeenCalledWith(1);
  });

  it('a team this user was removed from leaves the phone', async () => {
    phone({ teams: [makeTeam({ id: 'T' })], players: [makePlayer({ teamId: 'T' })] }, { T: 'coach' });
    cloud({ teams: [teamRow('T')] }, {});
    await runSync();
    expect(db.teams).toEqual([]);
    expect(db.players).toEqual([]);
    expect(db.sync.teams).toEqual({});
  });
});

describe('sessions', () => {
  it("another person signing in on the same phone removes the previous person's cloud teams first", async () => {
    phone({ teams: [makeTeam({ id: 'OLD' }), makeTeam({ id: 'L' })] }, { OLD: 'director' }, 'someone-else');
    cloud({}, {});
    await runSync();
    expect(db.teams.map((tm) => tm.id)).toEqual(['L']);
    expect(db.sync.userId).toBe('u1');
  });

  it('signing out during a sync drops what that sync downloaded', async () => {
    phone(
      { teams: [makeTeam({ id: 'T' })], players: [makePlayer({ id: 'p1', teamId: 'T', dirty: true })] },
      { T: 'director' },
    );
    cloud({ teams: [teamRow('T')], players: [playerRow('p2', 'T')] }, { T: 'director' });
    fake.onUpsert(() => removeCloudData());
    await runSync();
    expect(db.teams).toEqual([]);
    expect(db.players).toEqual([]);
    expect(syncState.status).toBe('idle');
  });

  it("tells the app about the first sync on this phone (to offer uploading the phone's teams)", async () => {
    phone({ teams: [makeTeam({ id: 'L' })] }, {}, null);
    cloud({}, {});
    await runSync();
    expect(hooks.afterSync).toHaveBeenLastCalledWith({ firstOk: true });
    await runSync();
    expect(hooks.afterSync).toHaveBeenLastCalledWith({ firstOk: false });
  });
});
