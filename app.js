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
    players: 'Players', playerName: 'Player name', add: 'Add', edit: 'Edit',
    noPlayers: 'No players yet. Add the squad above.',
    deleteTeam: 'Delete team', teamHasPlayers: 'Remove the players from this team first.', confirmDeleteTeam: 'Delete this team?',
    promptName: 'Name', promptNumber: 'Shirt number',
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
    kickoff: '▶ Kick off', pause: '⏸ Pause', resume: '▶ Resume', fullTimeBtn: '🏁 Full time', fullTime: 'Full time',
    endPeriod: 'End {p}', startPeriod: '▶ Start {p}', viewReport: '📋 View report',
    notStarted: 'Not started · {n} × {m} min', paused: 'paused', breakAfter: 'Break after {p}',
    autoStoppedToast: '⏱ {p} auto-stopped at +{m} min', fixTimes: 'Fix times',
    timeUp: '⏰ {p}: time is up', extraMin: '⏰ {p}: +{m} min extra',
    evSub: '🔁 {in} on, {out} off', evGoal: '⚽ Goal: {p}', evOppGoal: '🥅 Goal conceded',
    evYellow: '🟨 Yellow: {p}', evRed: '🟥 Red: {p}', evGk: '🧤 In goal: {p}', evStart: '⏱ Start of {p}', evEnd: '⏱ End of {p}',
    notFound: 'Not found', gameGone: 'This game no longer exists.', back: 'Back',
    autoStoppedAlert: '⏱ {p} was stopped automatically at +{m} min. If it ended earlier or the next half already started, tap <b>{fix}</b>.',
    oppGoalBtn: '+ Goal conceded', fixTimesBtn: '⏱ Fix times',
    tapHint: 'Tap a player for subs, goals &amp; cards · hold and drag onto another player to sub',
    onPitch: 'On pitch', bench: 'Bench', noSubs: 'No substitutes.', sentOff: 'Sent off', timeline: 'Timeline',
    undoX: '↶ Undo: {x}', undo: 'Undo', nothingYet: 'Nothing yet.', report: 'Report', deleteGame: 'Delete game',
    goalBtn: 'Goal', yellowBtn: 'Yellow', redBtn: 'Red', toGoal: 'To goal', benchState: 'Bench', played: '{t} played',
    subOff: '🔁 Sub off, bring on:', subOn: '🔁 Sub on, replacing:', noAvail: 'No players available.', cancel: 'Cancel',
    fixTitle: '⏱ Fix times · {p}', whenEnd: '{p}: when did it really end?', regular: "{v}' regular", now: 'Now',
    other: 'Other:', nextStarted: '{p}: has it already started?', notYet: 'Not yet', minAgo: '{n} min ago',
    startedPre: 'Started', startedPost: 'min ago',
    previewEnds: '{p} ends at {t}', previewBreak: ' · now on break', previewStarted: ' · {p} started {n} min ago',
    apply: 'Apply', errFixEnd: 'The end must be between {a} and {b}.', errFixStart: '{p} ended less time ago than that.',
    timesFixed: '⏱ Times fixed',
    gameReport: 'Game report', gameTime: 'Game time {t}', inProgress: 'game still in progress',
    didNotPlay: 'Did not play',
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
    players: 'Jogadores', playerName: 'Nome do jogador', add: 'Adicionar', edit: 'Editar',
    noPlayers: 'Ainda não há jogadores. Adiciona o plantel acima.',
    deleteTeam: 'Apagar equipa', teamHasPlayers: 'Remove primeiro os jogadores desta equipa.', confirmDeleteTeam: 'Apagar esta equipa?',
    promptName: 'Nome', promptNumber: 'Número da camisola',
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
    kickoff: '▶ Início', pause: '⏸ Pausa', resume: '▶ Retomar', fullTimeBtn: '🏁 Fim do jogo', fullTime: 'Fim do jogo',
    endPeriod: 'Terminar {p}', startPeriod: '▶ Iniciar {p}', viewReport: '📋 Ver relatório',
    notStarted: 'Por começar · {n} × {m} min', paused: 'em pausa', breakAfter: 'Intervalo após {p}',
    autoStoppedToast: '⏱ {p} parada automaticamente aos +{m} min', fixTimes: 'Corrigir tempos',
    timeUp: '⏰ {p}: tempo esgotado', extraMin: '⏰ {p}: +{m} min extra',
    evSub: '🔁 Entra {in}, sai {out}', evGoal: '⚽ Golo: {p}', evOppGoal: '🥅 Golo sofrido',
    evYellow: '🟨 Amarelo: {p}', evRed: '🟥 Vermelho: {p}', evGk: '🧤 Na baliza: {p}', evStart: '⏱ Início: {p}', evEnd: '⏱ Fim: {p}',
    notFound: 'Não encontrado', gameGone: 'Este jogo já não existe.', back: 'Voltar',
    autoStoppedAlert: '⏱ {p} foi parada automaticamente aos +{m} min. Se terminou antes ou se a parte seguinte já começou, toca em <b>{fix}</b>.',
    oppGoalBtn: '+ Golo sofrido', fixTimesBtn: '⏱ Corrigir tempos',
    tapHint: 'Toca num jogador para substituições, golos e cartões · mantém e arrasta para outro jogador para substituir',
    onPitch: 'Em campo', bench: 'Suplentes', noSubs: 'Sem suplentes.', sentOff: 'Expulsos', timeline: 'Cronologia',
    undoX: '↶ Desfazer: {x}', undo: 'Desfazer', nothingYet: 'Ainda nada.', report: 'Relatório', deleteGame: 'Apagar jogo',
    goalBtn: 'Golo', yellowBtn: 'Amarelo', redBtn: 'Vermelho', toGoal: 'Para a baliza', benchState: 'Suplente', played: '{t} jogados',
    subOff: '🔁 Sai, entra:', subOn: '🔁 Entra, para o lugar de:', noAvail: 'Sem jogadores disponíveis.', cancel: 'Cancelar',
    fixTitle: '⏱ Corrigir tempos · {p}', whenEnd: '{p}: quando terminou realmente?', regular: "{v}' regulamentar", now: 'Agora',
    other: 'Outro:', nextStarted: '{p}: já começou?', notYet: 'Ainda não', minAgo: 'há {n} min',
    startedPre: 'Começou há', startedPost: 'min',
    previewEnds: '{p} termina aos {t}', previewBreak: ' · agora em intervalo', previewStarted: ' · {p} começou há {n} min',
    apply: 'Aplicar', errFixEnd: 'O fim tem de estar entre {a} e {b}.', errFixStart: '{p} terminou há menos tempo do que isso.',
    timesFixed: '⏱ Tempos corrigidos',
    gameReport: 'Relatório do jogo', gameTime: 'Tempo de jogo {t}', inProgress: 'jogo ainda a decorrer',
    didNotPlay: 'Não jogou',
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
function toast(msg, button = '') {
  const el = $('#toast');
  el.innerHTML = `<span>${esc(msg)}</span>${button}`;
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

// ---------- Game state (derived from events) ----------

function derive(g) {
  const on = new Set(g.starters);
  const sentOff = new Set();
  let gk = g.gkId;
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
        break;
      case 'gk': gk = e.playerId; break;
    }
  }

  const end = matchTime(g);
  for (const id of g.squad) {
    const s = stats[id];
    if (s.open != null) s.intervals.push([s.open, end]);
    s.intervals = s.intervals.filter(([a, b]) => b > a || g.status === 'scheduled');
    s.played = s.intervals.reduce((sum, [a, b]) => sum + (b - a), 0);
  }
  return { on, sentOff, gk, us, them, stats };
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
  toast(t('evSub', { in: g.names[inn].name, out: g.names[out].name }), undoBtn(id));
}

