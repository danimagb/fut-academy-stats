// The club page (#/club/<id>), for the club's managers (UI: Coordenador): the short name, the
// club's teams on this phone and the club's people with their roles in its teams. The people are
// loaded online (RLS shows a club manager their club's people); nothing of it is cached.
import { managedClubs } from '@/data/auth';
import { cloud, refreshAccount, sb, syncNow } from '@/data/session';
import { isOffline } from '@/data/sync';
import { db, saveQuiet } from '@/data/store';
import { LOGO_PX, forgetLogo, keepLogo, logoPath, logoSrc, squareLogo } from '@/data/logos';
import { clubLogo } from '@/features/club-logo/club-logo';
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
import { accSection } from '@/shared/ui/accordion';
import { teamPlayers } from '@/data/queries';
import { askConfirm, notify } from '@/shared/ui/dialog';
import { main } from '@/shared/ui/main';
import { toast } from '@/shared/ui/toast';
import type { SupabaseClient } from '@supabase/supabase-js';

// The page's sections: Details closed, Teams and People open the first time (remembered while
// the app is open).
const clubOpen: Record<string, boolean> = { details: false, teams: true, people: true };

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
  const logo = logoSrc(clubId);
  const name = known?.name ?? club.name;
  const cid = esc(clubId);
  const nPeople = st?.status === 'ok' ? plural('peopleN', st.people.length) : '';
  // The crest is where you tap to add or change it (＋ when there's none, ✎ when there is).
  const crest = `<label class="club-crest ${logo ? '' : 'empty'}" aria-label="${t(logo ? 'logoChange' : 'logoAdd')}">
      ${logo ? clubLogo(logo, 'lg') : '<span class="club-crest-blank" aria-hidden="true">🛡</span>'}
      <span class="club-crest-badge" aria-hidden="true">${logo ? '✎' : '＋'}</span>
      <input type="file" accept="image/png,image/jpeg,image/webp" class="club-logo-file" hidden>
    </label>`;
  const details = `
    <form class="row gap club-short" data-form="club-short" data-cid="${cid}">
      <label class="grow">${t('clubShortName')}<input name="short" maxlength="20" value="${esc(shortName)}" placeholder="PFC" autocomplete="off"></label>
      <button class="btn small">${t('save')}</button>
    </form>
    <p class="hint">${t('clubShortHint')}</p>
    <p class="hint">${t('logoHint')}</p>
    ${logo ? `<button class="btn small ghost danger" data-action="club-logo-remove" data-cid="${cid}">${t('logoRemove')}</button>` : ''}`;
  const teamList = teams.length
    ? `<ul class="list">${teams
        .map(
          (tm) => `<li><a class="item club-team" href="#/team/${esc(tm.id)}">
        <strong class="grow">${esc(tm.name) || t('unnamedTeam')}</strong>
        <span class="muted small">${plural('playersCount', teamPlayers(tm.id).length)}</span>
        <svg class="go" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></a></li>`,
        )
        .join('')}</ul>`
    : `<p class="empty">${t('noClubTeamsYet')}</p>`;
  const section = (id: string, title: string, summary: string, body: string, add = ''): string =>
    accSection({
      id,
      title,
      summary,
      body,
      add,
      addData: add ? `data-cid="${cid}"` : '',
      open: !!clubOpen[id],
      toggle: 'club-section',
    });
  main.innerHTML = `
    ${bar(esc(name), '#/teams')}
    <div class="club-head">
      ${crest}
      <div class="grow">
        ${shortName ? `<strong>${esc(shortName)}</strong>` : ''}
        <div class="muted small">${[plural('teamsN', teams.length), nPeople].filter(Boolean).join(' · ')}</div>
      </div>
    </div>
    <div class="accordion club-sections">
      ${section('details', t('clubDetails'), [shortName || t('noShortName'), t(logo ? 'withLogo' : 'noLogo')].join(' · '), details)}
      ${section('teams', t('clubTeams'), plural('teamsN', teams.length), teamList, 'new-team')}
      ${section('people', t('clubPeople'), nPeople, `${people}<p class="hint">${t('clubPeopleHint')}</p>`)}
    </div>`;
  // Listen on the input itself: if the page is redrawn while the file picker is open, the old
  // input is no longer in the page, but it still gets the chosen file.
  main.querySelector<HTMLInputElement>('.club-logo-file')?.addEventListener('change', (e) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) void uploadClubLogo(clubId, file);
  });
  if (!st) void loadClub(clubId);
}

/** Puts the club's version of the logo on this phone's copy of the club (before the next sync). */
function setVersion(clubId: string, v: number | null): void {
  const known = db.sync.clubs[clubId];
  if (known) known.logoVersion = v;
  saveQuiet();
}

/** Uploads a new logo: the centre square of the image, 256 px, then bumps the club's logo version. */
export async function uploadClubLogo(clubId: string, file: File): Promise<void> {
  if (!navigator.onLine) return void notify(t('needsInternet'));
  toast(t('logoUploading'));
  try {
    const image = await squareLogo(file, LOGO_PX);
    const { error } = await client()
      .storage.from('club-logos')
      .upload(logoPath(clubId), image, { upsert: true, contentType: image.type, cacheControl: '31536000' });
    if (error) throw error;
    const v = await q<number>(client().rpc('set_club_logo', { _club_id: clubId, _present: true }));
    await keepLogo(clubId, v, image);
    setVersion(clubId, v);
    toast(t('logoSaved'));
  } catch (e) {
    console.warn('Club logo: upload failed', e);
    notify(e instanceof Error && /decode|image/i.test(e.message) ? t('logoBadImage') : accessError(e));
  }
  rerenderSoon();
  void syncNow();
}

/** The club page: its screen, actions and forms (app/ registers them at startup). */
export const clubPage = {
  views: { club: viewClub },
  actions: {
    'club-section': ({ v = '' }: DOMStringMap) => {
      clubOpen[v] = !clubOpen[v];
      rerenderSoon();
    },
    'club-reload': () => {
      const id = route().id;
      if (id) void loadClub(id);
    },
    'club-logo-remove': async ({ cid = '' }: DOMStringMap) => {
      const ok = await askConfirm({
        title: t('logoRemove'),
        message: t('logoRemoveConfirm'),
        ok: t('logoRemove'),
        danger: true,
      });
      if (!ok) return;
      try {
        const { error } = await client()
          .storage.from('club-logos')
          .remove([logoPath(cid)]);
        if (error) throw error;
        await q(client().rpc('set_club_logo', { _club_id: cid, _present: false }));
        forgetLogo(cid);
        setVersion(cid, null);
        toast(t('removed'));
      } catch (e) {
        notify(accessError(e));
      }
      rerenderSoon();
      void syncNow();
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
