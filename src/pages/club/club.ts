// The club page (#/club/<id>), for the club's managers (UI: Coordenador): the short name, the
// club's teams on this phone and the club's people with their roles in its teams. The people are
// loaded online (RLS shows a club manager their club's people); nothing of it is cached.
import { managedClubs } from '@/data/auth';
import { cloud, refreshAccount, sb, syncNow } from '@/data/session';
import { isOffline } from '@/data/sync';
import { db } from '@/data/store';
import {
  OFFLINE,
  accessError,
  clubRoleLabel,
  q,
  remote,
  roleLabel,
} from '@/features/team-people/team-people';
import { esc } from '@/shared/lib/html';
import { rerenderSoon } from '@/shared/lib/rerender';
import { route } from '@/shared/lib/route';
import { plural, t } from '@/shared/i18n/i18n';
import { bar } from '@/shared/ui/bar';
import { notify } from '@/shared/ui/dialog';
import { main } from '@/shared/ui/main';
import { toast } from '@/shared/ui/toast';
import type { SupabaseClient } from '@supabase/supabase-js';

type Person = { user_id: string; email: string; role: string; teams: { name: string; role: string }[] };
type ClubState = { clubId: string; status: 'loading' | 'ok' | 'offline' | 'error'; people: Person[] };

const client = (): SupabaseClient => {
  if (!sb) throw OFFLINE;
  return sb;
};
const clubState = (id: string): ClubState | null => {
  const st = remote.club as ClubState | null;
  return st?.clubId === id ? st : null;
};

async function loadClub(clubId: string): Promise<void> {
  const st: ClubState = { clubId, status: 'loading', people: [] };
  remote.club = st;
  try {
    if (!navigator.onLine) throw OFFLINE;
    const [rows, teams] = await Promise.all([
      q<{ user_id: string; role: string }[]>(
        client().from('club_members').select('user_id, role').eq('club_id', clubId),
      ),
      q<{ id: string; name: string }[]>(
        client().from('teams').select('id, name').eq('club_id', clubId).is('deleted_at', null),
      ),
    ]);
    const ids = rows.map((r) => r.user_id);
    const teamIds = teams.map((tm) => tm.id);
    const [accounts, roles] = await Promise.all([
      ids.length
        ? q<{ user_id: string; email: string }[]>(
            client().from('accounts').select('user_id, email').in('user_id', ids),
          )
        : Promise.resolve([]),
      teamIds.length
        ? q<{ team_id: string; user_id: string; role: string }[]>(
            client().from('team_members').select('team_id, user_id, role').in('team_id', teamIds),
          )
        : Promise.resolve([]),
    ]);
    const email = new Map(accounts.map((a) => [a.user_id, a.email]));
    const teamName = new Map(teams.map((tm) => [tm.id, tm.name]));
    st.people = rows
      .map((r) => ({
        user_id: r.user_id,
        email: email.get(r.user_id) ?? '?',
        role: r.role,
        teams: roles
          .filter((m) => m.user_id === r.user_id)
          .map((m) => ({ name: teamName.get(m.team_id) ?? '?', role: m.role }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort(
        (a, b) => (a.role === b.role ? 0 : a.role === 'manager' ? -1 : 1) || a.email.localeCompare(b.email),
      );
    st.status = 'ok';
  } catch (e) {
    st.status = isOffline(e) ? 'offline' : 'error';
    console.warn('Club: load failed', e);
  }
  if (remote.club === st && route().view === 'club') rerenderSoon();
}

export function viewClub(clubId: string | undefined): void {
  const club = managedClubs(cloud.account).find((c) => c.id === clubId);
  if (!club || !clubId) {
    main.innerHTML = `${bar(t('club'), '#/teams')}<p class="empty">${t('clubOnly')}</p>`;
    return;
  }
  const known = db.sync.clubs[clubId];
  const shortName = known?.shortName ?? club.shortName;
  const teams = db.teams.filter((tm) => tm.clubId === clubId).sort((a, b) => a.name.localeCompare(b.name));
  const st = clubState(clubId);
  let people: string;
  if (!st || st.status === 'loading') people = `<p class="hint">${t('loading')}</p>`;
  else if (st.status !== 'ok')
    people = `<p class="hint warn">${t('needsInternet')}</p><button class="btn small ghost" data-action="club-reload">${t('tryAgain')}</button>`;
  else
    people = st.people.length
      ? `<ul class="list club-people">${st.people
          .map(
            (p) => `<li class="item"><span class="grow"><span class="email">${esc(p.email)}</span>
          <div class="muted small">${clubRoleLabel(p.role)}${
            p.teams.length
              ? ` · ${p.teams.map((x) => `${esc(x.name)} (${roleLabel(x.role)})`).join(', ')}`
              : ` · ${t('noTeamRole')}`
          }</div></span></li>`,
          )
          .join('')}</ul>`
      : `<p class="muted small">${t('noClubPeople')}</p>`;
  main.innerHTML = `
    ${bar(esc(known?.name ?? club.name), '#/teams')}
    <form class="form row gap club-short" data-form="club-short" data-cid="${esc(clubId)}">
      <label class="grow">${t('clubShortName')}<input name="short" maxlength="20" value="${esc(shortName)}" placeholder="PFC" autocomplete="off"></label>
      <button class="btn">${t('save')}</button>
    </form>
    <p class="hint">${t('clubShortHint')}</p>
    <h2>${t('clubTeams')} <span class="muted small">${teams.length}</span></h2>
    ${
      teams.length
        ? `<ul class="list">${teams.map((tm) => `<li><a class="card" href="#/team/${esc(tm.id)}"><strong class="grow">${esc(tm.name) || t('unnamedTeam')}</strong></a></li>`).join('')}</ul>`
        : `<p class="muted small">${t('noClubTeamsYet')}</p>`
    }
    <button class="btn block" data-action="new-team">${t('newTeam')}</button>
    <h2>${t('clubPeople')}${st?.status === 'ok' ? ` <span class="muted small">${plural('peopleN', st.people.length)}</span>` : ''}</h2>
    ${people}
    <p class="hint">${t('clubPeopleHint')}</p>`;
  if (!st) void loadClub(clubId);
}

/** The club page: its screen, actions and forms (app/ registers them at startup). */
export const clubPage = {
  views: { club: viewClub },
  actions: {
    'club-reload': () => {
      const id = route().id;
      if (id) void loadClub(id);
    },
  },
  forms: {
    'club-short': async (data: FormData, formEl: HTMLFormElement) => {
      const clubId = formEl.dataset.cid ?? '';
      const short = String(data.get('short') ?? '').trim();
      try {
        const rows = await q<{ id: string }[]>(
          client().from('clubs').update({ short_name: short }).eq('id', clubId).select('id'),
        );
        if (!rows.length) throw Object.assign(new Error('not allowed'), { code: '42501' });
        const known = db.sync.clubs[clubId];
        if (known) known.shortName = short;
        toast(t('clubSaved'));
      } catch (e) {
        notify(accessError(e));
      }
      await refreshAccount();
      void syncNow();
      rerenderSoon();
    },
  },
};
