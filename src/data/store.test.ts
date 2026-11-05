import { beforeEach, describe, expect, it } from 'vitest';
import { checkIncoming } from '@/domain/validate';
import { makeGame, makePlayer, makeTeam } from '@/test/factories';
import {
  REJECTED_KEY,
  STORE_KEY,
  db,
  dropInvalid,
  initStore,
  loadRejected,
  normalize,
  saveQuiet,
  saveStore,
  setDb,
} from './store';

const stored = () => JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null');

/** Starts each test from `data` already saved on the phone. */
function startWith(data: unknown) {
  localStorage.clear();
  if (data !== undefined) localStorage.setItem(STORE_KEY, JSON.stringify(data));
  initStore(1000);
}

beforeEach(() => startWith(undefined));

describe('loading the store', () => {
  it('starts empty when nothing is saved, or the saved data is unreadable', () => {
    expect(db).toMatchObject({ teams: [], players: [], games: [], deleted: [] });
    localStorage.setItem(STORE_KEY, '{not json');
    initStore();
    expect(db.players).toEqual([]);
  });

  it('puts players from before teams existed into one team', () => {
    const p = { id: 'a', number: '1', name: 'A' };
    const { teamId: _t, ...oldGame } = makeGame([makePlayer(p)]);
    startWith({ players: [p], games: [oldGame] });
    expect(db.teams).toHaveLength(1);
    expect(db.players[0]!.teamId).toBe(db.teams[0]!.id);
    expect(db.games).toHaveLength(1); // kept, even without a team
    expect(loadRejected).toEqual([]);
  });

  it('marks records from before change tracking as changed, so a first sync uploads them', () => {
    const team = makeTeam({ id: 'T' });
    startWith({ teams: [team], players: [makePlayer({ teamId: 'T' })], games: [] });
    expect(db.teams[0]).toMatchObject({ updatedAt: 0, dirty: true });
    expect(db.players[0]).toMatchObject({ updatedAt: 0, dirty: true });
  });

  it('keeps games in line with their team names', () => {
    const p = makePlayer({ teamId: 'T' });
    startWith({
      teams: [makeTeam({ id: 'T', club: 'New FC' })],
      players: [p],
      games: [makeGame([p], { teamId: 'T', club: 'Old' })],
    });
    expect(db.games[0]!.club).toBe('New FC');
  });

  it('leaves out records that would crash the app, and keeps them aside', () => {
    const p = makePlayer({ teamId: 'T' });
    const good = makeGame([p], { teamId: 'T' });
    startWith({
      teams: [makeTeam({ id: 'T' })],
      players: [p, { name: 'no id' }],
      games: [good, { id: 'g-broken', teamId: 'T', events: 'x' }],
    });
    expect(db.players.map((x) => x.id)).toEqual([p.id]);
    expect(db.games.map((g) => g.id)).toEqual([good.id]);
    expect(loadRejected.map((r) => r.kind)).toEqual(['players', 'games']);
    expect(JSON.parse(localStorage.getItem(REJECTED_KEY)!)).toHaveLength(2);
  });

  it('repairs a damaged sync state', () => {
    startWith({ players: [], games: [], sync: { teams: [], uploads: 'x' } });
    expect(db.sync).toMatchObject({ teams: {}, uploads: [], userId: null });
  });
});

describe('change tracking', () => {
  beforeEach(() => {
    startWith({
      teams: [makeTeam({ id: 'T' })],
      players: [makePlayer({ id: 'p1', teamId: 'T' })],
      games: [],
    });
    saveStore(1000); // records from before tracking get stamped now
    for (const r of [...db.teams, ...db.players]) r.dirty = false;
    saveQuiet();
  });

  it('stamps a changed record and leaves the others alone', () => {
    db.players[0]!.name = 'Renamed';
    saveStore(2000);
    expect(db.players[0]).toMatchObject({ updatedAt: 2000, dirty: true });
    expect(db.teams[0]).toMatchObject({ dirty: false });
    expect(stored().players[0].name).toBe('Renamed');
  });

  it('does not count saving the same data again as a change', () => {
    saveStore(3000);
    expect(db.players[0]!.dirty).toBe(false);
  });

  it('leaves a tombstone with the team of a removed record', () => {
    db.players = [];
    saveStore(4000);
    expect(db.deleted).toEqual([{ kind: 'players', id: 'p1', teamId: 'T', deletedAt: 4000 }]);
  });

  it('forgets the tombstone when the record comes back (e.g. restored from a backup)', () => {
    const p = db.players[0]!;
    db.players = [];
    saveStore(4000);
    db.players = [p];
    saveStore(5000);
    expect(db.deleted).toEqual([]);
  });

  it('writes quietly without counting a change (data from the cloud)', () => {
    db.players[0]!.name = 'From the cloud';
    saveQuiet();
    saveStore(6000);
    expect(db.players[0]!.dirty).toBe(false);
    expect(stored().players[0].name).toBe('From the cloud');
  });

  it('a record moved from a cloud team to a team on this phone leaves a "moved" tombstone', () => {
    db.sync.teams.T = 'director';
    db.teams.push(makeTeam({ id: 'L' }));
    saveQuiet();
    db.players[0]!.teamId = 'L';
    saveStore(7000);
    expect(db.deleted).toEqual([{ kind: 'players', id: 'p1', teamId: 'T', deletedAt: 7000, moved: true }]);
  });

  it('setDb replaces the whole store', () => {
    setDb(normalize({ players: [], games: [] }));
    saveStore(8000);
    expect(db.players).toEqual([]);
    expect(db.deleted.map((d) => d.id)).toContain('p1');
  });
});

describe('dropInvalid', () => {
  it('splits a backup into usable records and records left out', () => {
    const p = makePlayer({ teamId: 'T' });
    const data: Record<string, unknown> = {
      teams: [makeTeam({ id: 'T' })],
      players: [p],
      games: [makeGame([p], { teamId: 'T' }), makeGame([p], { teamId: 'T', status: 'weird' as never })],
    };
    const out = dropInvalid(data, checkIncoming, 0);
    expect((data.games as unknown[]).length).toBe(1);
    expect(out).toHaveLength(1);
    expect(out[0]!.problems).toContain('status weird');
  });

  it('treats a missing list as empty', () => {
    const data: Record<string, unknown> = { players: [] };
    dropInvalid(data, checkIncoming, 0);
    expect(data.teams).toEqual([]);
    expect(data.games).toEqual([]);
  });
});
