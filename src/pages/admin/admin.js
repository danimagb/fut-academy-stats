// @ts-nocheck -- moved as is from app/legacy.js; typed in step 8 (strict TypeScript).
import { rerender } from '@/shared/lib/rerender';
import { deleteMember } from '@/features/team-people/team-people';
// The Admin page (the admin only, online only): accounts and team memberships. Moved from
// app/legacy.js.
import {
  OFFLINE,
  accessError,
  kindLabel,
  myId,
  q,
  remote,
  roleLabel,
} from '@/features/team-people/team-people';
import { cloud, sb, syncNow } from '@/data/session';
import { plural } from '@/shared/i18n/i18n';
import { route } from '@/shared/lib/route';
import { bar } from '@/shared/ui/bar';
import { askConfirm, notify } from '@/shared/ui/dialog';
import { toast } from '@/shared/ui/toast';
import { isOffline } from '@/data/sync';
import { esc } from '@/shared/lib/html';
import { teamLabel } from '@/domain/titles';
import { t } from '@/shared/i18n/i18n';
import { rerenderSoon } from '@/shared/lib/rerender';
import { main } from '@/shared/ui/main';

// ---------- Admin page ----------

// Call the `admin` Edge Function. Errors come back as { error: code, message } with a status.
export async function adminCall(body) {
  const { data, error } = await sb.functions.invoke('admin', { body });
  if (!error) return data;
  const err = new Error(error.message);
  err.status = error.name === 'FunctionsFetchError' ? 0 : error.context?.status;
  try {
    const j = await error.context.json();
    Object.assign(err, { code: j.error || j.code, message: j.message || j.msg || error.message });
  } catch {}
  throw err;
}

export function adminError(e) {
  if (isOffline(e)) return t('needsInternet');
  if (e.code === 'exists') return t('errExists');
  if (e.code === 'invalid_email') return t('errEmail');
  if (e.code === 'not_admin') return t('errNotAdmin');
  if (e.code === 'self') return t('errSelf');
  if (e.code === 'is_admin') return t('errIsAdmin');
  if (e.status === 401) return t('errSession', { msg: esc(e.message) });
  return accessError(e);
}

export async function loadAdmin() {
  const st = { status: 'loading', accounts: [], teams: [], members: [] };
  remote.admin = st;
  try {
    if (!navigator.onLine) throw OFFLINE;
    const [accounts, teams] = await Promise.all([
      q(sb.from('accounts').select('user_id, email, kind, is_admin').order('email')),
      q(sb.from('teams').select('id, club, name').is('deleted_at', null).order('name')),
    ]);
    const members = await q(sb.from('team_members').select('team_id, user_id, role'));
    Object.assign(st, { accounts, teams, members, status: 'ok' });
  } catch (e) {
    st.status = isOffline(e) ? 'offline' : 'error';
    console.warn('Admin: load failed', e);
  }
  if (remote.admin === st && route().view === 'admin') rerenderSoon();
}

// An admin change: run it, say how it went, reload the page's data. Membership changes may be
// about this user's own teams, so sync too.
export async function adminDo(fn, okText, sync = false) {
  try {
    await fn();
    if (okText) toast(okText);
  } catch (e) {
    notify(adminError(e));
  }
  await loadAdmin();
  if (sync) syncNow();
}

