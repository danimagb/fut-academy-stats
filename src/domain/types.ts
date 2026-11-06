// The app's data, as stored in localStorage (`fut-academy-stats.v1`), exported in backups and
// synced to the cloud. These shapes are a contract: add optional fields only, and migrate in
// the store's load step for anything else (see docs/standards/data-and-sync.md).

export type Lang = 'en' | 'pt';

/**
 * This user's role in a cloud team: manages the team's club (UI: Coordenador; everything),
 * team manager (UI: Diretor; players and games) or team coach (UI: Treinador; read-only).
 */
export type Role = 'club_manager' | 'team_manager' | 'team_coach';

/** Fields every synced record has (set by `save()`'s change tracking, never by hand). */
export type Tracked = {
  /** Last change, ms since the epoch; 0 for records from before change tracking. */
  updatedAt?: number;
  /** Changed since the last upload. */
  dirty?: boolean;
};

export type Team = Tracked & {
  id: string;
  club: string;
  /** Age group, e.g. "Sub-7B" (shown as "Club - Age group"). */
  name: string;
  /** The club of a cloud team (`club` is then its name, set by the server). Local teams: none. */
  clubId?: string;
};

export type Player = Tracked & {
  id: string;
  teamId: string;
  /** Shirt number, as text (may be ''). */
  number: string;
  /** Shirt name, shown on the game screen. */
  name: string;
  /** Full name for the report/PDF (optional). */
  fullName?: string;
};

export type GameStatus = 'scheduled' | 'live' | 'break' | 'finished';

/** Kick-off or end of a period, in match time. */
export type Mark = {
  type: 'start' | 'end';
  period: number;
  /** Match time, ms. */
  t: number;
  /** Wall-clock time it was recorded, ms since the epoch. */
  wall: number;
};

type EventBase = {
  id: string;
  /** Match time, ms (only time actually played). */
  t: number;
  /** Wall-clock time it was recorded, ms since the epoch. */
  wall: number;
};

/** Something that happened in a game. Minutes, score and lineup are derived from these. */
export type GameEvent = EventBase &
  (
    | { type: 'sub'; playerId: string; inId: string }
    | { type: 'goal' | 'yellow' | 'red'; playerId: string }
    | { type: 'gk'; playerId: string }
    | { type: 'pos'; playerId: string; slot: number }
    | { type: 'oppgoal' }
  );

export type GameEventType = GameEvent['type'];

export type Clock = {
  running: boolean;
  /** Wall-clock time the current run started, ms (null when stopped). */
  startedAt: number | null;
  /** Match time played before the current run, ms. */
  elapsedMs: number;
  /** Current period, from 1. */
  period: number;
};

/** One player id (or null) per slot: slot 0 is the goal, then defence to attack, left to right. */
export type Lineup = (string | null)[];

/** A player's name as it was when the game was created (the report keeps these). */
export type SquadName = { name: string; number: string; fullName: string };

export type Game = Tracked & {
  id: string;
  teamId: string;
  /** Copy of the team's club and name (kept in line with the team while it exists). */
  club: string;
  team: string;
  opponent: string;
  home: boolean;
  /** Round (jornada), as text; '' when not set. */
  round: string;
  /** "YYYY-MM-DD" and "HH:MM". */
  date: string;
  time: string;
  formatId: string;
  /** Outfield players (the goalkeeper is extra). */
  field: number;
  periods: number;
  periodMin: number;
  /** Auto-stop a period this many minutes after its regular end (older games: 10). */
  maxExtra?: number;
  squad: string[];
  starters: string[];
  /** The goalkeeper; null before kick-off while the goal slot is empty. */
  gkId: string | null;
  names: Record<string, SquadName>;
  formation: string;
  lineup: Lineup;
  status: GameStatus;
  clock: Clock;
  events: GameEvent[];
  marks: Mark[];
  /** Reminders already shown, per period (period → how many). */
  alerted: Record<string, number>;
  /** Period that was stopped automatically (shows a notice), or null. */
  autoStopped?: number | null;
};

export type RecordKind = 'teams' | 'players' | 'games';

/** Left by `save()` when a record disappears, so a sync can delete it elsewhere. */
export type Tombstone = {
  kind: RecordKind;
  id: string;
  teamId: string | null;
  deletedAt: number;
  /** The record moved to another team rather than being deleted. */
  moved?: boolean;
};

/** A club as the phone keeps it: its name and short name (e.g. "PFC", or ''). */
export type SyncClub = { name: string; shortName: string };

/** Cloud sync bookkeeping, kept out of the records so it doesn't count as a change. */
export type SyncState = {
  userId: string | null;
  /** Server time of the last pull. */
  lastPulledAt: string | null;
  lastSyncAt: number | null;
  /** Cloud teams, with this user's role in each. */
  teams: Record<string, Role>;
  /** The clubs of this user's cloud teams and clubs (downloaded in full on every pull). */
  clubs: Record<string, SyncClub>;
  /** Teams being uploaded (not confirmed by the server yet). */
  uploads: string[];
};

export type Db = {
  teams: Team[];
  players: Player[];
  games: Game[];
  deleted: Tombstone[];
  sync: SyncState;
  /** Last formation used per number of outfield players (this phone only). */
  formations?: Record<string, string>;
  /** Team preselected for a new game (this phone only). */
  lastTeamId?: string;
};
