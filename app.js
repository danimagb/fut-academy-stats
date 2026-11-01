'use strict';

// ---------- Config ----------

const STORE_KEY = 'fut-academy-stats.v1';
const LANG_KEY = 'fut-academy-stats.lang';

const FORMATS = [
  { id: 'U7', field: 3, periods: 2, periodMin: 20 },
  { id: 'U8', field: 4, periods: 2, periodMin: 20 },
  { id: 'U9', field: 6, periods: 2, periodMin: 25 },
  { id: 'U10', field: 6, periods: 2, periodMin: 25 },
  { id: 'U11', field: 8, periods: 2, periodMin: 30 },
  { id: 'U12', field: 8, periods: 2, periodMin: 30 },
  { id: 'U13+', field: 10, periods: 2, periodMin: 35 },
  { id: 'Custom', field: 4, periods: 2, periodMin: 20 },
];

// Formations per number of outfield players (defence → attack). The first one is the default.
const FORMATIONS = {
  1: ['1'],
  2: ['1-1', '2'],
  3: ['2-1', '1-2', '1-1-1'],
  4: ['1-2-1', '2-2', '2-1-1', '3-1'],
  5: ['2-2-1', '2-1-2', '1-2-2', '3-2'],
  6: ['2-3-1', '3-2-1', '2-1-2-1', '3-1-2'],
  7: ['3-3-1', '2-3-2', '3-2-2', '2-4-1'],
  8: ['3-3-2', '3-4-1', '2-4-2', '3-2-3'],
  9: ['4-3-2', '3-4-2', '4-4-1', '3-3-3'],
  10: ['4-4-2', '4-3-3', '4-2-3-1', '3-5-2', '4-1-4-1'],
};

// ---------- Language ----------

const I18N = {
  en: {
    newGame: '+ New game', teamsBtn: 'Teams ({n})',
    noGames: 'No games yet.<br>Create your team and its players, then create a game.',
    exportBackup: 'Export backup', importBackup: 'Import backup',
    opponent: 'Opponent', gkPlus: '1 GK + {n}', gk: 'GK',
    st_scheduled: 'Scheduled', st_live: 'Live', st_break: 'Break', st_finished: 'Finished',
    teams: 'Teams', newTeam: '+ New team', noTeams: 'No teams yet. Create your team, then add its players.',
    playersCount: '{n} players', unnamedTeam: 'My team',
    club: 'Club', clubPh: 'e.g. Padroense F.C.', team: 'Team', teamPh: 'e.g. U7 B',
    players: 'Players', shirtName: 'Shirt name (game screen)', fullName: 'Full name (report)', add: 'Add', edit: 'Edit',
    noPlayers: 'No players yet. Add the squad above.',
    deleteTeam: 'Delete team', teamHasPlayers: 'Remove the players from this team first.', confirmDeleteTeam: 'Delete this team?',
    editPlayer: 'Edit player', editGoal: 'Fix goal · {t}', whoScored: 'Who scored?', removeGoal: '🗑 Remove goal', confirmRemoveGoal: 'Remove this goal?', gameInfo: '✎ Game details', homeAway: 'Home / Away', shirtNumber: 'Shirt number', save: 'Save',
    confirmRemovePlayer: 'Remove {name} from the roster? Past games keep their stats.',
    editGame: 'Edit game', newGameTitle: 'New game', needTeam: 'Create your team and add its players first.', goTeams: 'Go to Teams',
    opponentPh: 'e.g. Sporting U8', home: 'Home', away: 'Away', round: 'Round (optional)',
    date: 'Date', time: 'Time', format: 'Age group / format', custom: 'Custom',
    fieldPlayers: 'Field players', periods: 'Periods', minPeriod: 'Min/period',
    autoStop: 'Auto-stop a half after this many extra minutes (in case you forget)',
    squad: 'Squad', squadHint: 'Choose Bench or Start for each player called up, then tap 🧤 on the goalkeeper.',
    startersCount: 'Starters {s}/{n}', benchCount: 'Bench {n}',
    selOut: 'Out', selBench: 'Bench', selStart: 'Start', gkAria: 'Goalkeeper', addNewPlayer: 'Add a new player',
    saveChanges: 'Save changes', createGame: 'Create game',
    errField: 'Set the number of field players.', errPeriods: 'Set the number of periods and minutes per period.',
    errDate: 'Set the game date.', errStarters: 'Pick exactly {need} starters (1 GK + {field}). You have {n}.',
    errGk: 'Tap 🧤 to choose the goalkeeper among the starters.',
    kickoff: '▶ Kick off', resume: '▶ Resume', fullTimeBtn: '🏁 Full time', fullTime: 'Full time',
    endPeriod: 'End {p}', startPeriod: '▶ Start {p}', viewReport: '📋 View report',
    notStarted: 'Not started · {n} × {m} min', paused: 'paused', breakAfter: 'Break after {p}',
    autoStoppedToast: '⏱ {p} auto-stopped at +{m} min', fixTimes: 'Fix times',
    timeUp: '⏰ {p}: time is up', extraMin: '⏰ {p}: +{m} min extra',
    evGoal: '⚽ Goal: {p}', evOppGoal: '🥅 Goal conceded',
    evYellow: '🟨 Yellow: {p}', evRed: '🟥 Red: {p}', evGk: '🧤 In goal: {p}', evStart: '⏱ Start of {p}', evEnd: '⏱ End of {p}',
    notFound: 'Not found', gameGone: 'This game no longer exists.', back: 'Back',
    autoStoppedAlert: '⏱ {p} was stopped automatically at +{m} min. If it ended earlier or the next half already started, tap <b>{fix}</b>.',
    oppGoalBtn: '+ Goal conceded', fixTimesBtn: '⏱ Fix times',
    formation: 'Formation',
    tabTeam: 'My Team', tabMatches: 'Matches', tabStats: 'Stats', tabProfile: 'Profile',
    soonTitle: 'Coming soon', soonMsg: '{x} will be available in a future version.', ok: 'OK', evPos: '↔ Position: {p}', posToast: '↔ {p} moved',
    onPitch: 'On pitch', bench: 'Bench', noSubs: 'No substitutes.', sentOff: 'Sent off', timeline: 'Timeline',
    undoX: '↶ Undo: {x}', undo: 'Undo', nothingYet: 'Nothing yet.', report: 'Report', deleteGame: 'Delete game', menu: 'Menu', deleteGameTitle: 'Delete game?', deleteBtn: 'Delete',
    goalBtn: 'Goal', yellowBtn: 'Yellow', redBtn: 'Red', toGoal: 'To goal', benchState: 'Bench', played: '{t} played',
    subOff: '🔁 Sub off, bring on:', subOn: '🔁 Sub on, replacing:', noAvail: 'No players available.', cancel: 'Cancel',
    fixTitle: '⏱ Fix times · {p}', whenEnd: '{p}: when did it really end?', regular: "{v}' regular", now: 'Now',
    other: 'Other:', nextStarted: '{p}: has it already started?', notYet: 'Not yet', minAgo: '{n} min ago',
    startedPre: 'Started', startedPost: 'min ago',
    previewEnds: '{p} ends at {t}', previewBreak: ' · now on break', previewStarted: ' · {p} started {n} min ago',
    apply: 'Apply', errFixEnd: 'The end must be between {a} and {b}.', errFixStart: '{p} ended less time ago than that.',
    timesFixed: '⏱ Times fixed',
    gameReport: 'Game report', gameTime: 'Game time {t}', inProgress: 'game still in progress',
    didNotPlay: 'Did not play', notCalled: 'Not called up',
    reportHint: 'Preview of the PDF (scroll sideways to see every column). Each half starts at its regular time; extra time shows as (+mm:ss).',
    pdf: '📄 Share PDF',
    confirmFullTime: 'End the game (full time)?', confirmDeleteGame: 'Delete this game and all its stats?',
    gkSentOff: '🟥 GK sent off: tap a player › To goal', inGoalToast: '🧤 {p} in goal',
    confirmRestore: 'Replace all data with this backup ({p} players, {g} games)?',
    restored: 'Backup restored', badBackup: 'That file is not a valid backup.',
    p1: '1st half', p2: '2nd half', pQ: 'Q{n}', pGame: 'Game', pN: 'Period {n}',
    pdfTitle: 'Stats sheet', pdfSeason: 'Season', pdfGame: 'GAME:', pdfRound: 'ROUND:', pdfDate: 'DATE:',
    pdfNo: 'No.', pdfPlayer: 'Player', pdfShirt: 'Shirt', pdfStints: 'ON – OFF', pdfMinutes: 'MINUTES',
    pdfGoals: 'GOALS', pdfYellow: 'YELLOW', pdfRed: 'RED', pdfTotal: 'Total', pdfStarter: 'STARTER', pdfSub: 'SUB', fileRound: 'Round', fileStats: 'Stats',
  },
  pt: {
    newGame: '+ Novo jogo', teamsBtn: 'Equipas ({n})',
    noGames: 'Ainda não há jogos.<br>Cria a tua equipa com os jogadores e depois um jogo.',
    exportBackup: 'Exportar cópia', importBackup: 'Importar cópia',
    opponent: 'Adversário', gkPlus: '1 GR + {n}', gk: 'GR',
    st_scheduled: 'Agendado', st_live: 'A decorrer', st_break: 'Intervalo', st_finished: 'Terminado',
    teams: 'Equipas', newTeam: '+ Nova equipa', noTeams: 'Ainda não há equipas. Cria a tua equipa e adiciona os jogadores.',
    playersCount: '{n} jogadores', unnamedTeam: 'A minha equipa',
    club: 'Clube', clubPh: 'ex.: Padroense F.C.', team: 'Equipa', teamPh: 'ex.: Sub-7B',
    players: 'Jogadores', shirtName: 'Nome na camisola (ecrã de jogo)', fullName: 'Nome completo (relatório)', add: 'Adicionar', edit: 'Editar',
    noPlayers: 'Ainda não há jogadores. Adiciona o plantel acima.',
    deleteTeam: 'Apagar equipa', teamHasPlayers: 'Remove primeiro os jogadores desta equipa.', confirmDeleteTeam: 'Apagar esta equipa?',
    editPlayer: 'Editar jogador', editGoal: 'Corrigir golo · {t}', whoScored: 'Quem marcou?', removeGoal: '🗑 Apagar golo', confirmRemoveGoal: 'Apagar este golo?', gameInfo: '✎ Dados do jogo', homeAway: 'Casa / Fora', shirtNumber: 'Número da camisola', save: 'Guardar',
    confirmRemovePlayer: 'Remover {name} do plantel? Os jogos anteriores mantêm as estatísticas.',
    editGame: 'Editar jogo', newGameTitle: 'Novo jogo', needTeam: 'Cria primeiro a tua equipa e adiciona os jogadores.', goTeams: 'Ir para Equipas',
    opponentPh: 'ex.: Sporting Sub-8', home: 'Casa', away: 'Fora', round: 'Jornada (opcional)',
    date: 'Data', time: 'Hora', format: 'Escalão / formato', custom: 'Personalizado',
    fieldPlayers: 'Jogadores de campo', periods: 'Partes', minPeriod: 'Min/parte',
    autoStop: 'Parar automaticamente uma parte após estes minutos extra (caso te esqueças)',
    squad: 'Convocados', squadHint: 'Escolhe Suplente ou Titular para cada convocado e toca em 🧤 no guarda-redes.',
    startersCount: 'Titulares {s}/{n}', benchCount: 'Suplentes {n}',
    selOut: 'Fora', selBench: 'Suplente', selStart: 'Titular', gkAria: 'Guarda-redes', addNewPlayer: 'Adicionar novo jogador',
    saveChanges: 'Guardar alterações', createGame: 'Criar jogo',
    errField: 'Indica o número de jogadores de campo.', errPeriods: 'Indica o número de partes e os minutos por parte.',
    errDate: 'Indica a data do jogo.', errStarters: 'Escolhe exatamente {need} titulares (1 GR + {field}). Tens {n}.',
    errGk: 'Toca em 🧤 para escolher o guarda-redes entre os titulares.',
    kickoff: '▶ Início', resume: '▶ Retomar', fullTimeBtn: '🏁 Fim do jogo', fullTime: 'Fim do jogo',
    endPeriod: 'Terminar {p}', startPeriod: '▶ Iniciar {p}', viewReport: '📋 Ver relatório',
    notStarted: 'Por começar · {n} × {m} min', paused: 'em pausa', breakAfter: 'Intervalo após {p}',
    autoStoppedToast: '⏱ {p} parada automaticamente aos +{m} min', fixTimes: 'Corrigir tempos',
    timeUp: '⏰ {p}: tempo esgotado', extraMin: '⏰ {p}: +{m} min extra',
    evGoal: '⚽ Golo: {p}', evOppGoal: '🥅 Golo sofrido',
    evYellow: '🟨 Amarelo: {p}', evRed: '🟥 Vermelho: {p}', evGk: '🧤 Na baliza: {p}', evStart: '⏱ Início: {p}', evEnd: '⏱ Fim: {p}',
    notFound: 'Não encontrado', gameGone: 'Este jogo já não existe.', back: 'Voltar',
    autoStoppedAlert: '⏱ {p} foi parada automaticamente aos +{m} min. Se terminou antes ou se a parte seguinte já começou, toca em <b>{fix}</b>.',
    oppGoalBtn: '+ Golo sofrido', fixTimesBtn: '⏱ Corrigir tempos',
    formation: 'Tática',
    tabTeam: 'Equipa', tabMatches: 'Jogos', tabStats: 'Estatísticas', tabProfile: 'Perfil',
    soonTitle: 'Em breve', soonMsg: '{x} estará disponível numa próxima versão.', ok: 'OK', evPos: '↔ Posição: {p}', posToast: '↔ {p} mudou de posição',
    onPitch: 'Em campo', bench: 'Suplentes', noSubs: 'Sem suplentes.', sentOff: 'Expulsos', timeline: 'Cronologia',
    undoX: '↶ Desfazer: {x}', undo: 'Desfazer', nothingYet: 'Ainda nada.', report: 'Relatório', deleteGame: 'Apagar jogo', menu: 'Menu', deleteGameTitle: 'Apagar jogo?', deleteBtn: 'Apagar',
    goalBtn: 'Golo', yellowBtn: 'Amarelo', redBtn: 'Vermelho', toGoal: 'Para a baliza', benchState: 'Suplente', played: '{t} jogados',
    subOff: '🔁 Sai, entra:', subOn: '🔁 Entra, para o lugar de:', noAvail: 'Sem jogadores disponíveis.', cancel: 'Cancelar',
    fixTitle: '⏱ Corrigir tempos · {p}', whenEnd: '{p}: quando terminou realmente?', regular: "{v}' regulamentar", now: 'Agora',
    other: 'Outro:', nextStarted: '{p}: já começou?', notYet: 'Ainda não', minAgo: 'há {n} min',
    startedPre: 'Começou há', startedPost: 'min',
    previewEnds: '{p} termina aos {t}', previewBreak: ' · agora em intervalo', previewStarted: ' · {p} começou há {n} min',
    apply: 'Aplicar', errFixEnd: 'O fim tem de estar entre {a} e {b}.', errFixStart: '{p} terminou há menos tempo do que isso.',
    timesFixed: '⏱ Tempos corrigidos',
    gameReport: 'Relatório do jogo', gameTime: 'Tempo de jogo {t}', inProgress: 'jogo ainda a decorrer',
    didNotPlay: 'Não jogou', notCalled: 'Não convocado',
    reportHint: 'Pré-visualização do PDF (desliza para o lado para ver todas as colunas). Cada parte começa no seu tempo regulamentar; o tempo extra aparece como (+mm:ss).',
    pdf: '📄 Partilhar PDF',
    confirmFullTime: 'Terminar o jogo?', confirmDeleteGame: 'Apagar este jogo e todas as estatísticas?',
    gkSentOff: '🟥 GR expulso: toca num jogador › Para a baliza', inGoalToast: '🧤 {p} na baliza',
    confirmRestore: 'Substituir todos os dados por esta cópia ({p} jogadores, {g} jogos)?',
    restored: 'Cópia restaurada', badBackup: 'Esse ficheiro não é uma cópia válida.',
    p1: '1ª parte', p2: '2ª parte', pQ: '{n}.º período', pGame: 'Jogo', pN: '{n}.º período',
    pdfTitle: 'Folha de estatísticas', pdfSeason: 'Época', pdfGame: 'JOGO:', pdfRound: 'JORNADA:', pdfDate: 'DATA:',
    pdfNo: 'Nº', pdfPlayer: 'Atleta', pdfShirt: 'Cam.', pdfStints: 'ENTRADA – SAÍDA', pdfMinutes: 'MINUTOS',
    pdfGoals: 'GOLOS', pdfYellow: 'AMARELO', pdfRed: 'VERMELHO', pdfTotal: 'Total', pdfStarter: 'TITULAR', pdfSub: 'SUPLENTE', fileRound: 'Jornada', fileStats: 'Estatisticas',
  },
};

