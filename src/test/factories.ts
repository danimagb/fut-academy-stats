// Builders for test data. Every test makes its own data; names are clearly fake.
import type { Game, GameEvent, Player, Team } from '@/domain/types';

let seq = 0;
const nextId = (prefix: string): string => `${prefix}${++seq}`;

export function makeTeam(over: Partial<Team> = {}): Team {
  return { id: nextId('team'), club: 'Test FC', name: 'U8', ...over };
}

export function makePlayer(over: Partial<Player> = {}): Player {
  const id = over.id ?? nextId('p');
  return { id, teamId: 'team1', number: id.replace(/\D/g, ''), name: `Player ${id}`, fullName: '', ...over };
}

/** A scheduled game: 1 GK + `field` starters from `players` (the first is the goalkeeper). */
export function makeGame(players: readonly Player[], over: Partial<Game> = {}): Game {
  const field = over.field ?? 3;
  const squad = players.map((p) => p.id);
  const starters = squad.slice(0, field + 1);
  const names = Object.fromEntries(
    players.map((p) => [p.id, { name: p.name, number: p.number, fullName: p.fullName ?? '' }]),
  );
  return {
    id: nextId('g'),
    teamId: players[0]?.teamId ?? 'team1',
    club: 'Test FC',
    team: 'U8',
    opponent: 'Rival',
    home: true,
    round: '',
    date: '2026-11-07',
    time: '10:00',
    formatId: 'U7',
    field,
    periods: 2,
    periodMin: 20,
    maxExtra: 10,
    squad,
    starters,
    gkId: starters[0] ?? '',
    names,
    formation: '2-1',
    lineup: [],
    status: 'scheduled',
    clock: { running: false, startedAt: null, elapsedMs: 0, period: 1 },
    events: [],
    marks: [],
    alerted: {},
    ...over,
  };
}

/** Match time from "mm:ss". */
export const at = (mmss: string): number => {
  const [m = 0, s = 0] = mmss.split(':').map(Number);
  return (m * 60 + s) * 1000;
};

type EventInput = GameEvent extends infer E ? (E extends GameEvent ? Omit<E, 'id' | 'wall'> : never) : never;

/** An event at match time `t` (wall clock = t, which is enough for tests that don't re-time). */
export function ev(input: EventInput): GameEvent {
  return { id: nextId('e'), wall: input.t, ...input } as GameEvent;
}