function describe(g, e) {
  switch (e.type) {
    case 'sub': return t('evSub', { in: esc(pname(g, e.inId)), out: esc(pname(g, e.playerId)) });
    case 'goal': return t('evGoal', { p: esc(pname(g, e.playerId)) });
    case 'oppgoal': return t('evOppGoal');
    case 'yellow': return t('evYellow', { p: esc(pname(g, e.playerId)) });
    case 'red': return t('evRed', { p: esc(pname(g, e.playerId)) });
    case 'gk': return t('evGk', { p: esc(pname(g, e.playerId)) });
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
  updateWakeLock();
}

window.addEventListener('hashchange', () => {
  draft = null;
  render();
  window.scrollTo(0, 0);
});

function bar(title, back) {
  return `<header class="bar">${back ? `<a class="back" href="${back}" aria-label="${t('back')}">‹</a>` : ''}<h1>${title}</h1></header>`;
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
      <strong>vs ${esc(g.opponent || t('opponent'))}</strong>
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
    <form class="row gap" data-form="add-player">
      <input class="num" name="number" inputmode="numeric" placeholder="#" maxlength="3">
      <input class="grow" name="name" placeholder="${t('playerName')}" required autocomplete="off">
      <button class="btn primary">${t('add')}</button>
    </form>
    ${ps.length ? `<ul class="list">${ps.map((p) => `
      <li class="item">
        <span class="shirt">${esc(p.number) || '–'}</span>
        <span class="grow">${esc(p.name)}</span>
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
    names[id] = { name: p.name, number: p.number };
  }
  Object.assign(g, {
    date: draft.date, time: draft.time, opponent: draft.opponent.trim(), formatId: draft.formatId,
    field, periods, periodMin, maxExtra, squad, starters, gkId: draft.gkId, names,
    teamId: team.id, club: team.club, team: team.name, home: draft.home, round: round >= 1 ? String(round) : '',
  });
  db.lastTeamId = team.id;
  save();
  location.hash = `#/game/${g.id}`;
}

// ---------- Views: live game ----------

function clockButtons(g) {
  const c = g.clock;
  const b = (action, label, cls = '') => `<button class="btn ${cls}" data-action="${action}">${label}</button>`;
  switch (g.status) {
    case 'scheduled': return b('kickoff', t('kickoff'), 'primary');
    case 'live':
      return (c.running ? b('pause', t('pause')) : b('resume', t('resume'), 'primary')) +
        b('end-period', c.period >= g.periods ? t('fullTimeBtn') : t('endPeriod', { p: periodName(g, c.period) }), 'warn');
    case 'break': return b('next-period', t('startPeriod', { p: periodName(g, c.period + 1) }), 'primary');
    default: return `<a class="btn primary" href="#/report/${g.id}">${t('viewReport')}</a>`;
  }
}

const gkTag = () => ` <span class="tag">${t('gk')}</span>`;

function chip(g, d, id, where) {
  const s = d.stats[id];
  const p = g.names[id];
  const badges = [
    s.goals ? `⚽${s.goals > 1 ? s.goals : ''}` : '',
    '🟨'.repeat(s.yellow),
    '🟥'.repeat(s.red),
  ].join('');
  return `<button class="chip ${where} ${id === d.gk ? 'gk' : ''}" data-action="player" data-id="${id}" ${where === 'off' ? 'disabled' : ''}>
    <span class="shirt">${esc(p.number) || '–'}</span>
    <span class="pname">${esc(p.name)}${id === d.gk ? gkTag() : ''}</span>
    <span class="meta"><span data-pt="${id}">${fmtMins(s.played)}</span> ${badges}</span>
  </button>`;
}

function viewGame(id) {
  const g = getGame(id);
  if (!g) return notFound();
  const d = derive(g);
  const onIds = sortIds(g, d.on).sort((a, b) => (b === d.gk) - (a === d.gk));
  const benchIds = g.squad
    .filter((p) => !d.on.has(p) && !d.sentOff.has(p))
    .sort((a, b) => d.stats[a].played - d.stats[b].played || byNumber(g.names[a], g.names[b]));
  const offIds = sortIds(g, [...d.sentOff].filter((p) => !d.on.has(p)));

  const timeline = [...g.events, ...g.marks].sort((a, b) => a.t - b.t || (a.wall || 0) - (b.wall || 0)).reverse();
  const last = g.events[g.events.length - 1];
  const canEdit = g.status === 'scheduled' && g.events.length === 0;
  const overtime = g.status === 'live' && matchTime(g) - periodStart(g) >= g.periodMin * 60000;

  main.innerHTML = `
    ${bar(`vs ${esc(g.opponent || t('opponent'))}`, '#/games')}
    <section class="scoreboard ${overtime ? 'overtime' : ''}">
      <div class="muted small">${formatLine(g)}</div>
      <div class="score big">${d.us} – ${d.them}</div>
      <div class="clock" id="clock">${fmtNow(g)}</div>
      <div class="muted" id="period">${periodLabel(g)}</div>
      ${g.status === 'break' && g.autoStopped === g.clock.period ? `<div class="alert">${t('autoStoppedAlert', { p: periodName(g, g.clock.period), m: g.maxExtra ?? 10, fix: t('fixTimes') })}</div>` : ''}
      <div class="row gap center wrap">${clockButtons(g)}</div>
      <div class="row gap center wrap">
        <button class="btn small ghost" data-action="opp-goal">${t('oppGoalBtn')}</button>
        ${g.status !== 'scheduled' ? `<button class="btn small ghost" data-action="fix-open">${t('fixTimesBtn')}</button>` : ''}
      </div>
    </section>

    <p class="hint center-text">${t('tapHint')}</p>

    <h2>${t('onPitch')} <span class="muted small">${d.on.size}/${g.field + 1}</span></h2>
    <div class="grid">${onIds.map((p) => chip(g, d, p, 'on')).join('')}</div>

    <h2>${t('bench')}</h2>
    ${benchIds.length ? `<div class="grid">${benchIds.map((p) => chip(g, d, p, 'bench')).join('')}</div>` : `<p class="empty small">${t('noSubs')}</p>`}

    ${offIds.length ? `<h2>${t('sentOff')}</h2><div class="grid">${offIds.map((p) => chip(g, d, p, 'off')).join('')}</div>` : ''}

    <h2>${t('timeline')}</h2>
    ${last ? `<button class="btn small ghost" data-action="undo">${t('undoX', { x: describe(g, last) })}</button>` : ''}
    ${timeline.length ? `<ul class="timeline">${timeline.map((e) => `<li><span class="t">${timeOf(g, e)}</span><span>${describe(g, e)}</span></li>`).join('')}</ul>` : `<p class="empty small">${t('nothingYet')}</p>`}

    <div class="row gap foot">
      ${canEdit ? `<a class="btn ghost" href="#/edit/${g.id}">${t('edit')}</a>` : ''}
      ${g.status !== 'scheduled' ? `<a class="btn ghost" href="#/report/${g.id}">${t('report')}</a>` : ''}
      <button class="btn ghost danger" data-action="delete-game">${t('deleteGame')}</button>
    </div>`;
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
      ${quick('goal', '⚽', t('goalBtn'), on)}
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

  // Players who played first, then alphabetical, like the club's sheet.
  const players = g.squad
    .map((id) => ({ p: g.names[id], s: d.stats[id], starter: g.starters.includes(id) }))
    .sort((a, b) => !a.s.intervals.length - !b.s.intervals.length || a.p.name.localeCompare(b.p.name, locale()));
  const dash = '—';
  const rows = players.map((r, i) => {
    const played = r.s.intervals.length > 0;
    return [
      [String(i + 1)],
      [r.p.name],
      [r.p.number || ''],
      [r.starter ? 'X' : ''],
      [r.starter ? '' : 'X'],
      played ? stintLabels(g, r.s, ' – ') : [t('didNotPlay')],
      [played ? mmss(r.s.played) : dash],
      [played ? String(r.s.goals) : dash],
      [played ? String(r.s.yellow) : dash],
      [played ? String(r.s.red) : dash],
    ];
  });
  const sum = (k) => String(players.reduce((n, r) => n + r.s[k], 0));
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
    const name = prompt(t('promptName'), p.name);
    if (name == null || !name.trim()) return;
    const number = prompt(t('promptNumber'), p.number);
    p.name = name.trim();
    if (number != null) p.number = number.trim();
    save();
    render();
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
  pause: () => { const g = currentGame(); stopClock(g); save(); render(); },
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
    const g = currentGame();
    const eid = addEvent(g, { type: 'gk', playerId: id });
    render();
    toast(t('inGoalToast', { p: g.names[id].name }), undoBtn(eid));
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
  'delete-game': () => {
    const g = currentGame();
    if (!confirm(t('confirmDeleteGame'))) return;
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
  const name = String(data.get('name') || '').trim();
  if (!name) return;
  const teamId = form === 'add-player-draft' ? draft.teamId : route().id;
  const p = { id: uid(), name, number: String(data.get('number') || '').trim(), teamId };
  db.players.push(p);
  save();
  if (form === 'add-player-draft') draft.sel[p.id] = 'bench';
  render();
  main.querySelector(`[data-form="${form}"] input[name="${form === 'add-player' ? 'number' : 'name'}"]`)?.focus();
});

// ---------- Drag a player onto another to substitute ----------
// Hold a player briefly, then drag onto a player in the other group (bench <-> pitch).
// A quick swipe still scrolls the page; a plain tap still opens the player sheet.

const drag = { timer: null, active: false, moved: false, from: null, x0: 0, y0: 0, ghost: null, target: null, suppressClick: false };

function chipAt(x, y) {
  const el = document.elementFromPoint(x, y)?.closest('.chip');
  return el && !el.disabled ? el : null;
}

function dragStart(chip, x, y) {
  if (chip.disabled || route().view !== 'game') return;
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
  const valid = t && t !== drag.from && t.classList.contains('on') !== drag.from.classList.contains('on');
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
  if (target) {
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

// ---------- Start ----------

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

render();
tick(); // apply any auto-stop that was due while the app was closed