let lang = localStorage.getItem(LANG_KEY) || ((navigator.language || '').toLowerCase().startsWith('pt') ? 'pt' : 'en');
document.documentElement.lang = lang;

function t(key, vars = {}) {
  const s = I18N[lang][key] ?? I18N.en[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}

const locale = () => (lang === 'pt' ? 'pt-PT' : 'en-GB');

// ---------- Storage ----------

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

let db = load();

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORE_KEY));
    if (data && Array.isArray(data.players) && Array.isArray(data.games)) return normalize(data);
  } catch {}
  return normalize({ players: [], games: [] });
}

// Players belong to a team. Data from before teams existed gets one team holding everyone.
function normalize(data) {
  if (!Array.isArray(data.teams)) data.teams = [];
  const orphans = data.players.filter((p) => !data.teams.some((tm) => tm.id === p.teamId));
  if (orphans.length) {
    if (!data.teams.length) data.teams.push({ id: uid(), club: '', name: '' });
    for (const p of orphans) p.teamId = data.teams[0].id;
  }
  return data;
}

function save() {
  localStorage.setItem(STORE_KEY, JSON.stringify(db));
}

// ---------- Helpers ----------

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const main = $('#main');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n) => String(n).padStart(2, '0');

function fmtClock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}

const fmtMins = (ms) => `${Math.floor(ms / 60000)}'`;

function isoDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fmtDate(g) {
  const d = new Date(`${g.date}T${g.time || '00:00'}`);
  if (isNaN(d)) return g.date || '';
  return d.toLocaleString(locale(), { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const getGame = (id) => db.games.find((g) => g.id === id);
const getTeam = (id) => db.teams.find((tm) => tm.id === id);
const teamLabel = (tm) => tm.name || tm.club || t('unnamedTeam');
const teamPlayers = (teamId) => db.players.filter((p) => p.teamId === teamId);

const byNumber = (a, b) =>
  (parseInt(a.number, 10) || 999) - (parseInt(b.number, 10) || 999) || a.name.localeCompare(b.name);

function sortIds(g, ids) {
  return [...ids].sort((a, b) => byNumber(g.names[a], g.names[b]));
}

function pname(g, id) {
  const p = g.names[id];
  if (!p) return '?';
  return p.number ? `#${p.number} ${p.name}` : p.name;
}

function periodName(g, n) {
  if (g.periods === 2) return n === 1 ? t('p1') : t('p2');
  if (g.periods === 4) return t('pQ', { n });
  if (g.periods === 1) return t('pGame');
  return t('pN', { n });
}

const formatLine = (g) => `${esc(fmtDate(g))} · ${esc(g.formatId === 'Custom' ? t('custom') : g.formatId)} · ${t('gkPlus', { n: g.field })}`;

// "Club x Opponent" (or the other way round when playing away).
function matchTitle(g) {
  const us = g.club || g.team;
  const them = g.opponent || t('opponent');
  if (!us) return `vs ${them}`;
  return g.home === false ? `${them} x ${us}` : `${us} x ${them}`;
}

// Optional button HTML (e.g. Undo) is shown next to the message.
// `msg` is plain text; pass { html } instead for already-escaped markup.
function toast(msg, button = '') {
  const el = $('#toast');
  el.innerHTML = `<span>${msg.html ?? esc(msg)}</span>${button}`;
  el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (el.hidden = true), button ? 6000 : 2200);
}

const undoBtn = (eventId) => `<button data-action="undo-toast" data-id="${eventId}">${t('undo')}</button>`;

const buzz = () => navigator.vibrate?.(35);

function download(filename, data, type) {
  const url = URL.createObjectURL(data instanceof Blob ? data : new Blob([data], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------- Clock ----------
// Match time (e.t, marks, clock) counts only time actually played, so minutes
// played add up. The clock shown to the coach restarts every period at its
// regular start (2nd half at 20:00), and extra time shows as "20:00 (+02:00)".

function matchTime(g) {
  const c = g.clock;
  return c.elapsedMs + (c.running ? Date.now() - c.startedAt : 0);
}

function startClock(g) {
  if (g.clock.running) return;
  g.clock.running = true;
  g.clock.startedAt = Date.now();
}

function stopClock(g) {
  if (!g.clock.running) return;
  g.clock.elapsedMs = matchTime(g);
  g.clock.running = false;
  g.clock.startedAt = null;
}

function periodStart(g) {
  const m = [...g.marks].reverse().find((x) => x.type === 'start');
  return m ? m.t : 0;
}

// Game clock for `ms` into period p.
function fmtInPeriod(g, p, ms) {
  const regular = g.periodMin * 60000;
  const offset = (p - 1) * regular;
  return Math.floor(ms / 1000) > g.periodMin * 60
    ? `${fmtClock(offset + regular)} (+${fmtClock(ms - regular)})`
    : fmtClock(offset + ms);
}

// Game clock for match time t. A time on the boundary between two periods
// counts as the end of the earlier one, or the start of the later one with atStart.
function fmtAt(g, t, atStart = false) {
  let m = null;
  for (const x of g.marks) if (x.type === 'start' && (!m || (atStart ? x.t <= t : x.t < t))) m = x;
  return m ? fmtInPeriod(g, m.period, t - m.t) : fmtClock(t);
}

function fmtNow(g) {
  if (g.status === 'live') return fmtInPeriod(g, g.clock.period, matchTime(g) - periodStart(g));
  return fmtAt(g, matchTime(g));
}

function periodLabel(g) {
  const c = g.clock;
  switch (g.status) {
    case 'scheduled': return t('notStarted', { n: g.periods, m: g.periodMin });
    case 'live': return `${periodName(g, c.period)}${c.running ? '' : ` (${t('paused')})`}`;
    case 'break': return t('breakAfter', { p: periodName(g, c.period) });
    default: return t('fullTime');
  }
}

const maxExtraMs = (g) => (g.maxExtra ?? 10) * 60000;

// Ends the current period at match time endT (may be earlier than now).
// Events logged after endT happened during the break, so they move to endT.
function endPeriodAt(g, endT) {
  stopClock(g);
  g.clock.elapsedMs = endT;
  for (const e of g.events) if (e.t > endT) e.t = endT;
  g.marks.push({ type: 'end', period: g.clock.period, t: endT, wall: Date.now() });
  g.status = g.clock.period >= g.periods ? 'finished' : 'break';
}

// Reminders once regular time is up, and an automatic stop if the coach forgets.
function checkTime(g) {
  const p = g.clock.period;
  const pt = matchTime(g) - periodStart(g);
  const regular = g.periodMin * 60000;
  const onThisGame = route().view === 'game' && route().id === g.id;
  const last = p >= g.periods;

  if (pt >= regular + maxExtraMs(g)) {
    endPeriodAt(g, periodStart(g) + regular + maxExtraMs(g));
    g.autoStopped = p;
    save();
    navigator.vibrate?.([500, 200, 500]);
    if (onThisGame) {
      render();
      toast(t('autoStoppedToast', { p: periodName(g, p), m: g.maxExtra ?? 10 }), `<button data-action="fix-open">${t('fixTimes')}</button>`);
    }
    return;
  }
  if (pt >= regular) {
    const n = Math.floor((pt - regular) / 120000); // remind every 2 minutes
    if ((g.alerted[p] ?? -1) >= n) return;
    g.alerted[p] = n;
    save();
    navigator.vibrate?.([300, 150, 300]);
    if (onThisGame) {
      const msg = n === 0 ? t('timeUp', { p: periodName(g, p) }) : t('extraMin', { p: periodName(g, p), m: Math.floor((pt - regular) / 60000) });
      toast(msg, `<button data-action="end-period">${last ? t('fullTime') : t('endPeriod', { p: periodName(g, p) })}</button>`);
    }
  }
}

// "I forgot to press the button": set when the period really ended and,
// optionally, how long ago the next one started. Event times are rebuilt from
// their real (wall-clock) timestamps.
function applyFix(g, endMin, startedMinAgo) {
  const p = g.clock.period;
  const last = p >= g.periods;
  const startIdx = g.marks.map((m) => m.type).lastIndexOf('start');
  const start = g.marks[startIdx]?.t ?? 0;
  const endT = start + Math.round(endMin * 60000);
  const resumeWall = startedMinAgo != null && !last ? Date.now() - Math.round(startedMinAgo * 60000) : null;

  for (const e of g.events) {
    if (e.t <= endT) continue;
    e.t = resumeWall != null && e.wall >= resumeWall ? endT + (e.wall - resumeWall) : endT;
  }
  g.marks = g.marks.slice(0, startIdx + 1);
  g.marks.push({ type: 'end', period: p, t: endT, wall: Date.now() });
  Object.assign(g.clock, { running: false, startedAt: null, elapsedMs: endT });
  g.autoStopped = null;

  if (resumeWall != null) {
    g.clock.period = p + 1;
    g.marks.push({ type: 'start', period: p + 1, t: endT, wall: resumeWall });
    Object.assign(g.clock, { running: true, startedAt: resumeWall });
    g.status = 'live';
    delete g.alerted[p + 1];
  } else {
    g.status = last ? 'finished' : 'break';
  }
  save();
}

// ---------- Pitch positions ----------
// A lineup is one id (or null) per slot: slot 0 is the goal, slots 1..field follow the
// formation from defence to attack, left to right. Changing formation keeps the slots.

const formationsFor = (n) => FORMATIONS[n] || [String(n)];

function formationOf(g) {
  const list = formationsFor(g.field);
  if (list.includes(g.formation)) return g.formation;
  const last = db.formations?.[g.field];
  return list.includes(last) ? last : list[0];
}

// Slot positions in % of the pitch (own goal at the bottom).
function slotCoords(formation) {
  const rows = formation.split('-').map(Number);
  const pts = [{ x: 50, y: 91 }];
  rows.forEach((n, r) => {
    const y = rows.length === 1 ? 55 : 74 - r * (56 / (rows.length - 1));
    for (let i = 0; i < n; i++) pts.push({ x: 50 + ((i + 1) / (n + 1) - 0.5) * 115, y });
  });
  return pts;
}

// Keep players where they were, put the GK in goal and fill the gaps in shirt order.
function fitLineup(prev, starters, gkId, size) {
  const slots = Array(size).fill(null);
  slots[0] = starters.includes(gkId) ? gkId : null;
  const rest = starters.filter((id) => id !== slots[0]);
  (prev || []).forEach((id, i) => { if (i > 0 && i < size && rest.includes(id)) slots[i] = id; });
  const left = rest.filter((id) => !slots.includes(id));
  for (let i = 1; i < size; i++) if (!slots[i]) slots[i] = left.shift() ?? null;
  return slots;
}

const startLineup = (g) => fitLineup(g.lineup, sortIds(g, g.starters), g.gkId, g.field + 1);

// ---------- Game state (derived from events) ----------

function derive(g) {
  const on = new Set(g.starters);
  const sentOff = new Set();
  let gk = g.gkId;
  const slots = startLineup(g);
  let us = 0;
  let them = 0;
  const stats = {};
  for (const id of g.squad) stats[id] = { intervals: [], open: null, goals: 0, yellow: 0, red: 0, redAt: null };
  for (const id of g.starters) stats[id].open = 0;

  const close = (s, t) => {
    if (s.open != null) s.intervals.push([s.open, t]);
    s.open = null;
  };

  for (const e of g.events) {
    const s = stats[e.playerId];
    switch (e.type) {
      case 'sub':
        on.delete(e.playerId);
        on.add(e.inId);
        close(s, e.t);
        stats[e.inId].open = e.t;
        if (gk === e.playerId) gk = e.inId;
        if (slots.includes(e.playerId)) slots[slots.indexOf(e.playerId)] = e.inId;
        else if (slots.includes(null)) slots[slots.indexOf(null)] = e.inId;
        break;
      case 'goal': s.goals++; us++; break;
      case 'oppgoal': them++; break;
      case 'yellow': s.yellow++; break;
      case 'red':
        s.red++;
        s.redAt = e.t;
        sentOff.add(e.playerId);
        if (on.delete(e.playerId)) close(s, e.t);
        if (gk === e.playerId) gk = null;
        if (slots.includes(e.playerId)) slots[slots.indexOf(e.playerId)] = null;
        break;
      case 'gk': {
        gk = e.playerId;
        const i = slots.indexOf(e.playerId);
        if (i > 0) [slots[0], slots[i]] = [e.playerId, slots[0]];
        break;
      }
      case 'pos': { // move an outfield player to another outfield slot, swapping with whoever is there
        const i = slots.indexOf(e.playerId);
        if (i > 0 && e.slot > 0 && e.slot < slots.length) [slots[i], slots[e.slot]] = [slots[e.slot], e.playerId];
        break;
      }
    }
  }

  const end = matchTime(g);
  for (const id of g.squad) {
    const s = stats[id];
    if (s.open != null) s.intervals.push([s.open, end]);
    s.intervals = s.intervals.filter(([a, b]) => b > a || g.status === 'scheduled');
    s.played = s.intervals.reduce((sum, [a, b]) => sum + (b - a), 0);
  }
  return { on, sentOff, gk, us, them, stats, slots };
}

function addEvent(g, e) {
  const id = uid();
  g.events.push({ id, t: matchTime(g), wall: Date.now(), ...e });
  save();
  buzz();
  return id;
}

function doSub(g, out, inn) {
  const id = addEvent(g, { type: 'sub', playerId: out, inId: inn });
  render();
  toast({ html: subLine(esc(pname(g, inn)), esc(pname(g, out))) }, undoBtn(id));
}

// Move a pitch player to a slot (swapping with whoever is there). Moving into or out of
// goal changes the goalkeeper. Before kick-off this just edits the starting lineup.
function movePlayer(g, id, slot) {
  const d = derive(g);
  const from = d.slots.indexOf(id);
  if (from < 0 || from === slot) return;
  const other = d.slots[slot];
  const newGk = slot === 0 ? id : from === 0 ? other : null;
  if (from === 0 && !other) return; // the GK can't leave the goal empty
  if (g.status === 'scheduled' && !g.events.length) {
    const s = [...d.slots];
    [s[from], s[slot]] = [s[slot], s[from]];
    g.lineup = s;
    g.gkId = s[0];
    save();
    buzz();
    render();
    return;
  }
  const eid = newGk ? addEvent(g, { type: 'gk', playerId: newGk }) : addEvent(g, { type: 'pos', playerId: id, slot });
  render();
  toast(newGk ? t('inGoalToast', { p: g.names[newGk].name }) : t('posToast', { p: g.names[id].name }), undoBtn(eid));
}

// Substitution line: green ▲ for the player coming on, red ▼ for the one going off.
// Names must already be escaped.
const subLine = (inName, outName) =>
  `<span class="nw"><span class="sub-in" aria-hidden="true">▲</span>${inName}</span> <span class="nw"><span class="sub-out" aria-hidden="true">▼</span>${outName}</span>`;

function describe(g, e) {
  switch (e.type) {
    case 'sub': return subLine(esc(pname(g, e.inId)), esc(pname(g, e.playerId)));
    case 'goal': return t('evGoal', { p: esc(pname(g, e.playerId)) });
    case 'oppgoal': return t('evOppGoal');
    case 'yellow': return t('evYellow', { p: esc(pname(g, e.playerId)) });
    case 'red': return t('evRed', { p: esc(pname(g, e.playerId)) });
    case 'gk': return t('evGk', { p: esc(pname(g, e.playerId)) });
    case 'pos': return t('evPos', { p: esc(pname(g, e.playerId)) });
    case 'start': return t('evStart', { p: periodName(g, e.period) });
    case 'end': return t('evEnd', { p: periodName(g, e.period) });
  }
  return '';
}

// Timeline time: a period start shows its regular start, everything else the game clock.
// Events logged during a break sit exactly on the end of the period before it, and
// show at the start of the next one (a half-time sub is at 20:00, not 20:00 (+00:02)).
function timeOf(g, e) {
  if (e.type === 'start') return fmtInPeriod(g, e.period, 0);
  const brk = e.type !== 'end' && g.marks.find((m) => m.type === 'end' && m.t === e.t && m.period < g.periods);
  return brk ? fmtInPeriod(g, brk.period + 1, 0) : fmtAt(g, e.t);
}

// ---------- Routing ----------

let draft = null;

function route() {
  const [, view = 'games', id] = location.hash.split('/');
  return { view, id };
}

function render() {
  closeSheet();
  const { view, id } = route();
  const views = {
    games: viewGames, teams: viewTeams, players: viewTeams, team: viewTeam,
    new: viewEdit, edit: viewEdit, game: viewGame, report: viewReport,
  };
  (views[view] || viewGames)(id);
  renderTabbar(view);
  updateWakeLock();
}

// ---------- Bottom tab bar ----------

const TAB_ICONS = {
  team: '<path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z"/>',
  matches: '<circle cx="12" cy="12" r="9"/><path class="f" d="M12 7.5l4.3 3.1-1.6 5h-5.4l-1.6-5z"/><path d="M12 3v4.5M20.6 9.2l-4.3 1.4M17.3 19.4l-2.6-3.8M6.7 19.4l2.6-3.8M3.4 9.2l4.3 1.4"/>',
  stats: '<path d="M5 20V12M10 20V5M15 20V9M20 20V14"/>',
  profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
};

function renderTabbar(view) {
  const active = ['teams', 'team', 'players'].includes(view) ? 'team' : 'matches';
  const myTeam = db.teams.length === 1 ? `#/team/${db.teams[0].id}` : '#/teams';
  const icon = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${TAB_ICONS[k]}</svg>`;
  const tab = (k, label, attrs) => `<${attrs.startsWith('href') ? 'a' : 'button'} class="tab ${active === k ? 'on' : ''}" ${attrs}>${icon(k)}<span>${label}</span></${attrs.startsWith('href') ? 'a' : 'button'}>`;
  $('#tabbar').innerHTML =
    tab('team', t('tabTeam'), `href="${myTeam}"`) +
    tab('matches', t('tabMatches'), 'href="#/games"') +
    tab('stats', t('tabStats'), 'data-action="soon" data-v="tabStats"') +
    tab('profile', t('tabProfile'), 'data-action="soon" data-v="tabProfile"');
}

window.addEventListener('hashchange', () => {
  draft = null;
  render();
  window.scrollTo(0, 0);
});

// `menu` is optional HTML for the items of a ⋯ menu shown on the right of the bar.
function bar(title, back, menu = '') {
  return `<header class="bar">${back ? `<a class="back" href="${back}" aria-label="${t('back')}">‹</a>` : ''}<h1>${title}</h1>${menu ? `
    <div class="menu">
      <button class="menu-btn" data-action="menu-toggle" aria-label="${t('menu')}" aria-haspopup="true" aria-expanded="false">⋯</button>
      <div class="menu-list" role="menu" hidden>${menu}</div>
    </div>` : ''}</header>`;
}

function closeMenus() {
  for (const m of document.querySelectorAll('.menu-list:not([hidden])')) {
    m.hidden = true;
    m.previousElementSibling?.setAttribute('aria-expanded', 'false');
  }
}

// A styled replacement for confirm(): resolves true only when the user taps the confirm button.
function askConfirm({ title, message, ok, danger = false, cancel = true }) {
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = 'dialog';
    el.innerHTML = `
      <div class="dialog-backdrop" data-v="0"></div>
      <div class="dialog-box" role="alertdialog" aria-modal="true" aria-labelledby="dialog-title">
        <h3 id="dialog-title">${title}</h3>
        ${message ? `<p class="muted">${message}</p>` : ''}
        <div class="row gap">
          ${cancel ? `<button class="btn ghost grow" data-v="0">${t('cancel')}</button>` : ''}
          <button class="btn grow ${danger ? 'danger-fill' : 'primary'}" data-v="1">${ok}</button>
        </div>
      </div>`;
    const done = (v) => {
      el.remove();
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('hashchange', onHash);
      resolve(v);
    };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); done(false); } };
    const onHash = () => done(false);
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-v]');
      if (!b) return;
      e.stopPropagation();
      done(b.dataset.v === '1');
    });
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('hashchange', onHash);
    document.body.appendChild(el);
    el.querySelector('.dialog-box .btn').focus({ preventScroll: true });
  });
}

function notFound() {
  main.innerHTML = `${bar(t('notFound'), '#/games')}<p class="empty">${t('gameGone')}</p>`;
}

// ---------- Views: games list ----------

function viewGames() {
  const games = [...db.games].sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));
  main.innerHTML = `
    ${bar('⚽ Fut Academy Stats')}
    <div class="row gap">
      <a class="btn primary grow" href="#/new">${t('newGame')}</a>
      <a class="btn" href="#/teams">${t('teamsBtn', { n: db.teams.length })}</a>
    </div>
    ${games.length
      ? `<ul class="list">${games.map(gameCard).join('')}</ul>`
      : `<p class="empty">${t('noGames')}</p>`}
    <div class="row gap foot">
      <button class="btn small ghost" data-action="backup">${t('exportBackup')}</button>
      <label class="btn small ghost">${t('importBackup')}<input type="file" accept="application/json,.json" data-change="restore" hidden></label>
      <span class="seg lang">
        <button class="${lang === 'en' ? 'on' : ''}" data-action="lang" data-v="en">EN</button>
        <button class="${lang === 'pt' ? 'on' : ''}" data-action="lang" data-v="pt">PT</button>
      </span>
    </div>`;
}

function gameCard(g) {
  const d = derive(g);
  const href = g.status === 'finished' ? `#/report/${g.id}` : `#/game/${g.id}`;
  return `<li><a class="card" href="${href}">
    <div class="grow">
      <strong>${esc(matchTitle(g))}</strong>
      <div class="muted">${g.team ? `${esc(g.team)} · ` : ''}${formatLine(g)}</div>
    </div>
    <div class="right">
      ${g.status !== 'scheduled' ? `<div class="score">${d.us}–${d.them}</div>` : ''}
      <span class="badge ${g.status}">${t(`st_${g.status}`)}</span>
    </div>
  </a></li>`;
}

// ---------- Views: teams and their players ----------

function viewTeams() {
  main.innerHTML = `
    ${bar(t('teams'), '#/games')}
    <button class="btn primary block" data-action="new-team">${t('newTeam')}</button>
    ${db.teams.length ? `<ul class="list">${db.teams.map((tm) => `
      <li><a class="card" href="#/team/${tm.id}">
        <div class="grow">
          <strong>${esc(teamLabel(tm))}</strong>
          ${tm.club ? `<div class="muted">${esc(tm.club)}</div>` : ''}
        </div>
        <span class="badge">${t('playersCount', { n: teamPlayers(tm.id).length })}</span>
      </a></li>`).join('')}</ul>` : `<p class="empty">${t('noTeams')}</p>`}`;
}

function viewTeam(id) {
  const tm = getTeam(id);
  if (!tm) return viewTeams();
  const ps = teamPlayers(id).sort(byNumber);
  main.innerHTML = `
    ${bar(esc(teamLabel(tm)), '#/teams')}
    <div class="form">
      <label>${t('club')}<input data-team="club" value="${esc(tm.club)}" placeholder="${t('clubPh')}" autocomplete="off"></label>
      <label>${t('team')}<input data-team="name" value="${esc(tm.name)}" placeholder="${t('teamPh')}" autocomplete="off"></label>
    </div>
    <h2>${t('players')}</h2>
    <form class="add-player" data-form="add-player">
      <div class="row gap">
        <input class="num" name="number" inputmode="numeric" placeholder="#" maxlength="3">
        <input class="grow" name="name" placeholder="${t('shirtName')}" required autocomplete="off">
      </div>
      <div class="row gap">
        <input class="grow" name="fullName" placeholder="${t('fullName')}" autocomplete="off">
        <button class="btn primary">${t('add')}</button>
      </div>
    </form>
    ${ps.length ? `<ul class="list">${ps.map((p) => `
      <li class="item">
        <span class="shirt">${esc(p.number) || '–'}</span>
        <span class="grow">${esc(p.name)}${p.fullName ? `<div class="muted small">${esc(p.fullName)}</div>` : ''}</span>
        <button class="btn small ghost" data-action="edit-player" data-id="${p.id}">${t('edit')}</button>
        <button class="btn small ghost danger" data-action="delete-player" data-id="${p.id}" aria-label="✕">✕</button>
      </li>`).join('')}</ul>` : `<p class="empty">${t('noPlayers')}</p>`}
    <div class="row gap foot">
      <button class="btn ghost danger" data-action="delete-team">${t('deleteTeam')}</button>
    </div>`;
}

// ---------- Views: new / edit game ----------

function defaultTeamId() {
  return getTeam(db.lastTeamId)?.id ?? db.teams[0]?.id ?? null;
}

function newDraft(id) {
  const g = id && getGame(id);
  if (g) {
    return {
      id: g.id, date: g.date, time: g.time, opponent: g.opponent, formatId: g.formatId,
      field: g.field, periods: g.periods, periodMin: g.periodMin, maxExtra: g.maxExtra ?? 10, gkId: g.gkId,
      teamId: getTeam(g.teamId) ? g.teamId : defaultTeamId(), home: g.home ?? true, round: g.round ?? '',
      sel: Object.fromEntries(g.squad.map((p) => [p, g.starters.includes(p) ? 'start' : 'bench'])),
    };
  }
  const f = FORMATS[0];
  const now = new Date();
  return {
    date: isoDate(now), time: `${pad(now.getHours())}:00`, opponent: '', formatId: f.id,
    field: f.field, periods: f.periods, periodMin: f.periodMin, maxExtra: 10, gkId: null, sel: {},
    teamId: defaultTeamId(), home: true, round: '',
  };
}

function squadCount() {
  const need = (parseInt(draft.field, 10) || 0) + 1;
  const vals = Object.values(draft.sel);
  const starters = vals.filter((v) => v === 'start').length;
  const bench = vals.filter((v) => v === 'bench').length;
  return `<span class="${starters === need ? 'ok' : 'warn'}">${t('startersCount', { s: starters, n: need })}</span> · ${t('benchCount', { n: bench })}`;
}

function viewEdit(id) {
  if (!draft) draft = newDraft(id);
  const back = draft.id ? `#/game/${draft.id}` : '#/games';
  const title = draft.id ? t('editGame') : t('newGameTitle');
  if (!draft.teamId) {
    main.innerHTML = `${bar(title, back)}<p class="empty">${t('needTeam')}</p><a class="btn primary block" href="#/teams">${t('goTeams')}</a>`;
    return;
  }
  const ps = teamPlayers(draft.teamId).sort(byNumber);
  main.innerHTML = `
    ${bar(title, back)}
    <div class="form">
      <label>${t('team')}
        <select data-field="teamId">${db.teams.map((tm) => `<option value="${tm.id}" ${tm.id === draft.teamId ? 'selected' : ''}>${esc(teamLabel(tm))}</option>`).join('')}</select>
      </label>
      <label>${t('opponent')}<input data-field="opponent" value="${esc(draft.opponent)}" placeholder="${t('opponentPh')}" autocomplete="off"></label>
      <div class="row gap">
        <span class="seg big">
          <button class="${draft.home ? 'on' : ''}" data-action="set-home" data-v="1">${t('home')}</button>
          <button class="${draft.home ? '' : 'on'}" data-action="set-home" data-v="0">${t('away')}</button>
        </span>
        <label class="grow">${t('round')}<input type="number" inputmode="numeric" min="1" data-field="round" value="${esc(draft.round)}"></label>
      </div>
      <div class="row gap">
        <label class="grow">${t('date')}<input type="date" data-field="date" value="${esc(draft.date)}"></label>
        <label class="grow">${t('time')}<input type="time" data-field="time" value="${esc(draft.time)}"></label>
      </div>
      <label>${t('format')}
        <select data-field="formatId">${FORMATS.map((f) => `<option value="${f.id}" ${f.id === draft.formatId ? 'selected' : ''}>${f.id === 'Custom' ? t('custom') : `${f.id} · ${t('gkPlus', { n: f.field })}`}</option>`).join('')}</select>
      </label>
      <div class="row gap">
        <label class="grow">${t('fieldPlayers')}<input type="number" inputmode="numeric" min="1" max="10" data-field="field" value="${esc(draft.field)}"></label>
        <label class="grow">${t('periods')}<input type="number" inputmode="numeric" min="1" max="4" data-field="periods" value="${esc(draft.periods)}"></label>
        <label class="grow">${t('minPeriod')}<input type="number" inputmode="numeric" min="1" data-field="periodMin" value="${esc(draft.periodMin)}"></label>
      </div>
      <label>${t('autoStop')}
        <input type="number" inputmode="numeric" min="1" max="60" data-field="maxExtra" value="${esc(draft.maxExtra)}">
      </label>
    </div>

    <h2>${t('squad')} <span class="muted small" id="squad-count">${squadCount()}</span></h2>
    <p class="hint">${t('squadHint')}</p>
    <ul class="list">${ps.map((p) => {
      const v = draft.sel[p.id] || '';
      return `<li class="item ${v}">
        <span class="shirt">${esc(p.number) || '–'}</span>
        <span class="grow">${esc(p.name)}</span>
        <span class="seg">
          <button class="${v === '' ? 'on' : ''}" data-action="sel" data-id="${p.id}" data-v="">${t('selOut')}</button>
          <button class="${v === 'bench' ? 'on' : ''}" data-action="sel" data-id="${p.id}" data-v="bench">${t('selBench')}</button>
          <button class="${v === 'start' ? 'on' : ''}" data-action="sel" data-id="${p.id}" data-v="start">${t('selStart')}</button>
        </span>
        <button class="gkbtn ${draft.gkId === p.id ? 'on' : ''}" data-action="set-gk" data-id="${p.id}" ${v === 'start' ? '' : 'disabled'} aria-label="${t('gkAria')}">🧤</button>
      </li>`;
    }).join('')}</ul>
    <form class="row gap" data-form="add-player-draft">
      <input class="num" name="number" inputmode="numeric" placeholder="#" maxlength="3">
      <input class="grow" name="name" placeholder="${t('addNewPlayer')}" required autocomplete="off">
      <button class="btn">${t('add')}</button>
    </form>

    <button class="btn primary block" data-action="save-game">${draft.id ? t('saveChanges') : t('createGame')}</button>`;
}

function saveGame() {
  const field = parseInt(draft.field, 10);
  const periods = parseInt(draft.periods, 10);
  const periodMin = parseInt(draft.periodMin, 10);
  const maxExtra = parseInt(draft.maxExtra, 10) || 10;
  const round = parseInt(draft.round, 10);
  if (!(field >= 1)) return alert(t('errField'));
  if (!(periods >= 1) || !(periodMin >= 1)) return alert(t('errPeriods'));
  if (!draft.date) return alert(t('errDate'));

  const team = getTeam(draft.teamId);
  const order = teamPlayers(team.id).sort(byNumber).map((p) => p.id);
  const squad = order.filter((id) => draft.sel[id]);
  const starters = squad.filter((id) => draft.sel[id] === 'start');
  const need = field + 1;
  if (starters.length !== need) return alert(t('errStarters', { need, field, n: starters.length }));
  if (!starters.includes(draft.gkId)) return alert(t('errGk'));

  let g = draft.id && getGame(draft.id);
  if (!g) {
    g = { id: uid(), status: 'scheduled', clock: { running: false, startedAt: null, elapsedMs: 0, period: 1 }, events: [], marks: [], alerted: {} };
    db.games.push(g);
  }
  const names = {};
  for (const id of squad) {
    const p = db.players.find((x) => x.id === id);
    names[id] = { name: p.name, number: p.number, fullName: p.fullName || '' };
  }
  Object.assign(g, {
    date: draft.date, time: draft.time, opponent: draft.opponent.trim(), formatId: draft.formatId,
    field, periods, periodMin, maxExtra, squad, starters, gkId: draft.gkId, names,
    teamId: team.id, club: team.club, team: team.name, home: draft.home, round: round >= 1 ? String(round) : '',
  });
  g.formation = formationOf(g);
  g.lineup = startLineup(g);
  db.lastTeamId = team.id;
  save();
  location.hash = `#/game/${g.id}`;
}

// ---------- Views: live game ----------

function clockButtons(g) {
  const c = g.clock;
  const b = (action, label, cls = '') => `<button class="btn small ${cls}" data-action="${action}">${label}</button>`;
  switch (g.status) {
    case 'scheduled': return b('kickoff', t('kickoff'), 'primary');
    case 'live':
      return b('end-period', c.period >= g.periods ? t('fullTimeBtn') : t('endPeriod', { p: periodName(g, c.period) }), 'warn');
    case 'break': return b('next-period', t('startPeriod', { p: periodName(g, c.period + 1) }), 'primary');
    default: return `<a class="btn primary" href="#/report/${g.id}">${t('viewReport')}</a>`;
  }
}

const gkTag = () => ` <span class="tag">${t('gk')}</span>`;

const PITCH_LINES = `<svg class="pitch-lines" viewBox="0 0 100 130" aria-hidden="true">
  <rect x="3" y="3" width="94" height="124" rx="1"/>
  <line x1="3" y1="65" x2="97" y2="65"/><circle cx="50" cy="65" r="11"/><circle class="dot" cx="50" cy="65" r=".8"/>
  <rect x="24" y="3" width="52" height="19"/><rect x="37" y="3" width="26" height="7"/>
  <rect x="24" y="108" width="52" height="19"/><rect x="37" y="120" width="26" height="7"/>
  <path d="M40 22a11 11 0 0 0 20 0M40 108a11 11 0 0 1 20 0"/>
</svg>`;

// Round player token (shirt circle, name, minutes). They are chips too, so tap and drag work the same.
// where: 'on' (pitch), 'bench' or 'off' (sent off).
function token(g, d, id, where, attrs = '') {
  const s = d.stats[id];
  const badges = [s.goals ? `⚽${s.goals > 1 ? s.goals : ''}` : '', '🟨'.repeat(s.yellow), '🟥'.repeat(s.red)].join('');
  return `<button class="chip round ${where} ${where === 'on' ? 'tok' : ''} ${id === d.gk ? 'gk' : ''}" data-action="player" data-id="${id}" ${attrs} ${where === 'off' ? 'disabled' : ''}>
    <span class="shirt">${esc(g.names[id].number) || '–'}</span>
    <span class="pname">${esc(g.names[id].name)}</span>
    <span class="meta"><span data-pt="${id}">${fmtMins(s.played)}</span>${badges ? ` ${badges}` : ''}</span>
  </button>`;
}

// On-pitch players in formation, with the formation picker and player count in the top corners.
function pitch(g, d) {
  const pts = slotCoords(formationOf(g));
  return `<div class="pitch">${PITCH_LINES}
    ${formationsFor(g.field).length > 1 ? `<button class="pitch-corner left" data-action="formation" aria-label="${t('formation')}">${formationOf(g)} ▾</button>` : ''}
    <span class="pitch-corner right" aria-label="${t('onPitch')}">${d.on.size}/${g.field + 1}</span>
    ${d.slots.map((id, i) => {
    const pos = `data-slot="${i}" style="left:${pts[i].x.toFixed(1)}%;top:${pts[i].y.toFixed(1)}%"`;
    return id ? token(g, d, id, 'on', pos) : `<div class="chip round slot-empty" ${pos}><span class="shirt"></span></div>`;
  }).join('')}</div>`;
}

// LIVE / PAUSED / BREAK / … pill on top of the scoreboard.
function statusPill(g) {
  const paused = g.status === 'live' && !g.clock.running;
  return `<span class="pill ${paused ? 'paused' : g.status}">${paused ? t('paused') : t(`st_${g.status}`)}</span>`;
}

function viewGame(id) {
  const g = getGame(id);
  if (!g) return notFound();
  const d = derive(g);
  const benchIds = g.squad
    .filter((p) => !d.on.has(p) && !d.sentOff.has(p))
    .sort((a, b) => d.stats[a].played - d.stats[b].played || byNumber(g.names[a], g.names[b]));
  const offIds = sortIds(g, [...d.sentOff].filter((p) => !d.on.has(p)));

  const timeline = [...g.events.filter((e) => e.type !== 'pos'), ...g.marks].sort((a, b) => a.t - b.t || (a.wall || 0) - (b.wall || 0)).reverse();
  const last = g.events[g.events.length - 1];
  const canEdit = g.status === 'scheduled' && g.events.length === 0;
  const overtime = g.status === 'live' && matchTime(g) - periodStart(g) >= g.periodMin * 60000;
  const us = g.team || g.club || t('unnamedTeam');
  const them = g.opponent || t('opponent');
  const [home, away] = g.home === false ? [them, us] : [us, them];

  main.innerHTML = `
    ${bar(esc(matchTitle(g)), '#/games', `
      ${canEdit
        ? `<a class="menu-item" role="menuitem" href="#/edit/${g.id}">✎ ${t('edit')}</a>`
        : `<button class="menu-item" role="menuitem" data-action="edit-info">${t('gameInfo')}</button>`}
      ${g.status !== 'scheduled' ? `<a class="menu-item" role="menuitem" href="#/report/${g.id}">📋 ${t('report')}</a>` : ''}
      ${g.status !== 'scheduled' ? `<button class="menu-item" role="menuitem" data-action="fix-open">${t('fixTimesBtn')}</button>` : ''}
      <button class="menu-item danger" role="menuitem" data-action="delete-game">🗑 ${t('deleteGame')}</button>`)}
    <section class="scoreboard ${overtime ? 'overtime' : ''}">
      ${statusPill(g)}
      <div class="clock-line">
        <span class="clock" id="clock">${fmtNow(g)}</span>
        ${g.status === 'live' && !g.clock.running ? `<button class="icon-btn on" data-action="resume" aria-label="${t('resume')}">▶</button>` : ''}
      </div>
      <div class="muted small" id="period">${periodLabel(g)}</div>
      <div class="score-row">
        <span class="side">${esc(home)}</span>
        <span class="score big">${g.home === false ? `${d.them} – ${d.us}` : `${d.us} – ${d.them}`}</span>
        <span class="side">${esc(away)}</span>
      </div>
      ${g.status === 'break' && g.autoStopped === g.clock.period ? `<div class="alert">${t('autoStoppedAlert', { p: periodName(g, g.clock.period), m: g.maxExtra ?? 10, fix: t('fixTimes') })}
        <div class="row center"><button class="btn small" data-action="fix-open">${t('fixTimesBtn')}</button></div></div>` : ''}
      <div class="row gap center wrap score-actions">
        ${g.status === 'live' ? `<button class="btn small ghost" data-action="opp-goal">${t('oppGoalBtn')}</button>` : ''}
        ${clockButtons(g)}
      </div>
      ${pitch(g, d)}
    </section>

    <h2>${t('bench')}</h2>
    ${benchIds.length ? `<div class="round-row">${benchIds.map((p) => token(g, d, p, 'bench')).join('')}</div>` : `<p class="empty small">${t('noSubs')}</p>`}

    ${offIds.length ? `<h2>${t('sentOff')}</h2><div class="round-row">${offIds.map((p) => token(g, d, p, 'off')).join('')}</div>` : ''}

    <h2>${t('timeline')}</h2>
    ${last ? `<button class="btn small ghost" data-action="undo">${t('undoX', { x: describe(g, last) })}</button>` : ''}
    ${timeline.length ? `<ul class="timeline">${timeline.map((e) => e.type === 'goal'
      ? `<li class="tap" data-action="edit-goal" data-id="${e.id}"><span class="t">${timeOf(g, e)}</span><span>${describe(g, e)}</span><span class="edit">✎</span></li>`
      : `<li><span class="t">${timeOf(g, e)}</span><span>${describe(g, e)}</span></li>`).join('')}</ul>` : `<p class="empty small">${t('nothingYet')}</p>`}
`;
}

function tick() {
  for (const g of db.games) if (g.status === 'live' && g.clock.running) checkTime(g);
  const { view, id } = route();
  if (view !== 'game') return;
  const g = getGame(id);
  if (!g || g.status !== 'live' || !g.clock.running) return;
  const d = derive(g);
  $('#clock').textContent = fmtNow(g);
  $('#period').textContent = periodLabel(g);
  for (const p of g.squad) {
    const el = main.querySelector(`[data-pt="${p}"]`);
    if (el) el.textContent = fmtMins(d.stats[p].played);
  }
  $('.scoreboard')?.classList.toggle('overtime', matchTime(g) - periodStart(g) >= g.periodMin * 60000);
}

setInterval(tick, 1000);

// ---------- Sheets (player actions) ----------

function openSheet(html) {
  $('#sheet-body').innerHTML = html;
  $('#sheet').hidden = false;
}

function closeSheet() {
  $('#sheet').hidden = true;
}

function currentGame() {
  const { view, id } = route();
  return (view === 'game' || view === 'report') ? getGame(id) : null;
}

// One tap on a player: quick actions on top, substitution list right below,
// so every action is at most two taps away.
function openPlayerSheet(g, id) {
  const d = derive(g);
  const on = d.on.has(id);
  const quick = (action, icon, label, show = true) => show
    ? `<button class="quick" data-action="${action}" data-id="${id}"><span class="qi">${icon}</span>${label}</button>`
    : '';

  // Fewest minutes first when choosing who comes on, most minutes first for who comes off.
  const candidates = on
    ? g.squad.filter((p) => !d.on.has(p) && !d.sentOff.has(p)).sort((a, b) => d.stats[a].played - d.stats[b].played)
    : [...d.on].sort((a, b) => d.stats[b].played - d.stats[a].played);
  const list = candidates.map((p) => {
    const [out, inn] = on ? [id, p] : [p, id];
    return `<button class="opt" data-action="do-sub" data-out="${out}" data-in="${inn}">
      <span><span class="shirt sm">${esc(g.names[p].number) || '–'}</span> ${esc(g.names[p].name)}${p === d.gk ? gkTag() : ''}</span>
      <span class="muted">${fmtMins(d.stats[p].played)}</span>
    </button>`;
  }).join('');

  openSheet(`
    <div class="sheet-head">
      <h3>${esc(pname(g, id))}${id === d.gk ? gkTag() : ''}</h3>
      <span class="muted small">${on ? t('onPitch') : t('benchState')} · ${t('played', { t: fmtMins(d.stats[id].played) })}</span>
    </div>
    <div class="quick-row">
      ${quick('goal', '⚽', t('goalBtn'), on && g.status === 'live')}
      ${quick('yellow', '🟨', t('yellowBtn'))}
      ${quick('red', '🟥', t('redBtn'))}
      ${quick('make-gk', '🧤', t('toGoal'), on && d.gk !== id)}
    </div>
    <p class="muted small sub-title">${on ? t('subOff') : t('subOn')}</p>
    ${list || `<p class="empty small">${t('noAvail')}</p>`}
    <button class="btn ghost block" data-action="close-sheet">${t('cancel')}</button>`);
}

// ---------- Fix times (forgot to end / start a half) ----------
// fix.end is minutes into the current period; the sheet shows game-clock minutes.

let fix = null;

const periodOffsetMin = (g) => (g.clock.period - 1) * g.periodMin;

// The latest moment the current period could have ended, in minutes of that period.
function fixLimits(g) {
  const start = periodStart(g);
  if (g.status === 'live') return { maxMin: (matchTime(g) - start) / 60000 };
  const end = [...g.marks].reverse().find((m) => m.type === 'end');
  return { maxMin: (end.t - start + (Date.now() - end.wall)) / 60000 };
}

function fixPreview(g) {
  const p = g.clock.period;
  let text = t('previewEnds', { p: periodName(g, p), t: fmtInPeriod(g, p, fix.end * 60000) });
  if (p < g.periods) text += fix.started == null ? t('previewBreak') : t('previewStarted', { p: periodName(g, p + 1), n: fix.started });
  return text;
}

function openFixSheet(g) {
  const p = g.clock.period;
  const off = periodOffsetMin(g);
  const { maxMin } = fixLimits(g);
  if (!fix) fix = { end: Math.min(g.periodMin, maxMin), started: null };
  const pick = (action, v, label, on) => `<button class="pick ${on ? 'on' : ''}" data-action="${action}" data-v="${v}">${label}</button>`;
  const ends = [0, 1, 2, 3, 5].map((x) => g.periodMin + x).filter((v) => v <= maxMin);
  const canResume = p < g.periods && g.status !== 'finished';
  const room = maxMin - fix.end;
  openSheet(`
    <h3>${t('fixTitle', { p: periodName(g, p) })}</h3>
    <p class="muted small">${t('whenEnd', { p: periodName(g, p) })}</p>
    <div class="pick-row">
      ${ends.map((v) => pick('fix-end', v, v === g.periodMin ? t('regular', { v: off + v }) : `+${v - g.periodMin}'`, fix.end === v)).join('')}
      ${g.status === 'live' ? pick('fix-end', maxMin, t('now'), fix.end === maxMin) : ''}
    </div>
    <label class="inline">${t('other')} <input type="number" inputmode="decimal" min="${off}" step="0.5" data-fix="end" placeholder="${off + g.periodMin}"> min</label>
    ${canResume ? `
      <p class="muted small">${t('nextStarted', { p: periodName(g, p + 1) })}</p>
      <div class="pick-row">
        ${pick('fix-started', '', t('notYet'), fix.started == null)}
        ${[1, 2, 3, 5, 10, 15].filter((v) => v <= room).map((v) => pick('fix-started', v, t('minAgo', { n: v }), fix.started === v)).join('')}
      </div>
      <label class="inline">${t('startedPre')} <input type="number" inputmode="decimal" min="0" step="0.5" data-fix="started"> ${t('startedPost')}</label>` : ''}
    <p class="alert small" id="fix-preview">${fixPreview(g)}</p>
    <button class="btn primary block" data-action="fix-apply">${t('apply')}</button>
    <button class="btn ghost block" data-action="close-sheet">${t('cancel')}</button>`);
}

// ---------- Report ----------

// Stints as game-clock labels: entered (start of the later period on a boundary) – left.
const stintLabels = (g, s, sep) => s.intervals.map(([a, b]) => `${fmtAt(g, a, true)}${sep}${fmtAt(g, b)}`);

const mmss = (ms) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${pad(s % 60)}`;
};

const SHEET_NAVY = '#1f3a5a';

// The stats sheet table, shared by the PDF and its preview on the report screen.
// Column widths are in PDF points; cells are arrays of lines.
// Full name for the report: the player's current one (so fixing a name also fixes
// past games), else the one saved with the game, else the shirt name.
function fullName(g, id) {
  return db.players.find((p) => p.id === id)?.fullName || g.names[id].fullName || g.names[id].name;
}

function statsSheet(g) {
  const d = derive(g);
  const cols = [
    { title: t('pdfNo'), w: 32, fill: SHEET_NAVY },
    { title: t('pdfPlayer'), w: 170, fill: SHEET_NAVY, left: true },
    { title: t('pdfShirt'), w: 42, fill: SHEET_NAVY },
    { title: t('pdfStarter'), w: 62, fill: SHEET_NAVY },
    { title: t('pdfSub'), w: 62, fill: SHEET_NAVY },
    { title: t('pdfStints'), w: 154, fill: '#3d8b40' },
    { title: t('pdfMinutes'), w: 60, fill: SHEET_NAVY },
    { title: t('pdfGoals'), w: 52, fill: SHEET_NAVY },
    { title: t('pdfYellow'), w: 62, fill: '#e3b008' },
    { title: t('pdfRed'), w: 66, fill: '#c0392b' },
  ];

  // Players who played, then unused subs, then team players not called up;
  // alphabetical within each group, like the club's sheet.
  const squad = g.squad.map((id) => ({ p: g.names[id], full: fullName(g, id), s: d.stats[id], starter: g.starters.includes(id) }));
  const notCalled = (g.teamId ? teamPlayers(g.teamId) : [])
    .filter((p) => !g.squad.includes(p.id))
    .map((p) => ({ p, full: p.fullName || p.name, s: null }));
  const group = (r) => (!r.s ? 2 : r.s.intervals.length ? 0 : 1);
  const players = [...squad, ...notCalled].sort((a, b) => group(a) - group(b) || a.full.localeCompare(b.full, locale()));
  const dash = '—';
  const rows = players.map((r, i) => {
    const played = group(r) === 0;
    return [
      [String(i + 1)],
      [r.full],
      [r.p.number || ''],
      [r.s && r.starter ? 'X' : ''],
      [r.s && !r.starter ? 'X' : ''],
      played ? stintLabels(g, r.s, ' – ') : [r.s ? t('didNotPlay') : t('notCalled')],
      [played ? mmss(r.s.played) : dash],
      [played ? String(r.s.goals) : dash],
      [played ? String(r.s.yellow) : dash],
      [played ? String(r.s.red) : dash],
    ];
  });
  const sum = (k) => String(squad.reduce((n, r) => n + r.s[k], 0));
  const [yy, mo, dd] = String(g.date).split('-');

  return {
    title: [g.club, `${t('pdfTitle')} · ${g.team || ''}`.replace(/ · $/, ''), seasonOf(g.date) && `${t('pdfSeason')} ${seasonOf(g.date)}`]
      .filter(Boolean).join(' — '),
    // [label, value, column it lines up with]
    meta: [
      [t('pdfGame'), matchTitle(g), 0],
      dd && [t('pdfDate'), `${dd}/${mo}/${yy}`, 6],
      g.round && [t('pdfRound'), g.round, 8],
    ].filter(Boolean),
    cols,
    rows,
    total: [[''], [t('pdfTotal')], [''], [''], [''], [''], [''], [sum('goals')], [sum('yellow')], [sum('red')]],
  };
}

// The PDF page as HTML, scaled up a little for the phone screen.
function sheetPreview(sh) {
  const S = 1.3;
  const x = (i) => Math.round(sh.cols.slice(0, i).reduce((n, c) => n + c.w, 0) * S);
  const cell = (lines, c) => `<td class="${c.left ? 'l' : ''}">${lines.map(esc).join('<br>')}</td>`;
  return `<div class="pdf-preview"><div class="pp-page" style="width:${x(sh.cols.length) + 40}px">
    <div class="pp-title">${esc(sh.title)}</div>
    <div class="pp-meta">${sh.meta.map(([k, v, col]) => `<span style="left:${x(col)}px"><b>${esc(k)}</b> ${esc(v)}</span>`).join('')}</div>
    <table class="pp-table" style="width:${x(sh.cols.length)}px">
      <colgroup>${sh.cols.map((c) => `<col style="width:${Math.round(c.w * S)}px">`).join('')}</colgroup>
      <thead><tr>${sh.cols.map((c) => `<th style="background:${c.fill}">${esc(c.title)}</th>`).join('')}</tr></thead>
      <tbody>${sh.rows.map((r) => `<tr>${r.map((lines, i) => cell(lines, sh.cols[i])).join('')}</tr>`).join('')}</tbody>
      <tfoot><tr>${sh.total.map((lines, i) => cell(lines, sh.cols[i])).join('')}</tr></tfoot>
    </table>
  </div></div>`;
}

function viewReport(id) {
  const g = getGame(id);
  if (!g) return notFound();
  const d = derive(g);

  main.innerHTML = `
    ${bar(t('gameReport'), `#/game/${g.id}`)}
    <section class="scoreboard">
      <strong>${esc(matchTitle(g))}</strong>
      <div class="muted small">${formatLine(g)}</div>
      <div class="score big">${d.us} – ${d.them}</div>
      <div class="muted">${t('gameTime', { t: fmtNow(g) })}${g.status === 'finished' ? '' : ` · <span class="warn">${t('inProgress')}</span>`}</div>
    </section>

    <button class="btn primary block" data-action="pdf">${t('pdf')}</button>
    <button class="btn ghost block" data-action="edit-info">${t('gameInfo')}</button>
    <p class="hint">${t('reportHint')}</p>
    ${sheetPreview(statsSheet(g))}`;
}

// ---------- PDF report ----------
// A tiny PDF writer: the PDF's built-in Helvetica fonts (WinAnsi encoding, so
// Portuguese accents work), filled/stroked rectangles, lines and text.

// Glyph widths (per 1000 em) for character codes 32..126.
const HELV_W = {
  regular: [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
    556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
    1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
    667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
    333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
    556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584],
  bold: [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278,
    556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611,
    975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778,
    667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556,
    333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611,
    611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584],
};
// Unicode -> WinAnsi for the few characters outside Latin-1 that we use.
const WIN_ANSI = { 0x2014: 0x97, 0x2013: 0x96, 0x2026: 0x85, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95 };
const WIN_W = { 0x97: 1000, 0x96: 556, 0x85: 1000, 0x91: 222, 0x92: 222, 0x93: 333, 0x94: 333, 0x95: 350, 0xaa: 370, 0xba: 365, 0xb7: 278, 0xa0: 278, 0xb0: 400 };

// Text as a string of WinAnsi byte values; anything else becomes "?".
function winAnsi(s) {
  let out = '';
  for (const ch of String(s)) {
    const c = ch.codePointAt(0);
    out += String.fromCharCode((c >= 32 && c < 127) || (c >= 160 && c <= 255) ? c : WIN_ANSI[c] ?? 63);
  }
  return out;
}

function glyphW(code, bold) {
  const table = bold ? HELV_W.bold : HELV_W.regular;
  if (code >= 32 && code < 127) return table[code - 32];
  if (WIN_W[code]) return WIN_W[code];
  if (code >= 192) {
    const base = String.fromCharCode(code).normalize('NFD').charCodeAt(0);
    if (base === 105) return 278; // accented i is wider than a plain i
    if (base < 127) return table[base - 32];
  }
  return 556;
}

function textWidth(s, size, bold) {
  let w = 0;
  for (const c of winAnsi(s)) w += glyphW(c.charCodeAt(0), bold);
  return (w * size) / 1000;
}

function pdfDoc() {
  const W = 842;
  const H = 595; // A4 landscape, in points
  const pages = [];
  let ops = null;
  const rgb = (hex) => [1, 3, 5].map((i) => (parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(3)).join(' ');
  const n = (v) => +v.toFixed(2);

  return {
    W, H,
    page() {
      ops = [];
      pages.push(ops);
    },
    rect(x, y, w, h, fill, stroke, lw = 0.5) {
      if (fill) ops.push(`${rgb(fill)} rg ${n(x)} ${n(y)} ${n(w)} ${n(h)} re f`);
      if (stroke) ops.push(`${rgb(stroke)} RG ${lw} w ${n(x)} ${n(y)} ${n(w)} ${n(h)} re S`);
    },
    line(x1, y1, x2, y2, color, lw) {
      ops.push(`${rgb(color)} RG ${lw} w ${n(x1)} ${n(y1)} m ${n(x2)} ${n(y2)} l S`);
    },
    // Draws text at baseline y; returns its width. Too-long text gets an ellipsis.
    text(s, x, y, { size = 10, bold = false, color = '#000000', align = 'left', maxW = Infinity } = {}) {
      let str = String(s);
      if (textWidth(str, size, bold) > maxW) {
        while (str && textWidth(`${str}…`, size, bold) > maxW) str = str.slice(0, -1);
        str = `${str.trimEnd()}…`;
      }
      const w = textWidth(str, size, bold);
      const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
      const body = winAnsi(str).replace(/[\\()]/g, '\\$&');
      ops.push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${rgb(color)} rg ${n(x0)} ${n(y)} Td (${body}) Tj ET`);
      return w;
    },
    // The finished file as bytes.
    bytes() {
      const objs = [
        '<< /Type /Catalog /Pages 2 0 R >>',
        `<< /Type /Pages /Kids [${pages.map((_, i) => `${5 + 2 * i} 0 R`).join(' ')}] /Count ${pages.length} >>`,
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
      ];
      pages.forEach((p, i) => {
        const stream = p.join('\n');
        objs.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${6 + 2 * i} 0 R >>`);
        objs.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
      });
      let out = '%PDF-1.4\n%\xe2\xe3\xcf\xd3\n';
      const offsets = objs.map((body, i) => {
        const at = out.length;
        out += `${i + 1} 0 obj\n${body}\nendobj\n`;
        return at;
      });
      const xref = out.length;
      out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
      out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
      return Uint8Array.from(out, (c) => c.charCodeAt(0));
    },
  };
}

// Football seasons run August to July.
function seasonOf(date) {
  const [y, m] = String(date).split('-').map(Number);
  if (!y) return '';
  return m >= 8 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
}

function buildPdf(g) {
  const sh = statsSheet(g);
  const pdf = pdfDoc();
  const M = 40;
  const GRID = '#a9bcb6';
  const FS = 9.5;
  const LH = 12;
  const { cols } = sh;
  const tableW = cols.reduce((n, c) => n + c.w, 0);
  const colX = cols.map((_, i) => M + cols.slice(0, i).reduce((n, c) => n + c.w, 0));

  let y;
  const tableHeader = () => {
    cols.forEach((c, i) => {
      pdf.rect(colX[i], y - 20, c.w, 20, c.fill, GRID);
      pdf.text(c.title, colX[i] + c.w / 2, y - 13.5, { size: 9, bold: true, color: '#ffffff', align: 'center', maxW: c.w - 4 });
    });
    y -= 20;
  };
  const newPage = () => {
    pdf.page();
    y = pdf.H - M;
  };
  // One table row: cells is an array of line arrays, one per column.
  const row = (cells, { fill, bold = false } = {}) => {
    const h = Math.max(26, Math.max(...cells.map((c) => c.length)) * LH + 14);
    if (y - h < M) {
      newPage();
      tableHeader();
    }
    cells.forEach((lines, i) => {
      const c = cols[i];
      pdf.rect(colX[i], y - h, c.w, h, fill, GRID);
      const top = y - (h - lines.length * LH) / 2;
      lines.forEach((s, k) => {
        const base = top - k * LH - 9;
        if (c.left) pdf.text(s, colX[i] + 7, base, { size: FS, bold, maxW: c.w - 12 });
        else pdf.text(s, colX[i] + c.w / 2, base, { size: FS, bold, align: 'center', maxW: c.w - 6 });
      });
    });
    y -= h;
  };

  newPage();
  pdf.text(sh.title, M, y - 14, { size: 15, bold: true, color: SHEET_NAVY, maxW: tableW });
  y -= 36;
  for (const [k, v, col] of sh.meta) {
    const w = pdf.text(k, colX[col], y, { size: 10, bold: true, color: '#333333' });
    pdf.text(v, colX[col] + w + 4, y, { size: 10, color: '#333333', maxW: 360 });
  }
  y -= 14;
  tableHeader();
  sh.rows.forEach((cells, i) => row(cells, { fill: i % 2 ? '#dce8e4' : null }));
  const lineY = y;
  row(sh.total, { fill: '#eef2f4', bold: true });
  pdf.line(M, lineY, M + tableW, lineY, SHEET_NAVY, 1.2);
  return pdf.bytes();
}

function pdfFileName(g) {
  const clean = (s) => String(s || '').normalize('NFD').replace(/[^A-Za-z0-9]/g, '');
  const parts = [clean(g.club), clean(g.team), g.round ? `${t('fileRound')}${g.round}` : g.date, t('fileStats')];
  return `${parts.filter(Boolean).join('_')}.pdf`;
}

async function exportPdf(g) {
  const name = pdfFileName(g);
  const file = new File([buildPdf(g)], name, { type: 'application/pdf' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
    }
  }
  download(name, file, 'application/pdf');
}

// ---------- Actions ----------

const actions = {
  'close-sheet': () => closeSheet(),
  soon: ({ v }) => askConfirm({ title: t('soonTitle'), message: t('soonMsg', { x: t(v) }), ok: t('ok'), cancel: false }),

  lang: ({ v }) => {
    lang = v;
    localStorage.setItem(LANG_KEY, v);
    document.documentElement.lang = v;
    render();
  },

  // teams and players
  'new-team': () => {
    const tm = { id: uid(), club: db.teams[0]?.club || '', name: '' };
    db.teams.push(tm);
    save();
    location.hash = `#/team/${tm.id}`;
  },
  'delete-team': () => {
    const id = route().id;
    if (teamPlayers(id).length) return alert(t('teamHasPlayers'));
    if (!confirm(t('confirmDeleteTeam'))) return;
    db.teams = db.teams.filter((x) => x.id !== id);
    save();
    location.hash = '#/teams';
  },
  'edit-player': ({ id }) => {
    const p = db.players.find((x) => x.id === id);
    openSheet(`
      <h3>${t('editPlayer')}</h3>
      <form class="form" data-form="edit-player" data-id="${p.id}">
        <label>${t('shirtNumber')}<input name="number" inputmode="numeric" maxlength="3" value="${esc(p.number)}"></label>
        <label>${t('shirtName')}<input name="name" required autocomplete="off" value="${esc(p.name)}"></label>
        <label>${t('fullName')}<input name="fullName" autocomplete="off" value="${esc(p.fullName)}"></label>
        <button class="btn primary block">${t('save')}</button>
        <button type="button" class="btn ghost block" data-action="close-sheet">${t('cancel')}</button>
      </form>`);
  },
  'delete-player': ({ id }) => {
    const p = db.players.find((x) => x.id === id);
    if (!confirm(t('confirmRemovePlayer', { name: p.name }))) return;
    db.players = db.players.filter((x) => x.id !== id);
    save();
    render();
  },

  // new / edit game
  sel: ({ id, v }) => {
    if (v) draft.sel[id] = v;
    else delete draft.sel[id];
    if (v !== 'start' && draft.gkId === id) draft.gkId = null;
    render();
  },
  'set-gk': ({ id }) => {
    draft.gkId = id;
    render();
  },
  'set-home': ({ v }) => {
    draft.home = v === '1';
    render();
  },
  'save-game': () => saveGame(),

  // clock
  kickoff: () => {
    const g = currentGame();
    g.status = 'live';
    g.clock.period = 1;
    g.marks.push({ type: 'start', period: 1, t: matchTime(g), wall: Date.now() });
    startClock(g);
    save();
    render();
  },
  resume: () => { const g = currentGame(); startClock(g); save(); render(); },
  'end-period': () => {
    const g = currentGame();
    const last = g.clock.period >= g.periods;
    if (g.status !== 'live') return;
    if (last && !confirm(t('confirmFullTime'))) return;
    endPeriodAt(g, matchTime(g));
    $('#toast').hidden = true;
    buzz();
    save();
    if (last) location.hash = `#/report/${g.id}`;
    else render();
  },
  'next-period': () => {
    const g = currentGame();
    g.clock.period++;
    g.status = 'live';
    g.autoStopped = null;
    g.marks.push({ type: 'start', period: g.clock.period, t: matchTime(g), wall: Date.now() });
    startClock(g);
    save();
    render();
  },

  // player actions
  player: ({ id }) => openPlayerSheet(currentGame(), id),
  'do-sub': ({ out, in: inn }) => doSub(currentGame(), out, inn),
  goal: ({ id }) => {
    const g = currentGame();
    const eid = addEvent(g, { type: 'goal', playerId: id });
    render();
    toast(t('evGoal', { p: g.names[id].name }), undoBtn(eid));
  },
  yellow: ({ id }) => {
    const g = currentGame();
    const eid = addEvent(g, { type: 'yellow', playerId: id });
    render();
    toast(t('evYellow', { p: g.names[id].name }), undoBtn(eid));
  },
  red: ({ id }) => {
    const g = currentGame();
    const wasGk = derive(g).gk === id;
    const eid = addEvent(g, { type: 'red', playerId: id });
    render();
    toast(wasGk ? t('gkSentOff') : t('evRed', { p: g.names[id].name }), undoBtn(eid));
  },
  'make-gk': ({ id }) => {
    closeSheet();
    movePlayer(currentGame(), id, 0);
  },
  formation: () => {
    const g = currentGame();
    const cur = formationOf(g);
    openSheet(`
      <h3>${t('formation')}</h3>
      ${formationsFor(g.field).map((f) => `<button class="opt ${f === cur ? 'current' : ''}" data-action="set-formation" data-v="${f}">
        <span>${f}</span>${f === cur ? '<span>✓</span>' : ''}
      </button>`).join('')}
      <button class="btn ghost block" data-action="close-sheet">${t('cancel')}</button>`);
  },
  'set-formation': ({ v }) => {
    const g = currentGame();
    g.formation = v;
    db.formations = { ...db.formations, [g.field]: v };
    save();
    closeSheet();
    render();
  },
  'opp-goal': () => {
    const g = currentGame();
    const eid = addEvent(g, { type: 'oppgoal' });
    render();
    toast(t('evOppGoal'), undoBtn(eid));
  },
  'fix-open': () => {
    const g = currentGame();
    if (!g || g.status === 'scheduled') return;
    $('#toast').hidden = true;
    fix = null;
    openFixSheet(g);
  },
  'fix-end': ({ v }) => {
    fix.end = Number(v);
    openFixSheet(currentGame());
  },
  'fix-started': ({ v }) => {
    fix.started = v === '' ? null : Number(v);
    openFixSheet(currentGame());
  },
  'fix-apply': () => {
    const g = currentGame();
    const { maxMin } = fixLimits(g);
    const p = g.clock.period;
    if (!(fix.end >= 0) || fix.end > maxMin + 0.01) {
      return alert(t('errFixEnd', { a: fmtInPeriod(g, p, 0), b: fmtInPeriod(g, p, maxMin * 60000) }));
    }
    if (fix.started != null && !(fix.started >= 0 && fix.started <= maxMin - fix.end + 0.01)) {
      return alert(t('errFixStart', { p: periodName(g, p) }));
    }
    applyFix(g, Math.min(fix.end, maxMin), fix.started);
    fix = null;
    buzz();
    render();
    toast(t('timesFixed'));
  },
  // Fix a goal given to the wrong player: pick who was on the pitch at that moment, or remove it.
  'edit-goal': ({ id }) => {
    const g = currentGame();
    const e = g.events.find((x) => x.id === id);
    const d = derive(g);
    const onAt = g.squad.filter((p) => d.stats[p].intervals.some(([a, b]) => a <= e.t && e.t <= b));
    const ids = sortIds(g, onAt.length ? onAt : g.squad);
    openSheet(`
      <h3>${t('editGoal', { t: timeOf(g, e) })}</h3>
      <p class="muted small sub-title">${t('whoScored')}</p>
      ${ids.map((p) => `<button class="opt ${p === e.playerId ? 'current' : ''}" data-action="set-scorer" data-id="${e.id}" data-p="${p}">
        <span><span class="shirt sm">${esc(g.names[p].number) || '–'}</span> ${esc(g.names[p].name)}</span>${p === e.playerId ? '<span>⚽</span>' : ''}
      </button>`).join('')}
      <button class="btn ghost danger block" data-action="delete-goal" data-id="${e.id}">${t('removeGoal')}</button>
      <button class="btn ghost block" data-action="close-sheet">${t('cancel')}</button>`);
  },
  'set-scorer': ({ id, p }) => {
    const g = currentGame();
    g.events.find((x) => x.id === id).playerId = p;
    save();
    buzz();
    render();
    toast(t('evGoal', { p: g.names[p].name }));
  },
  'delete-goal': ({ id }) => {
    const g = currentGame();
    if (!confirm(t('confirmRemoveGoal'))) return;
    g.events = g.events.filter((x) => x.id !== id);
    save();
    render();
  },
  'undo-toast': ({ id }) => {
    const g = currentGame();
    $('#toast').hidden = true;
    if (!g || g.events[g.events.length - 1]?.id !== id) return;
    g.events.pop();
    save();
    render();
  },
  undo: () => {
    const g = currentGame();
    if (!g.events.length) return;
    g.events.pop();
    buzz();
    save();
    render();
  },
  // Match details (not the lineup) can be changed at any time, e.g. after full time.
  'edit-info': () => {
    const g = currentGame();
    const teamId = getTeam(g.teamId) ? g.teamId : defaultTeamId();
    openSheet(`
      <h3>${t('gameInfo')}</h3>
      <form class="form" data-form="game-info">
        ${db.teams.length ? `<label>${t('team')}
          <select name="teamId">${db.teams.map((tm) => `<option value="${tm.id}" ${tm.id === teamId ? 'selected' : ''}>${esc(teamLabel(tm))}</option>`).join('')}</select>
        </label>` : ''}
        <label>${t('opponent')}<input name="opponent" autocomplete="off" value="${esc(g.opponent)}"></label>
        <label>${t('homeAway')}
          <select name="home"><option value="1">${t('home')}</option><option value="0" ${g.home === false ? 'selected' : ''}>${t('away')}</option></select>
        </label>
        <label>${t('round')}<input type="number" inputmode="numeric" min="1" name="round" value="${esc(g.round)}"></label>
        <div class="row gap">
          <label class="grow">${t('date')}<input type="date" name="date" value="${esc(g.date)}" required></label>
          <label class="grow">${t('time')}<input type="time" name="time" value="${esc(g.time)}"></label>
        </div>
        <button class="btn primary block">${t('save')}</button>
        <button type="button" class="btn ghost block" data-action="close-sheet">${t('cancel')}</button>
      </form>`);
  },
  'menu-toggle': (_, el) => {
    const list = el.nextElementSibling;
    const open = list.hidden;
    closeMenus();
    list.hidden = !open;
    el.setAttribute('aria-expanded', String(open));
  },
  'delete-game': async () => {
    const g = currentGame();
    if (!g) return;
    const ok = await askConfirm({
      title: t('deleteGameTitle'), message: t('confirmDeleteGame'), ok: t('deleteBtn'), danger: true,
    });
    if (!ok) return;
    db.games = db.games.filter((x) => x !== g);
    save();
    location.hash = '#/games';
  },

  // report
  pdf: () => exportPdf(currentGame()),

  // backup
  backup: () => download(`fut-academy-backup-${isoDate(new Date())}.json`, JSON.stringify(db, null, 2), 'application/json'),
};

document.addEventListener('click', (e) => {
  if (drag.suppressClick) {
    e.preventDefault();
    return;
  }
  // Any tap closes an open ⋯ menu (except the toggle itself, which handles it).
  if (!e.target.closest('[data-action="menu-toggle"]')) closeMenus();
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled) return;
  const fn = actions[el.dataset.action];
  if (!fn) return;
  e.preventDefault();
  fn(el.dataset, el);
});

document.addEventListener('input', (e) => {
  const fixKey = e.target.dataset.fix;
  if (fixKey && fix) {
    const g = currentGame();
    const v = e.target.value === '' ? null : Number(e.target.value);
    if (fixKey === 'end') fix.end = v == null ? Math.min(g.periodMin, fixLimits(g).maxMin) : v - periodOffsetMin(g);
    else fix.started = v;
    for (const b of $$(`#sheet .pick[data-action="fix-${fixKey}"]`)) b.classList.remove('on');
    $('#fix-preview').textContent = fixPreview(g);
    return;
  }
  const teamKey = e.target.dataset.team;
  if (teamKey) {
    const tm = getTeam(route().id);
    tm[teamKey] = e.target.value.trim();
    save();
    $('.bar h1').textContent = teamLabel(tm);
    return;
  }
  const field = e.target.dataset.field;
  if (!field || !draft) return;
  draft[field] = e.target.value;
  if (field === 'formatId') {
    const f = FORMATS.find((x) => x.id === draft.formatId);
    if (f && f.id !== 'Custom') Object.assign(draft, { field: f.field, periods: f.periods, periodMin: f.periodMin });
    render();
  } else if (field === 'teamId') {
    draft.sel = {};
    draft.gkId = null;
    render();
  } else if (field === 'field') {
    $('#squad-count').innerHTML = squadCount();
  }
});

document.addEventListener('change', async (e) => {
  if (e.target.dataset.change !== 'restore') return;
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data.players) || !Array.isArray(data.games)) throw new Error('bad file');
    if (!confirm(t('confirmRestore', { p: data.players.length, g: data.games.length }))) return;
    db = normalize(data);
    save();
    render();
    toast(t('restored'));
  } catch {
    alert(t('badBackup'));
  }
});

document.addEventListener('submit', (e) => {
  const form = e.target.dataset.form;
  if (!form) return;
  e.preventDefault();
  const data = new FormData(e.target);
  if (form === 'game-info') {
    const g = currentGame();
    const tm = getTeam(data.get('teamId'));
    const round = parseInt(data.get('round'), 10);
    Object.assign(g, {
      opponent: String(data.get('opponent')).trim(), home: data.get('home') === '1',
      round: round >= 1 ? String(round) : '', date: data.get('date') || g.date, time: data.get('time'),
    });
    if (tm) Object.assign(g, { teamId: tm.id, club: tm.club, team: tm.name });
    save();
    render();
    return;
  }
  const name = String(data.get('name') || '').trim();
  if (!name) return;
  const number = String(data.get('number') || '').trim();
  const full = String(data.get('fullName') || '').trim();
  if (form === 'edit-player') {
    Object.assign(db.players.find((x) => x.id === e.target.dataset.id), { name, number, fullName: full });
    save();
    render();
    return;
  }
  const teamId = form === 'add-player-draft' ? draft.teamId : route().id;
  const p = { id: uid(), name, number, fullName: full, teamId };
  db.players.push(p);
  save();
  if (form === 'add-player-draft') draft.sel[p.id] = 'bench';
  render();
  main.querySelector(`[data-form="${form}"] input[name="${form === 'add-player' ? 'number' : 'name'}"]`)?.focus();
});

// ---------- Drag a player onto another to substitute ----------
// Hold a player briefly, then drag onto a player in the other group (bench <-> pitch) to sub,
// or onto another pitch player / empty spot to swap positions.
// A quick swipe still scrolls the page; a plain tap still opens the player sheet.

const drag = { timer: null, active: false, moved: false, from: null, x0: 0, y0: 0, ghost: null, target: null, suppressClick: false };

function chipAt(x, y) {
  const el = document.elementFromPoint(x, y)?.closest('.chip');
  return el && !el.disabled ? el : null;
}

// 'sub' (bench <-> pitch), 'move' (pitch -> pitch spot) or null.
function dropKind(from, to) {
  const spot = (el) => el.classList.contains('tok') || el.classList.contains('slot-empty');
  if (spot(from) && spot(to)) {
    if (to.classList.contains('slot-empty') && from.classList.contains('gk')) return null;
    return 'move';
  }
  if (to.classList.contains('slot-empty')) return null;
  return from.classList.contains('on') !== to.classList.contains('on') ? 'sub' : null;
}

function dragStart(chip, x, y) {
  if (chip.disabled || !chip.dataset.id || route().view !== 'game') return;
  Object.assign(drag, { from: chip, x0: x, y0: y, moved: false, target: null });
  drag.timer = setTimeout(() => {
    drag.active = true;
    buzz();
    const r = chip.getBoundingClientRect();
    const ghost = chip.cloneNode(true);
    ghost.className += ' ghost';
    Object.assign(ghost.style, { width: `${r.width}px`, left: `${x - r.width / 2}px`, top: `${y - r.height / 2}px` });
    document.body.appendChild(ghost);
    drag.ghost = ghost;
    chip.classList.add('dragging');
    document.body.classList.add('is-dragging', chip.classList.contains('on') ? 'from-on' : 'from-bench');
  }, 220);
}

function dragMove(x, y, e) {
  if (!drag.from) return;
  if (!drag.active) {
    if (Math.hypot(x - drag.x0, y - drag.y0) > 10) dragCancel();
    return;
  }
  e.preventDefault();
  drag.moved = true;
  const r = drag.ghost.getBoundingClientRect();
  drag.ghost.style.left = `${x - r.width / 2}px`;
  drag.ghost.style.top = `${y - r.height / 2}px`;
  const t = chipAt(x, y);
  const valid = t && t !== drag.from && dropKind(drag.from, t);
  drag.target?.classList.remove('drop');
  drag.target = valid ? t : null;
  drag.target?.classList.add('drop');
}

function dragEnd() {
  if (!drag.from) return;
  const { active, moved, from, target } = drag;
  dragCancel();
  if (!active) return;
  drag.suppressClick = true;
  setTimeout(() => (drag.suppressClick = false), 400);
  const g = currentGame();
  if (target && dropKind(from, target) === 'move') {
    movePlayer(g, from.dataset.id, Number(target.dataset.slot));
  } else if (target) {
    const fromOn = from.classList.contains('on');
    const [out, inn] = fromOn ? [from.dataset.id, target.dataset.id] : [target.dataset.id, from.dataset.id];
    doSub(g, out, inn);
  } else if (!moved) {
    openPlayerSheet(g, from.dataset.id);
  }
}

function dragCancel() {
  clearTimeout(drag.timer);
  drag.ghost?.remove();
  drag.from?.classList.remove('dragging');
  drag.target?.classList.remove('drop');
  document.body.classList.remove('is-dragging', 'from-on', 'from-bench');
  Object.assign(drag, { timer: null, active: false, from: null, ghost: null, target: null });
}

document.addEventListener('touchstart', (e) => {
  const chip = e.target.closest('.chip');
  if (chip && e.touches.length === 1) dragStart(chip, e.touches[0].clientX, e.touches[0].clientY);
}, { passive: true });
document.addEventListener('touchmove', (e) => dragMove(e.touches[0].clientX, e.touches[0].clientY, e), { passive: false });
document.addEventListener('touchend', dragEnd);
document.addEventListener('touchcancel', dragCancel);

// Mouse version, handy when testing on a computer.
document.addEventListener('mousedown', (e) => {
  const chip = e.target.closest('.chip');
  if (chip && e.button === 0) dragStart(chip, e.clientX, e.clientY);
});
document.addEventListener('mousemove', (e) => dragMove(e.clientX, e.clientY, e));
document.addEventListener('mouseup', dragEnd);

document.addEventListener('contextmenu', (e) => {
  if (e.target.closest('.chip')) e.preventDefault();
});

// ---------- Keep the screen on during a live game ----------

let wakeLock = null;
let wakePending = false;

async function updateWakeLock() {
  const { view, id } = route();
  const g = view === 'game' && getGame(id);
  const want = !!g && g.status === 'live' && document.visibilityState === 'visible';
  try {
    if (want && !wakeLock && !wakePending && 'wakeLock' in navigator) {
      wakePending = true;
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => (wakeLock = null));
    } else if (!want && wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
  } catch {} finally {
    wakePending = false;
  }
}

document.addEventListener('visibilitychange', updateWakeLock);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenus(); });

// ---------- Start ----------

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

render();
tick(); // apply any auto-stop that was due while the app was closed
