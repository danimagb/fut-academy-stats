import { beforeEach, describe, expect, it } from 'vitest';
import { makeGame, makePlayer, makeTeam } from '@/test/factories';
import { canTakeOver, claimGame, loggedElsewhere, readOnlyGame } from './access';
import { deviceId } from './device';
import { cloud } from './session';
import { db, initStore } from './store';
import type { Game, Role } from '@/domain/types';

const p = makePlayer({ id: 'p1', teamId: 'T' });
const live = (extra: Partial<Game> = {}): Game =>
  makeGame([p], { id: 'g1', teamId: 'T', status: 'live', ...extra });
const role = (r: Role | null): void => {
  db.sync.teams = r ? { T: r } : {};
};

describe('a live game is logged by one phone', () => {
  beforeEach(() => {
    localStorage.clear();
    initStore();
    db.teams = [makeTeam({ id: 'T' })];
    role('team_manager');
    cloud.session = { user: { id: 'u1', email: 'me@example.com' } } as never;
  });

  it('kick-off makes this phone the owner (cloud teams only)', () => {
    const g = live();
    claimGame(g);
    expect(g.owner).toMatchObject({ userId: 'u1', email: 'me@example.com', deviceId: deviceId() });
    expect(g.owner?.from).toBeUndefined();
    expect(loggedElsewhere(g)).toBe(false);
    role(null); // a team only on this phone: no owner
    const local = live();
    claimGame(local);
    expect(local.owner).toBeUndefined();
  });

  it('on another phone the live game is read-only, and a team manager may take it over', () => {
    const g = live({ owner: { userId: 'u2', email: 'other@example.com', deviceId: 'other-phone', at: 1 } });
    expect(loggedElsewhere(g)).toBe(true);
    expect(readOnlyGame(g)).toBe(true);
    expect(canTakeOver(g)).toBe(true);
    claimGame(g, true);
    expect(g.owner).toMatchObject({ userId: 'u1', deviceId: deviceId(), from: 'other-phone' });
    expect(readOnlyGame(g)).toBe(false);
  });

  it('the same person on another phone is "elsewhere" too; coaches cannot take over', () => {
    const g = live({ owner: { userId: 'u1', email: 'me@example.com', deviceId: 'my-ipad', at: 1 } });
    expect(loggedElsewhere(g)).toBe(true);
    role('team_coach');
    expect(canTakeOver(g)).toBe(false);
  });

  it('no lock before kick-off or after full time', () => {
    const owner = { userId: 'u2', email: 'o@example.com', deviceId: 'other-phone', at: 1 };
    expect(loggedElsewhere(live({ status: 'scheduled', owner }))).toBe(false);
    expect(loggedElsewhere(live({ status: 'finished', owner }))).toBe(false);
    expect(loggedElsewhere(live({ status: 'break', owner }))).toBe(true);
  });
});