export function viewAdmin() {
  const head = bar(t('admin'), '#/profile');
  if (!sb || !cloud.account?.isAdmin) {
    main.innerHTML = `${head}<p class="empty">${t('adminOnly')}</p>`;
    return;
  }
  const st = remote.admin;
  const me = myId();
  const give = `
    <h2>${t('giveAccess')}</h2>
    <form class="form" data-form="admin-create">
      <label>${t('email')}<input name="email" type="email" required autocomplete="off" inputmode="email"></label>
      <label>${t('accountKind')}<select name="kind">
        <option value="director">${t('acctDirector')}</option>
        <option value="coach" selected>${t('acctCoach')}</option>
      </select></label>
      <button class="btn primary">${t('giveAccess')}</button>
    </form>
    <p class="hint">${t('giveAccessHint')}</p>`;
  let body;
  if (!st || st.status === 'loading') body = `<p class="hint">${t('loading')}</p>`;
  else if (st.status !== 'ok')
    body = `<p class="hint warn">${t('needsInternet')}</p><button class="btn small ghost" data-action="admin-reload">${t('tryAgain')}</button>`;
  else {
    const email = new Map(st.accounts.map((a) => [a.user_id, a.email]));
    const teamsOf = (uid) => st.members.filter((m) => m.user_id === uid).length;
    const kindSelect = (
      a,
    ) => `<select class="mini" data-change="admin-kind" data-id="${esc(a.user_id)}" aria-label="${t('accountKind')}">
      ${['director', 'coach'].map((k) => `<option value="${k}" ${a.kind === k ? 'selected' : ''}>${kindLabel(k)}</option>`).join('')}</select>`;
    const accounts = `
      <h2>${t('accounts')} <span class="muted small">${st.accounts.length}</span></h2>
      <ul class="list admin-accounts">${st.accounts
        .map(
          (a) => `
        <li class="item wrap">
          <span class="grow"><span class="email">${esc(a.email)}</span>${a.user_id === me ? ` <span class="muted small">(${t('you')})</span>` : ''}
            <div class="muted small">${a.is_admin ? `${t('acctAdmin')} · ` : ''}${plural('teamsN', teamsOf(a.user_id))}</div></span>
          ${
            a.user_id === me || a.is_admin
              ? `<span class="muted small">${kindLabel(a.kind)}</span>`
              : `${kindSelect(a)}
          <button class="btn small ghost danger" data-action="admin-remove-account" data-id="${esc(a.user_id)}" aria-label="${t('removeAccess')}">✕</button>`
          }
        </li>`,
        )
        .join('')}</ul>`;
    const roleSelect = (
      m,
    ) => `<select class="mini" data-change="admin-role" data-tid="${esc(m.team_id)}" data-id="${esc(m.user_id)}" aria-label="${t('roleDirector')} / ${t('roleCoach')}">
      ${['director', 'coach'].map((r) => `<option value="${r}" ${m.role === r ? 'selected' : ''}>${roleLabel(r)}</option>`).join('')}</select>`;
    const teams = st.teams
      .map((tm) => {
        const ms = st.members
          .filter((m) => m.team_id === tm.id)
          .map((m) => ({ ...m, email: email.get(m.user_id) || '?' }))
          .sort(
            (a, b) =>
              (a.role === b.role ? 0 : a.role === 'director' ? -1 : 1) || a.email.localeCompare(b.email),
          );
        const others = st.accounts.filter((a) => !ms.some((m) => m.user_id === a.user_id));
        return `<li class="card admin-team">
        <div class="row gap"><strong class="grow">${esc(teamLabel(tm))}</strong>
          ${ms.some((m) => m.role === 'director') ? '' : `<span class="badge warn">${t('noDirector')}</span>`}</div>
        ${
          ms.length
            ? `<ul class="members">${ms
                .map(
                  (m) => `
          <li class="row gap"><span class="grow email">${esc(m.email)}</span>${roleSelect(m)}
            <button class="btn small ghost danger" data-action="admin-remove-member" data-tid="${esc(m.team_id)}" data-id="${esc(m.user_id)}" aria-label="${t('removeFromTeam')}">✕</button></li>`,
                )
                .join('')}</ul>`
            : `<p class="muted small">${t('noMembers')}</p>`
        }
        ${
          others.length
            ? `<form class="row gap add-member" data-form="admin-add-member" data-tid="${esc(tm.id)}">
          <select class="grow" name="user" required aria-label="${t('pickAccount')}"><option value="">${t('pickAccount')}</option>
            ${others.map((a) => `<option value="${esc(a.user_id)}">${esc(a.email)}</option>`).join('')}</select>
          <select class="mini" name="role" aria-label="${t('roleDirector')} / ${t('roleCoach')}">
            <option value="coach">${t('roleCoach')}</option><option value="director">${t('roleDirector')}</option></select>
          <button class="btn small">${t('addMember')}</button>
        </form>`
            : ''
        }
      </li>`;
      })
      .join('');
    body = `${accounts}
      <h2>${t('cloudTeams')} <span class="muted small">${st.teams.length}</span></h2>
      ${st.teams.length ? `<ul class="list">${teams}</ul>` : `<p class="empty">${t('noCloudTeams')}</p>`}`;
  }
  main.innerHTML = `${head}${give}${body}`;
  if (!st) loadAdmin();
}

/** The Admin page: its screen, actions and forms (app/ registers them at startup). */
export const adminPage = {
  views: { admin: viewAdmin },
  actions: {
    // Admin page
    'admin-reload': () => {
      remote.admin = null;
      rerender();
    },
    'admin-remove-account': async ({ id }) => {
      const a = remote.admin?.accounts.find((x) => x.user_id === id);
      const ok = await askConfirm({
        title: t('removeAccess'),
        message: t('removeAccessConfirm', { email: `<b>${esc(a?.email || '')}</b>` }),
        ok: t('removeAccess'),
        danger: true,
      });
      if (ok) adminDo(() => adminCall({ action: 'delete_account', user_id: id }), t('accessRemoved'));
    },
    'admin-remove-member': async ({ tid, id }) => {
      const a = remote.admin?.accounts.find((x) => x.user_id === id);
      const ok = await askConfirm({
        title: t('removeFromTeam'),
        message: t('removeMemberConfirm', { email: `<b>${esc(a?.email || '')}</b>` }),
        ok: t('removeFromTeam'),
        danger: true,
      });
      if (ok) adminDo(() => deleteMember(tid, id), t('removed'), true);
    },
  },
  forms: {
    'admin-create': (data, formEl) => {
      const email = String(data.get('email')).trim().toLowerCase();
      const btn = formEl.querySelector('button');
      btn.disabled = true;
      return adminDo(async () => {
        await adminCall({ action: 'create_account', email, kind: String(data.get('kind')) });
        notify(t('accessGiven', { email: `<b>${esc(email)}</b>` }), t('accessGivenTitle'));
      }).finally(() => {
        btn.disabled = false;
      });
    },
    'admin-add-member': (data, formEl) => {
      const teamId = formEl.dataset.tid;
      return adminDo(
        () =>
          q(
            sb.from('team_members').insert({
              team_id: teamId,
              user_id: String(data.get('user')),
              role: String(data.get('role')),
              invited_by: myId(),
            }),
          ),
        t('memberAdded'),
        true,
      );
    },
  },
};
