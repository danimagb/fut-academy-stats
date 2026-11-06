// A small in-memory stand-in for the parts of the Supabase client that sync uses:
// from(table).upsert / update().in / select().in().gt().order().range() / select().eq(),
// and rpc('my_teams') (the rows of the `my_teams` table: { team_id, role }).
// Rows get `updated_at` from a fake server clock on every write.

type Row = Record<string, unknown> & { id?: string };
type Result = { data?: unknown; error: { message: string; code?: string } | null; status: number };

export type FakeSupabase = ReturnType<typeof fakeSupabase>;

export function fakeSupabase(tables: Record<string, Row[]> = {}) {
  let clock = Date.parse('2026-11-01T10:00:00Z');
  const now = () => new Date((clock += 1000)).toISOString();
  const db: Record<string, Row[]> = { teams: [], players: [], games: [], clubs: [], my_teams: [], ...tables };
  /** Called before each write; return an error to refuse it (e.g. RLS: code 42501). */
  let refuse: (table: string, rows: Row[]) => Result['error'] = () => null;
  /** Called while an upsert is "on its way" (to simulate edits made meanwhile). */
  let duringUpsert: (table: string) => void = () => {};
  const calls: { table: string; op: string; rows?: Row[]; ids?: unknown[] }[] = [];

  function from(table: string) {
    const rows = (db[table] ??= []);
    return {
      upsert(input: Row[]) {
        calls.push({ table, op: 'upsert', rows: input });
        duringUpsert(table);
        const error = refuse(table, input);
        if (error) return Promise.resolve({ error, status: 403 });
        for (const r of input) {
          const i = rows.findIndex((x) => x.id === r.id);
          const row = { ...structuredClone(r), updated_at: now() };
          if (i >= 0) rows[i] = { ...rows[i], ...row };
          else rows.push(row);
        }
        return Promise.resolve({ error: null, status: 201 });
      },
      update(patch: Row) {
        return {
          in(_col: string, ids: unknown[]) {
            calls.push({ table, op: 'update', ids });
            const error = refuse(table, []);
            if (error) return Promise.resolve({ error, status: 403 });
            for (const r of rows) if (ids.includes(r.id)) Object.assign(r, patch, { updated_at: now() });
            return Promise.resolve({ error: null, status: 204 });
          },
        };
      },
      select(_cols: string) {
        let list = [...rows];
        const q = {
          in(col: string, values: unknown[]) {
            list = list.filter((r) => values.includes(r[col]));
            return q;
          },
          eq(col: string, value: unknown) {
            list = list.filter((r) => r[col] === value);
            return Promise.resolve({ data: structuredClone(list), error: null, status: 200 });
          },
          gt(col: string, value: string) {
            list = list.filter((r) => String(r[col]) > value);
            return q;
          },
          order(col: string) {
            list.sort((a, b) => String(a[col]).localeCompare(String(b[col])));
            return q;
          },
          range(a: number, b: number) {
            return Promise.resolve({ data: structuredClone(list.slice(a, b + 1)), error: null, status: 200 });
          },
        };
        return q;
      },
    };
  }

  function rpc(fn: string) {
    calls.push({ table: fn, op: 'rpc' });
    if (fn !== 'my_teams')
      return Promise.resolve({ data: null, error: { message: `no ${fn}` }, status: 404 });
    return Promise.resolve({ data: structuredClone(db.my_teams ?? []), error: null, status: 200 });
  }

  return {
    client: { from, rpc },
    db,
    calls,
    serverNow: now,
    refuseWith(fn: typeof refuse) {
      refuse = fn;
    },
    onUpsert(fn: typeof duringUpsert) {
      duringUpsert = fn;
    },
  };
}
