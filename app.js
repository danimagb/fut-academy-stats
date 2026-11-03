'use strict';

// ---------- Config ----------

const STORE_KEY = 'fut-academy-stats.v1';
const LANG_KEY = 'fut-academy-stats.lang';
const THEME_KEY = 'fut-academy-stats.theme'; // 'light' | 'dark' | 'auto' (follow the device)
const GAMES_TEAM_KEY = 'fut-academy-stats.gamesTeam'; // team filter on the games page ('' = all)

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
    exportBackup: 'Export backup', importBackup: 'Import backup', backupTitle: 'Backup',
    storageKept: 'This browser keeps the app\'s data stored (it won\'t clear it on its own).',
    storageNotKept: 'This browser may clear the app\'s data if it runs short of space or the app isn\'t used for a while. Export a backup regularly; adding the app to the home screen helps.',
    backupHint: 'Save a copy of your teams and games to a file, or restore one.',
    privacyLink: 'How your data is handled', privacyTitle: 'Your data',
    privacyBody: '<p><b>Without an account</b>, everything stays on this device. Nothing is sent anywhere.</p>'
      + '<p><b>Synced teams</b> are stored in the app\'s cloud database (Supabase, in the EU): the team and club name, players\' shirt numbers, shirt names and full names (if entered), and the games (lineups, minutes, subs, goals and cards). Only people the admin gave access to, and who are members of that team, can see it; the admin can see which teams exist and who is in them. Nothing else is collected: no photos, birth dates or contact details of players.</p>'
      + '<p><b>Your account</b> is your email and a password. The password is stored only as a one-way hash (it can\'t be read back, not even by the admin); the email is also used to send you codes the first time and if you forget your password.</p>'
      + '<p><b>Deleting</b>: a director can delete a team, which deletes it in the cloud too. To remove your account, ask the admin.</p>'
      + '<p>The club is responsible for agreeing to store players\' names, and for parents\' consent where needed.</p>',
    opponent: 'Opponent', gkPlus: '1 GK + {n}', gk: 'GK',
    res_win: 'Win', res_draw: 'Draw', res_loss: 'Loss', roundN: 'Round {n}',
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
    allTeams: 'All', noGamesTeam: 'No games for this team yet.',
    removePlayerTitle: 'Remove player?', restoreBtn: 'Restore',
    password: 'Password', signInPw: 'Sign in', tabSignIn: 'Sign in', tabSignUp: 'Activate account',
    signUpIntro: 'Use the email the admin registered.',
    resetTitle: 'Reset your password', resetIntro: '',
    stepOf: 'Step {n} of 3', stepEmail: 'Your email', stepCode: 'Code from the email', stepPassword: 'Choose a password',
    confirmCode: 'Confirm', createAccount: 'Activate account', forgotPassword: 'Forgot your password?', backToSignIn: 'Back to sign in',
    setPwTitle: 'Choose a password', setPwHint: 'At least 8 characters.',
    newPassword: 'New password', repeatPassword: 'Repeat the password', savePassword: 'Save password', changePassword: 'Change password',
    pwSaved: 'Password saved', pwMismatch: 'The passwords don\'t match.', pwShort: 'Use at least 8 characters.', pwWeak: 'That password is too weak. Try a longer one.',
    pwSame: 'That\'s already your password. Choose a different one.', authBadPassword: 'Wrong email or password. First time here? Use "Activate account".',
    tabAdmin: 'Admin', notSignedIn: 'Not signed in', backupSummary: 'Export or import a copy of your data',
    account: 'Account', accountHint: 'Only for people the admin gave access to.',
    email: 'Email', sendCode: 'Send code', codeLabel: 'Code from the email', signIn: 'Sign in', codeSent: 'Sent to {email} (check spam too).',
    otherEmail: 'Use a different email', resendCode: 'Resend code', signOut: 'Sign out', signOutConfirm: 'Sign out?', signedIn: 'Signed in',
    acctDirector: 'Director account', acctCoach: 'Coach account', acctAdmin: 'Admin', acctNone: 'This user has no access set up yet. Ask the admin.',
    authNoAccess: 'This email doesn\'t have access. Ask the admin.', authBadCode: 'Wrong or expired code. Try again or ask for a new one.',
    authRateLimit: 'Too many attempts. Wait a minute and try again.', authOffline: 'No internet connection. Try again when you have signal.',
    authFailed: 'Couldn\'t sign in ({msg}).', cloudUnavailable: 'Signing in isn\'t available.',
    syncing: 'Syncing…', syncedAgo: 'Synced · {ago}', agoNow: 'just now', agoMin: '{n} min ago', agoHour: '{n} h ago',
    syncWaiting: '{n} changes waiting', syncWaiting1: '1 change waiting', syncOffline: 'Offline · will sync when back online',
    syncWaitingOffline: '{n} changes waiting (offline)', syncWaitingOffline1: '1 change waiting (offline)',
    syncFailed: 'Couldn\'t sync, will try again', syncUploadFailed: 'Couldn\'t sync a team (not allowed).',
    syncNever: 'Not synced yet', syncNow: 'Sync now', badgeCloud: 'Synced', badgeLocal: 'Local',
    uploadTeam: 'Sync this team', uploadTeamHint: 'You\'ll be its director and can add coaches.',
    uploadTitle: 'Sync your teams?', uploadHint: 'Choose the teams to sync. You\'ll be their director.',
    uploadSelected: 'Sync selected', notNow: 'Not now', uploading: 'Syncing…',
    signOutLose: '{n} changes not uploaded yet will be lost.', signOutLose1: '1 change not uploaded yet will be lost.',
    signOutCloud: 'Synced teams won\'t show here until you sign in again.',
    settings: 'Settings', language: 'Language', theme: 'Theme', themeLight: 'Light', themeDark: 'Dark', themeAuto: 'Auto',
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
    readOnly: 'Read-only', readOnlyToast: 'Read-only: you\'re a coach on this team',
    readOnlyHint: 'You\'re a coach on this team: you can see it, its games and reports (and share the PDF), but only its directors can change them.',
    newGameCoachOnly: 'You\'re a coach on these teams, so only directors create games. To log your own games, create a local team.',
    newTeamCloud: 'Synced team. You can add coaches under People.',
    people: 'People', loading: 'Loading…', needsInternet: 'Needs internet. Try again when you have signal.', tryAgain: 'Try again',
    roleDirector: 'Director', roleCoach: 'Coach', you: 'you', peopleSignIn: 'Sign in to see who has access to this team.',
    addCoach: 'Add coach', addCoachEmail: 'Add a coach by email',
    addCoachHint: 'Only people the admin has given access. Coaches see the team, its games and reports, but can\'t change anything.',
    coachAdded: '{email} was added as a coach.', coachAlready: '{email} is already in this team.',
    coachNoAccount: 'This person doesn\'t have access yet. Ask the admin.',
    notAllowed: 'You\'re not allowed to do that.', actionFailed: 'Couldn\'t do that ({msg}).',
    removeFromTeam: 'Remove from team', removeMemberConfirm: 'Remove {email} from this team?',
    removed: 'Removed', leaveTeam: 'Leave team', leftTeam: 'You left the team',
    leaveTeamConfirm: 'Leave this team? You\'ll only see it again if a director adds you back.',
    lastDirector: 'A team must keep at least one director.',
    admin: 'Admin', adminHint: 'Give access, manage accounts and teams.', adminOnly: 'Only the admin can open this page.',
    giveAccess: 'Give access', accountKind: 'Account type',
    giveAccessHint: 'Creates an account for this email. No email is sent: the person then opens the app (Profile → Account → Activate account), enters this email and the code they receive, and chooses a password. Email sending (SMTP) must be set up for the code to arrive.',
    accessGivenTitle: 'Access given', accessGiven: '{email} can now sign in. Let them know: in the app, Profile → Account, with this email.',
    errExists: 'This email already has access.', errEmail: 'Check the email address.', errNotAdmin: 'Only the admin can do this.',
    errSession: 'The admin function refused your sign-in ({msg}). Sign out and in again; if it keeps happening, see "Verify JWT" in docs/supabase-setup.md.',
    errSelf: 'You can\'t do that to your own account.', errIsAdmin: 'Admins can only be removed in the Supabase dashboard.',
    accounts: 'Accounts', kindChanged: 'Account type changed', removeAccess: 'Remove access', accessRemoved: 'Access removed',
    removeAccessConfirm: 'Remove access for {email}? They can\'t sign in any more and leave all their teams. Teams, players and games stay.',
    cloudTeams: 'Synced teams', noCloudTeams: 'No synced teams yet.', noMembers: 'No members.', noDirector: 'No director',
    addMember: 'Add', pickAccount: 'Choose an account…', roleChanged: 'Role changed', memberAdded: 'Added', teamsN: '{n} teams', teamsN1: '1 team',
  },
  pt: {
    newGame: '+ Novo jogo', teamsBtn: 'Equipas ({n})',
    noGames: 'Ainda não há jogos.<br>Cria a tua equipa com os jogadores e depois um jogo.',
    exportBackup: 'Exportar cópia', importBackup: 'Importar cópia', backupTitle: 'Cópia de segurança',
    storageKept: 'Este navegador mantém os dados da app guardados (não os apaga por iniciativa própria).',
    storageNotKept: 'Este navegador pode apagar os dados da app se ficar sem espaço ou se a app não for usada durante algum tempo. Exporta uma cópia com regularidade; adicionar a app ao ecrã principal ajuda.',
    backupHint: 'Guarda uma cópia das equipas e jogos num ficheiro, ou restaura uma.',
    privacyLink: 'Como são tratados os dados', privacyTitle: 'Os teus dados',
    privacyBody: '<p><b>Sem conta</b>, fica tudo neste dispositivo. Nada é enviado para lado nenhum.</p>'
      + '<p><b>As equipas sincronizadas</b> ficam guardadas na base de dados da app na nuvem (Supabase, na UE): o nome da equipa e do clube, os números, nomes na camisola e nomes completos dos jogadores (se indicados) e os jogos (convocados, minutos, substituições, golos e cartões). Só as pessoas a quem o administrador deu acesso e que são membros dessa equipa a podem ver; o administrador vê que equipas existem e quem pertence a cada uma. Não é recolhido mais nada: nem fotografias, nem datas de nascimento, nem contactos dos jogadores.</p>'
      + '<p><b>A tua conta</b> é o teu email e uma palavra-passe. A palavra-passe só é guardada como um código irreversível (hash) e não pode ser lida, nem pelo administrador; o email serve também para te enviar códigos na primeira vez e se te esqueceres da palavra-passe.</p>'
      + '<p><b>Apagar</b>: um diretor pode apagar uma equipa, o que a apaga também na nuvem. Para remover a tua conta, fala com o administrador.</p>'
      + '<p>Cabe ao clube aceitar que os nomes dos jogadores sejam guardados e obter o consentimento dos pais quando necessário.</p>',
    opponent: 'Adversário', gkPlus: '1 GR + {n}', gk: 'GR',
    res_win: 'Vitória', res_draw: 'Empate', res_loss: 'Derrota', roundN: 'Jornada {n}',
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
    allTeams: 'Todas', noGamesTeam: 'Ainda não há jogos desta equipa.',
    removePlayerTitle: 'Remover jogador?', restoreBtn: 'Restaurar',
    password: 'Palavra-passe', signInPw: 'Entrar', tabSignIn: 'Entrar', tabSignUp: 'Ativar conta',
    signUpIntro: 'Usa o email que o administrador registou.',
    resetTitle: 'Recuperar a palavra-passe', resetIntro: '',
    stepOf: 'Passo {n} de 3', stepEmail: 'O teu email', stepCode: 'Código do email', stepPassword: 'Escolhe uma palavra-passe',
    confirmCode: 'Confirmar', createAccount: 'Ativar conta', forgotPassword: 'Esqueceste-te da palavra-passe?', backToSignIn: 'Voltar a entrar',
    setPwTitle: 'Escolhe uma palavra-passe', setPwHint: 'Pelo menos 8 caracteres.',
    newPassword: 'Nova palavra-passe', repeatPassword: 'Repete a palavra-passe', savePassword: 'Guardar palavra-passe', changePassword: 'Mudar palavra-passe',
    pwSaved: 'Palavra-passe guardada', pwMismatch: 'As palavras-passe não coincidem.', pwShort: 'Usa pelo menos 8 caracteres.', pwWeak: 'Essa palavra-passe é demasiado fraca. Experimenta uma mais longa.',
    pwSame: 'Essa já é a tua palavra-passe. Escolhe outra.', authBadPassword: 'Email ou palavra-passe errados. É a primeira vez? Usa "Ativar conta".',
    tabAdmin: 'Admin', notSignedIn: 'Sessão não iniciada', backupSummary: 'Exportar ou importar uma cópia dos dados',
    account: 'Conta', accountHint: 'Só para quem recebeu acesso do administrador.',
    email: 'Email', sendCode: 'Enviar código', codeLabel: 'Código do email', signIn: 'Entrar', codeSent: 'Enviado para {email} (vê também o spam).',
    otherEmail: 'Usar outro email', resendCode: 'Reenviar código', signOut: 'Terminar sessão', signOutConfirm: 'Terminar sessão?', signedIn: 'Sessão iniciada',
    acctDirector: 'Conta de diretor', acctCoach: 'Conta de treinador', acctAdmin: 'Admin', acctNone: 'Este utilizador ainda não tem acesso configurado. Fala com o administrador.',
    authNoAccess: 'Este email não tem acesso. Fala com o administrador.', authBadCode: 'Código errado ou expirado. Tenta outra vez ou pede um novo.',
    authRateLimit: 'Demasiadas tentativas. Espera um minuto e tenta outra vez.', authOffline: 'Sem ligação à internet. Tenta outra vez quando tiveres rede.',
    authFailed: 'Não foi possível entrar ({msg}).', cloudUnavailable: 'Não é possível iniciar sessão.',
    syncing: 'A sincronizar…', syncedAgo: 'Sincronizado · {ago}', agoNow: 'agora mesmo', agoMin: 'há {n} min', agoHour: 'há {n} h',
    syncWaiting: '{n} alterações por enviar', syncWaiting1: '1 alteração por enviar', syncOffline: 'Sem rede · sincroniza quando voltar',
    syncWaitingOffline: '{n} alterações à espera (sem rede)', syncWaitingOffline1: '1 alteração à espera (sem rede)',
    syncFailed: 'Não foi possível sincronizar, vamos tentar outra vez', syncUploadFailed: 'Não foi possível sincronizar uma equipa (sem permissão).',
    syncNever: 'Ainda não sincronizado', syncNow: 'Sincronizar agora', badgeCloud: 'Sincronizada', badgeLocal: 'Local',
    uploadTeam: 'Sincronizar esta equipa', uploadTeamHint: 'Ficas como diretor e podes adicionar treinadores.',
    uploadTitle: 'Sincronizar as tuas equipas?', uploadHint: 'Escolhe as equipas a sincronizar. Ficas como diretor.',
    uploadSelected: 'Sincronizar selecionadas', notNow: 'Agora não', uploading: 'A sincronizar…',
    signOutLose: '{n} alterações ainda não enviadas vão perder-se.', signOutLose1: '1 alteração ainda não enviada vai perder-se.',
    signOutCloud: 'As equipas sincronizadas deixam de aparecer aqui até voltares a entrar.',
    settings: 'Definições', language: 'Idioma', theme: 'Tema', themeLight: 'Claro', themeDark: 'Escuro', themeAuto: 'Auto',
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
    readOnly: 'Só leitura', readOnlyToast: 'Só leitura: és treinador nesta equipa',
    readOnlyHint: 'És treinador nesta equipa: podes ver a equipa, os jogos e os relatórios (e partilhar o PDF), mas só os diretores os podem alterar.',
    newGameCoachOnly: 'És treinador nestas equipas, por isso só os diretores criam jogos. Para registares jogos teus, cria uma equipa local.',
    newTeamCloud: 'Equipa sincronizada. Podes adicionar treinadores em Pessoas.',
    people: 'Pessoas', loading: 'A carregar…', needsInternet: 'Precisa de internet. Tenta outra vez quando tiveres rede.', tryAgain: 'Tentar outra vez',
    roleDirector: 'Diretor', roleCoach: 'Treinador', you: 'tu', peopleSignIn: 'Entra na tua conta para ver quem tem acesso a esta equipa.',
    addCoach: 'Adicionar treinador', addCoachEmail: 'Adicionar um treinador por email',
    addCoachHint: 'Só pessoas a quem o administrador deu acesso. Os treinadores veem a equipa, os jogos e os relatórios, mas não podem alterar nada.',
    coachAdded: '{email} foi adicionado como treinador.', coachAlready: '{email} já está nesta equipa.',
    coachNoAccount: 'Esta pessoa ainda não tem acesso. Fala com o administrador.',
    notAllowed: 'Não tens permissão para fazer isso.', actionFailed: 'Não foi possível ({msg}).',
    removeFromTeam: 'Remover da equipa', removeMemberConfirm: 'Remover {email} desta equipa?',
    removed: 'Removido', leaveTeam: 'Sair da equipa', leftTeam: 'Saíste da equipa',
    leaveTeamConfirm: 'Sair desta equipa? Só a voltas a ver se um diretor te adicionar outra vez.',
    lastDirector: 'Uma equipa tem de ter pelo menos um diretor.',
    admin: 'Admin', adminHint: 'Dar acesso, gerir contas e equipas.', adminOnly: 'Só o administrador pode abrir esta página.',
    giveAccess: 'Dar acesso', accountKind: 'Tipo de conta',
    giveAccessHint: 'Cria uma conta para este email. Não é enviado nenhum email: a pessoa abre depois a app (Perfil → Conta → Ativar conta), indica este email e o código que recebe e escolhe uma palavra-passe. O envio de emails (SMTP) tem de estar configurado para o código chegar.',
    accessGivenTitle: 'Acesso dado', accessGiven: '{email} já pode entrar. Avisa essa pessoa: na app, Perfil → Conta, com este email.',
    errExists: 'Este email já tem acesso.', errEmail: 'Verifica o endereço de email.', errNotAdmin: 'Só o administrador pode fazer isto.',
    errSession: 'A função de administração recusou a tua sessão ({msg}). Termina a sessão e entra outra vez; se continuar, vê "Verify JWT" em docs/supabase-setup.md.',
    errSelf: 'Não podes fazer isso à tua própria conta.', errIsAdmin: 'Os administradores só podem ser removidos no painel do Supabase.',
    accounts: 'Contas', kindChanged: 'Tipo de conta alterado', removeAccess: 'Retirar acesso', accessRemoved: 'Acesso retirado',
    removeAccessConfirm: 'Retirar o acesso a {email}? Deixa de poder entrar e sai de todas as equipas. As equipas, jogadores e jogos ficam.',
    cloudTeams: 'Equipas sincronizadas', noCloudTeams: 'Ainda não há equipas sincronizadas.', noMembers: 'Sem membros.', noDirector: 'Sem diretor',
    addMember: 'Adicionar', pickAccount: 'Escolhe uma conta…', roleChanged: 'Função alterada', memberAdded: 'Adicionado', teamsN: '{n} equipas', teamsN1: '1 equipa',
  },
};

let lang = localStorage.getItem(LANG_KEY) || ((navigator.language || '').toLowerCase().startsWith('pt') ? 'pt' : 'en');
document.documentElement.lang = lang;

function t(key, vars = {}) {
  const s = I18N[lang][key] ?? I18N.en[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}

// ---------- Theme ----------

let theme = localStorage.getItem(THEME_KEY) || 'auto';
const darkMq = window.matchMedia('(prefers-color-scheme: dark)');

function applyTheme() {
  const resolved = theme === 'auto' ? (darkMq.matches ? 'dark' : 'light') : theme;
  document.documentElement.dataset.theme = resolved;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = resolved === 'light' ? '#eef0f3' : '#0e0f12';
}
applyTheme();
darkMq.addEventListener?.('change', () => { if (theme === 'auto') applyTheme(); });

const locale = () => (lang === 'pt' ? 'pt-PT' : 'en-GB');

// ---------- Storage ----------

// Random ids that are unique across phones (needed once data is shared). Older records keep
// their shorter ids; both are plain strings.
const uid = () => (crypto.randomUUID ? crypto.randomUUID()
  : Date.now().toString(36) + Math.random().toString(36).slice(2, 12));

// Synced record types (per-phone settings like db.formations and db.lastTeamId are not records).
const RECORD_KINDS = ['teams', 'players', 'games'];

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
  data.sync = normalizeSync(data.sync);
  // Players of a cloud team are left alone (moving them would move them in the cloud too).
  const orphans = data.players.filter((p) => !data.teams.some((tm) => tm.id === p.teamId) && !data.sync.teams[p.teamId]);
  if (orphans.length) {
    if (!data.teams.length) data.teams.push({ id: uid(), club: '', name: '' });
    for (const p of orphans) p.teamId = data.teams[0].id;
  }
  syncGameTeams(data);
  if (!Array.isArray(data.deleted)) data.deleted = [];
  // Records from before change tracking: mark them as changed so a first sync uploads them.
  for (const kind of RECORD_KINDS) {
    for (const r of data[kind]) {
      if (r.updatedAt == null) Object.assign(r, { updatedAt: 0, dirty: true });
    }
  }
  return data;
}

// Cloud sync bookkeeping, kept out of the records so it doesn't count as a change:
// who synced this phone, the server time of the last pull, the cloud teams with this user's
// role in each (a team is a cloud team iff it is here; its players and games are too), and
// teams being uploaded (not confirmed by the server yet). See "Cloud sync" below.
function emptySync() {
  return { userId: null, lastPulledAt: null, lastSyncAt: null, teams: {}, uploads: [] };
}
function normalizeSync(s) {
  const sync = { ...emptySync(), ...(s && typeof s === 'object' ? s : {}) };
  if (!sync.teams || typeof sync.teams !== 'object' || Array.isArray(sync.teams)) sync.teams = {};
  if (!Array.isArray(sync.uploads)) sync.uploads = [];
  return sync;
}

// Games keep a copy of their team's club and name (used in titles, the report and the PDF).
// Keep that copy in line with the team, so renaming a team updates its games too. Games
// whose team was deleted keep the names they had.
function syncGameTeams(data, teamId = null) {
  for (const g of data.games) {
    if (teamId && g.teamId !== teamId) continue;
    const tm = data.teams.find((x) => x.id === g.teamId);
    if (tm) Object.assign(g, { club: tm.club, team: tm.name });
  }
}

// ---------- Change tracking (groundwork for cloud sync) ----------
// Every save compares each team, player and game with how it was at the last save. A record
// that changed gets `updatedAt` (ms) and `dirty: true` ("not uploaded yet"); a record that
// disappeared leaves a tombstone in `db.deleted`, so a later sync can delete it elsewhere.
// The rest of the app just edits `db` and calls save(), as before.

const recordKey = ({ updatedAt, dirty, ...rest }) => JSON.stringify(rest);
const teamIdOf = (kind, r) => (kind === 'teams' ? r.id : r.teamId);
const isCloudTeam = (teamId) => !!(teamId && db.sync.teams[teamId]);
// Team of a record as it was at the last save (from its snapshot JSON).
function savedTeamId(kind, id, key) {
  if (kind === 'teams') return id;
  try { return JSON.parse(key).teamId ?? null; } catch { return null; }
}

function snapshotOf(data) {
  return Object.fromEntries(RECORD_KINDS.map((kind) => [kind, new Map(data[kind].map((r) => [r.id, recordKey(r)]))]));
}

let saved = snapshotOf(db);

function trackChanges(now = Date.now()) {
  const next = snapshotOf(db);
  for (const kind of RECORD_KINDS) {
    const before = saved[kind];
    const after = next[kind];
    const gone = [];
    for (const r of db[kind]) {
      const prev = before.get(r.id);
      if (prev === after.get(r.id)) continue;
      Object.assign(r, { updatedAt: now, dirty: true });
      // Moved from a cloud team to a team on this phone (a game's team was changed): delete it
      // from the cloud team. `moved` tombstones stay while the record is still local.
      // (teamIdOf, not r.teamId: a team record is its own team, so editing one never "moves" it.)
      const oldTeam = prev ? savedTeamId(kind, r.id, prev) : null;
      const newTeam = teamIdOf(kind, r);
      if (oldTeam && oldTeam !== newTeam && isCloudTeam(oldTeam) && !isCloudTeam(newTeam)) {
        gone.push({ kind, id: r.id, teamId: oldTeam, deletedAt: now, moved: true });
      }
    }
    // Tombstones remember the record's team, so sync knows whether (and where) to send them.
    for (const [id, key] of before) {
      if (!after.has(id)) gone.push({ kind, id, teamId: savedTeamId(kind, id, key), deletedAt: now });
    }
    // A record that is back (e.g. restored from a backup) is no longer deleted.
    const recs = new Map(db[kind].map((r) => [r.id, r]));
    db.deleted = db.deleted.filter((d) => d.kind !== kind || !recs.has(d.id)
      || (d.moved && !isCloudTeam(teamIdOf(kind, recs.get(d.id)))));
    db.deleted.push(...gone);
  }
  saved = next;
}

function save() {
  trackChanges();
  localStorage.setItem(STORE_KEY, JSON.stringify(db));
  requestPersistence();
  if (hasCloudChanges()) scheduleSync();
}

// Write the store without counting anything as a change: for data that came from (or was
// cleaned up for) the cloud, and for clearing `dirty` after an upload.
function saveQuiet() {
  localStorage.setItem(STORE_KEY, JSON.stringify(db));
  saved = snapshotOf(db);
}

// Ask the browser not to clear our storage when space runs low or the site isn't used for a
// while (Safari can otherwise remove website data after ~7 days without a visit). Asked once
// there is data to protect. `persisted` is null where the browser doesn't support it.
let persisted = null;
let persistAsked = false;
async function requestPersistence() {
  const st = navigator.storage;
  if (persistAsked || !st?.persist || !(db.teams.length || db.games.length)) return;
  persistAsked = true;
  try {
    persisted = (await st.persisted()) || (await st.persist());
  } catch {
    persisted = false;
  }
  if (route().view === 'profile') render();
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

// Score in the same order as matchTitle (home side first). With `colour`, our goals are
// wrapped in .us and theirs in .them (no colour on a draw).
function scoreHtml(g, d, sep = '–', colour = false) {
  const goals = (who) => {
    const n = who === 'us' ? d.us : d.them;
    return colour && d.us !== d.them ? `<span class="${who}">${n}</span>` : `${n}`;
  };
  return g.home === false ? `${goals('them')}${sep}${goals('us')}` : `${goals('us')}${sep}${goals('them')}`;
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

// Slot positions in % of the pitch (own goal at the bottom). The GK's `y` is a CSS length:
// a fixed distance from the bottom edge, so its name and minutes always fit inside the
// pitch however small the pitch gets (it shrinks with the screen height).
function slotCoords(formation) {
  const rows = formation.split('-').map(Number);
  const pts = [{ x: 50, y: 'calc(100% - 50px)' }];
  rows.forEach((n, r) => {
    const y = rows.length === 1 ? 52 : 70 - r * (54 / (rows.length - 1));
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
  renderPending = false;
  closeSheet();
  const { view, id } = route();
  const views = {
    games: viewGames, teams: viewTeams, players: viewTeams, team: viewTeam,
    new: viewEdit, edit: viewEdit, game: viewGame, report: viewReport, profile: viewProfile, admin: viewAdmin,
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
  admin: '<circle cx="8" cy="12" r="4"/><path d="M12 12h9M18 12v3M21 12v2"/>',
};

function renderTabbar(view) {
  const active = ['teams', 'team', 'players'].includes(view) ? 'team' : ['profile', 'admin'].includes(view) ? view : 'matches';
  const isAdmin = !!(cloud.session && cloud.account?.isAdmin && !cloud.needsPassword);
  const myTeam = db.teams.length === 1 ? `#/team/${db.teams[0].id}` : '#/teams';
  const icon = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${TAB_ICONS[k]}</svg>`;
  const tab = (k, label, attrs) => `<${attrs.startsWith('href') ? 'a' : 'button'} class="tab ${active === k ? 'on' : ''}" ${attrs}>${icon(k)}<span>${label}</span></${attrs.startsWith('href') ? 'a' : 'button'}>`;
  $('#tabbar').innerHTML =
    tab('team', t('tabTeam'), `href="${myTeam}"`) +
    tab('matches', t('tabMatches'), 'href="#/games"') +
    tab('stats', t('tabStats'), 'data-action="soon" data-v="tabStats"') +
    tab('profile', t('tabProfile'), 'href="#/profile"') +
    (isAdmin ? tab('admin', t('tabAdmin'), 'href="#/admin" data-admin-link') : '');
  $('#tabbar').classList.toggle('five', isAdmin);
}

window.addEventListener('hashchange', () => {
  draft = null;
  Object.assign(remote, { people: null, admin: null }); // online screens load again when opened
  render();
  window.scrollTo(0, 0);
});

// `menu` is optional HTML for the items of a ⋯ menu shown on the right of the bar; `extra` is
// shown right after the title (e.g. the "Read-only" pill).
function bar(title, back, menu = '', extra = '') {
  return `<header class="bar">${back ? `<a class="back" href="${back}" aria-label="${t('back')}">‹</a>` : ''}<h1>${title}</h1>${extra}${menu ? `
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
        ${title ? `<h3 id="dialog-title">${title}</h3>` : ''}
        ${message ? `<p ${title ? 'class="muted"' : 'id="dialog-title"'}>${message}</p>` : ''}
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

// A styled replacement for alert(): one message and an OK button. `message` is HTML.
const notify = (message, title = '') => askConfirm({ title, message, ok: t('ok'), cancel: false });

function notFound() {
  main.innerHTML = `${bar(t('notFound'), '#/games')}<p class="empty">${t('gameGone')}</p>`;
}

// ---------- Views: games list ----------

// Team shown on the games page, or '' for all (only when there's more than one team).
function gamesTeam() {
  const id = localStorage.getItem(GAMES_TEAM_KEY) || '';
  return db.teams.length > 1 && getTeam(id) ? id : '';
}

function viewGames() {
  const team = gamesTeam();
  const games = db.games.filter((g) => !team || g.teamId === team).sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));
  main.innerHTML = `
    ${bar('⚽ Fut Academy Stats')}
    <div class="row gap">
      <a class="btn primary grow" href="#/new">${t('newGame')}</a>
      <a class="btn" href="#/teams">${t('teamsBtn', { n: db.teams.length })}</a>
    </div>
    ${db.teams.length > 1 ? `<div class="pick-row filter" role="tablist">
      ${[['', t('allTeams')], ...db.teams.map((tm) => [tm.id, esc(teamLabel(tm))])].map(([id, label]) =>
        `<button class="pick ${id === team ? 'on' : ''}" role="tab" aria-selected="${id === team}" data-action="games-team" data-id="${id}">${label}</button>`).join('')}
    </div>` : ''}
    ${games.length
      ? `<ul class="list">${games.map(gameCard).join('')}</ul>`
      : `<p class="empty">${team ? t('noGamesTeam') : t('noGames')}</p>`}`;
}

// ---------- Cloud account (Supabase sign-in) ----------
// Sign-in is email + password; a code by email is used the first time and for a forgotten
// password, then the user chooses a password. Invite-only: the email gets a code only if the
// admin gave it an account; `shouldCreateUser: false` never creates users. Everything else in
// the app keeps working without signing in.

const ACCOUNT_KEY = 'fut-academy-stats.account'; // last known accounts row, for offline display
const CLOUD = window.FAS_CONFIG || {};
const sb = window.supabase?.createClient && CLOUD.supabaseUrl
  ? window.supabase.createClient(CLOUD.supabaseUrl, CLOUD.supabaseKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'fut-academy-stats.auth' },
  })
  : null;

const readJSON = (key) => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } };
// mode: 'signin' (email + password) | 'signup' (create account) | 'reset' (forgot password).
// signup and reset are 3 steps: email -> code by email -> choose a password. `step` is
// 'email' or 'code'; after the code the user is signed in and must choose a password
// (`needsPassword`, kept across reloads so closing the app doesn't skip it; SETPW_KEY holds the
// mode for the step title).
const SETPW_KEY = 'fut-academy-stats.setPassword';
const cloud = {
  session: null, account: readJSON(ACCOUNT_KEY), mode: 'signin', step: 'email', email: '', busy: false, error: '',
  needsPassword: !!localStorage.getItem(SETPW_KEY), pwMode: localStorage.getItem(SETPW_KEY) || 'signup', changingPassword: false,
};

// Re-render account screens; elsewhere just refresh the tab bar (the Admin tab follows the account).
const renderIfProfile = () => { if (['profile', 'admin'].includes(route().view)) render(); else renderTabbar(route().view); };

// Fetch this user's accounts row (kind, admin). Kept locally so Profile shows it offline.
async function refreshAccount() {
  const uid = cloud.session?.user?.id;
  if (!sb || !uid) return;
  const { data, error } = await sb.from('accounts').select('email, kind, is_admin').eq('user_id', uid).maybeSingle();
  if (error) return; // offline or transient: keep what we had
  cloud.account = data ? { email: data.email, kind: data.kind, isAdmin: data.is_admin } : { none: true };
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify(cloud.account));
  renderIfProfile();
}

if (sb) {
  sb.auth.getSession().then(({ data }) => {
    cloud.session = data.session;
    if (cloud.session) refreshAccount().finally(syncNow);
    renderIfProfile();
  });
  sb.auth.onAuthStateChange((event, session) => {
    cloud.session = session;
    if (!session) {
      cloud.account = null;
      localStorage.removeItem(ACCOUNT_KEY);
    }
    // Signed out (here or because the session ended): the cloud teams leave this phone, unless
    // changes are still waiting; those are kept until this user signs in again (another user
    // signing in removes them first, see syncOnce).
    if (event === 'SIGNED_OUT' && !pendingCount()) removeCloudData();
    // Supabase advises against calling it again from inside this callback.
    if (event === 'SIGNED_IN') setTimeout(() => refreshAccount().finally(syncNow));
    renderIfProfile();
  });
}

function authMessage(error) {
  const msg = `${error?.code || ''} ${error?.message || ''}`;
  if (!navigator.onLine || error?.name === 'AuthRetryableFetchError' || error?.status === 0) return t('authOffline');
  if (error?.status === 429 || /rate.?limit/i.test(msg)) return t('authRateLimit');
  if (/otp_disabled|signup_disabled|user_not_found|signups not allowed/i.test(msg)) return t('authNoAccess');
  if (/invalid_credentials|invalid login credentials/i.test(msg)) return t('authBadPassword');
  if (/same_password|should be different/i.test(msg)) return t('pwSame');
  if (/weak_password|password should|weak/i.test(msg)) return t('pwWeak');
  if (/otp_expired|invalid|expired/i.test(msg)) return t('authBadCode');
  if (error instanceof Error && !error.status && !error.code && !error.name?.startsWith('Auth')) return esc(error.message);
  return t('authFailed', { msg: esc(error?.message || error) });
}

async function cloudStep(fn) {
  cloud.busy = true;
  cloud.error = '';
  renderIfProfile();
  try {
    await fn();
  } catch (e) {
    cloud.error = authMessage(e);
  }
  cloud.busy = false;
  renderIfProfile();
}

const sendCode = (email) => cloudStep(async () => {
  const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
  if (error) throw error;
  Object.assign(cloud, { step: 'code', email });
});

const verifyCode = (token) => cloudStep(async () => {
  const { error } = await sb.auth.verifyOtp({ email: cloud.email, token, type: 'email' });
  if (error) throw error;
  // Signed in with a code: first time or forgotten password, so a password is chosen next.
  const pwMode = cloud.mode === 'reset' ? 'reset' : 'signup';
  localStorage.setItem(SETPW_KEY, pwMode);
  Object.assign(cloud, { mode: 'signin', step: 'email', needsPassword: true, pwMode });
});

const signInPassword = (email, password) => cloudStep(async () => {
  cloud.email = email; // kept if it fails (the form is drawn again), e.g. for "get a code"
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  Object.assign(cloud, { mode: 'signin', step: 'email', email: '' });
  toast(t('signedIn'));
});

// Supabase Auth stores only a bcrypt hash of the password (in auth.users); the app never keeps it.
const setPassword = (pw, pw2) => cloudStep(async () => {
  if (pw.length < 8) throw new Error(t('pwShort'));
  if (pw !== pw2) throw new Error(t('pwMismatch'));
  const { error } = await sb.auth.updateUser({ password: pw });
  if (error) throw error;
  const wasNew = cloud.needsPassword;
  localStorage.removeItem(SETPW_KEY);
  Object.assign(cloud, { needsPassword: false, changingPassword: false, email: '' });
  toast(wasNew ? t('signedIn') : t('pwSaved'));
  if (wasNew) setTimeout(syncNow); // sync was held back until the password was chosen
});

function setPasswordForm(busy, err, cancel) {
  const step3 = cloud.needsPassword;
  return `${step3 ? `<p class="step-label">${t('stepOf', { n: 3 })}</p>` : ''}
    <h3 class="sub-title">${step3 ? t('stepPassword') : t('changePassword')}</h3>
    <p class="hint">${t('setPwHint')}</p>
    <form class="form" data-form="set-password">
      <input type="email" name="username" autocomplete="username" value="${esc(cloud.session.user.email)}" hidden>
      <label>${t('newPassword')}<input name="password" type="password" required minlength="8" autocomplete="new-password"></label>
      <label>${t('repeatPassword')}<input name="password2" type="password" required minlength="8" autocomplete="new-password"></label>
      <button class="btn primary" ${busy}>${step3 && cloud.pwMode === 'signup' ? t('createAccount') : t('savePassword')}</button>
      ${cancel ? `<button type="button" class="btn ghost" data-action="cancel-password">${t('cancel')}</button>` : ''}
    </form>${err}`;
}

function accountSection() {
  return `${accountSectionBody()}<p class="hint"><button class="link-btn" data-action="privacy">${t('privacyLink')}</button></p>`;
}

function accountSectionBody() {
  const head = '';
  if (!sb) return `${head}<p class="hint">${t('cloudUnavailable')}</p>`;
  const err = cloud.error ? `<p class="hint warn" role="alert">${cloud.error}</p>` : '';
  const busy = cloud.busy ? 'disabled' : '';
  if (cloud.session && cloud.needsPassword) {
    // Step 3 of "Activate account" / "Reset your password": nothing else until it's done.
    return `${head}<section class="auth-steps">${cloud.pwMode === 'reset' ? `<p class="muted small">${t('resetTitle')}</p>` : ''}
      ${setPasswordForm(busy, err, false)}</section>`;
  }
  if (cloud.session) {
    const a = cloud.account;
    const kind = a && !a.none ? [a.isAdmin && t('acctAdmin'), t(a.kind === 'director' ? 'acctDirector' : 'acctCoach')].filter(Boolean).join(' · ') : '';
    return `${head}
      <ul class="list settings">
        <li class="item"><span class="grow"><strong>${esc(cloud.session.user.email)}</strong>${kind ? `<div class="muted small">${kind}</div>` : ''}</span>
          <button class="btn small ghost" data-action="sign-out">${t('signOut')}</button></li>
        ${canSync() ? `<li class="item"><span class="grow muted small" id="sync-status" aria-live="polite">${syncStatusText()}</span>
          <button class="btn small ghost" data-action="sync-now">${t('syncNow')}</button></li>` : ''}
      </ul>
      ${a?.none ? `<p class="hint warn">${t('acctNone')}</p>` : ''}
      ${cloud.changingPassword ? setPasswordForm(busy, err, true)
        : `${err}<button class="btn small ghost" data-action="change-password">${t('changePassword')}</button>`}`;
  }
  const tabs = cloud.mode === 'reset' ? '' : `<div class="seg big auth-tabs" role="tablist">
      <button role="tab" class="${cloud.mode === 'signin' ? 'on' : ''}" aria-selected="${cloud.mode === 'signin'}" data-action="auth-mode" data-v="signin" ${busy}>${t('tabSignIn')}</button>
      <button role="tab" class="${cloud.mode === 'signup' ? 'on' : ''}" aria-selected="${cloud.mode === 'signup'}" data-action="auth-mode" data-v="signup" ${busy}>${t('tabSignUp')}</button>
    </div>`;
  if (cloud.mode === 'signin') {
    return `${head}${tabs}
      <p class="hint">${t('accountHint')}</p>
      <form class="form" data-form="signin-password">
        <label>${t('email')}<input name="email" type="email" required autocomplete="username" inputmode="email" value="${esc(cloud.email)}"></label>
        <label>${t('password')}<input name="password" type="password" required autocomplete="current-password"></label>
        <button class="btn primary" ${busy}>${t('signInPw')}</button>
      </form>
      ${err}
      <p class="hint"><button class="link-btn" data-action="auth-mode" data-v="reset" ${busy}>${t('forgotPassword')}</button></p>`;
  }
  // signup / reset: step 1 (email) or step 2 (code)
  const title = cloud.mode === 'reset' ? `<h3 class="sub-title">${t('resetTitle')}</h3>` : '';
  const intro = cloud.mode === 'reset' ? t('resetIntro') : t('signUpIntro');
  const back = cloud.mode === 'reset' ? `<p class="hint"><button class="link-btn" data-action="auth-mode" data-v="signin" ${busy}>${t('backToSignIn')}</button></p>` : '';
  if (cloud.step === 'code') {
    return `${head}${tabs}<section class="auth-steps">${title}
      <p class="step-label">${t('stepOf', { n: 2 })}</p>
      <p class="hint">${t('codeSent', { email: `<b>${esc(cloud.email)}</b>` })}</p>
      <form class="form" data-form="signin-code">
        <label>${t('stepCode')}<input name="code" required inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6,10}" maxlength="10"></label>
        <button class="btn primary" ${busy}>${t('confirmCode')}</button>
      </form>
      ${err}
      <div class="row gap wrap signin-links">
        <button class="btn small ghost" data-action="signin-back" ${busy}>${t('otherEmail')}</button>
        <button class="btn small ghost" data-action="signin-resend" ${busy}>${t('resendCode')}</button>
      </div></section>${back}`;
  }
  return `${head}${tabs}<section class="auth-steps">${title}
    ${intro ? `<p class="hint">${intro}</p>` : ''}
    <p class="step-label">${t('stepOf', { n: 1 })}</p>
    <form class="form" data-form="signin-email">
      <label>${t('stepEmail')}<input name="email" type="email" required autocomplete="email" inputmode="email" value="${esc(cloud.email)}"></label>
      <button class="btn primary" ${busy}>${t('sendCode')}</button>
    </form>
    ${err}</section>${back}`;
}

// ---------- Cloud sync ----------
// Local-first: the app keeps reading and writing `db` + save(). In the background, syncNow()
// uploads the changes of cloud teams (push), then downloads what changed in the cloud (pull).
// Only cloud teams (in db.sync.teams) and their players and games are synced; teams on this
// phone never leave it. Failures only show in the quiet status line on Profile.
//  * push (teams where this user is director): upsert `dirty` records, then soft-delete the
//    records in `db.deleted` (deleted_at). `dirty` is cleared only if the record didn't change
//    while it was being sent.
//  * pull: memberships first (teams this user was removed from leave the phone), then rows
//    changed since the last pull (with some overlap). Local changes not uploaded yet win over
//    the cloud for directors; for coaches the cloud always wins.
//  * Last write wins per record (a live game logged on two phones at once overwrites itself).

const PAGE = 1000;
const PUSH_BATCH = 100;
const PULL_OVERLAP_MS = 10000; // rows can commit with a slightly older updated_at
const COLUMNS = {
  teams: 'id, club, name, updated_at, deleted_at',
  players: 'id, team_id, number, name, full_name, updated_at, deleted_at',
  games: 'id, team_id, data, updated_at, deleted_at',
};
const validDate = (s) => (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) ? s : null);
// App record -> database row. deleted_at: null, so uploading a record again undeletes it.
const toRow = {
  teams: (r) => ({ id: r.id, club: r.club || '', name: r.name || '', deleted_at: null }),
  players: (r) => ({ id: r.id, team_id: r.teamId, number: String(r.number ?? ''), name: r.name || '', full_name: r.fullName || '', deleted_at: null }),
  games: ({ updatedAt, dirty, ...g }) => ({ id: g.id, team_id: g.teamId, date: validDate(g.date), status: g.status ?? null, data: g, deleted_at: null }),
};
// Database row -> app record (the app stores shirt numbers as text too).
const fromRow = {
  teams: (row) => ({ id: row.id, club: row.club ?? '', name: row.name ?? '' }),
  players: (row) => ({ id: row.id, teamId: row.team_id, number: row.number ?? '', name: row.name ?? '', fullName: row.full_name ?? '' }),
  games: (row) => ({ ...row.data, id: row.id, teamId: row.team_id }),
};
// Key-order-independent JSON (jsonb doesn't keep key order), without the sync fields.
const canon = (v) => (Array.isArray(v) ? `[${v.map(canon).join(',')}]`
  : v && typeof v === 'object' ? `{${Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${canon(v[k])}`).join(',')}}`
    : JSON.stringify(v));
const sameRecord = (a, b) => canon({ ...a, updatedAt: undefined, dirty: undefined }) === canon({ ...b, updatedAt: undefined, dirty: undefined });

const roleOf = (teamId) => db.sync.teams[teamId] || null;
const canSync = () => !!(sb && cloud.session && cloud.account && !cloud.account.none && !cloud.needsPassword);
const canUpload = () => canSync() && (cloud.account.kind === 'director' || cloud.account.isAdmin);
const localTeams = () => db.teams.filter((tm) => !isCloudTeam(tm.id));
const pushable = (kind, r) => r.dirty && roleOf(teamIdOf(kind, r)) === 'director';
const hasCloudChanges = () => RECORD_KINDS.some((kind) => db[kind].some((r) => r.dirty && isCloudTeam(teamIdOf(kind, r))))
  || db.deleted.some((d) => isCloudTeam(d.teamId));
// Changes this phone still has to upload.
const pendingCount = () => RECORD_KINDS.reduce((n, kind) => n + db[kind].filter((r) => pushable(kind, r)).length, 0)
  + db.deleted.filter((d) => roleOf(d.teamId) === 'director').length;

const syncState = { status: 'idle', error: '' }; // status: idle | running | ok | offline | failed
const forceFull = new Set(); // teams to download in full on the next pull (role changed, refused)
let syncRun = null;
let syncAgain = false;
let syncEpoch = 0; // bumped when the cloud data is removed, so a sync in flight drops its results
let syncTimer = null;
let offerUploadAfterSync = false;

class SyncError extends Error {
  constructor(error, status) {
    super(error?.message || String(error));
    this.code = error?.code;
    this.status = status ?? error?.status;
  }
}
const isOffline = (e) => e?.status === 0 || !navigator.onLine || /fetch|network/i.test(e?.message || '');
const ABORTED = new Error('sync aborted');
const checkEpoch = (epoch) => { if (epoch !== syncEpoch) throw ABORTED; };

// Remove teams (and their players, games and pending deletes) from this phone, without
// leaving tombstones: they are only gone from here, not from the cloud.
function removeTeamsLocally(ids) {
  const gone = new Set(ids);
  for (const kind of RECORD_KINDS) db[kind] = db[kind].filter((r) => !gone.has(teamIdOf(kind, r)));
  db.deleted = db.deleted.filter((d) => !gone.has(d.teamId));
  for (const id of gone) delete db.sync.teams[id];
  db.sync.uploads = db.sync.uploads.filter((id) => !gone.has(id));
}

// Signing out or another user signing in: cloud teams leave the phone, local teams stay.
function removeCloudData() {
  syncEpoch++;
  clearTimeout(syncTimer);
  forceFull.clear();
  removeTeamsLocally(Object.keys(db.sync.teams));
  db.sync = emptySync();
  Object.assign(syncState, { status: 'idle', error: '' });
  saveQuiet();
  renderSoon();
}

function scheduleSync(ms = 3000) {
  clearTimeout(syncTimer);
  if (canSync()) syncTimer = setTimeout(syncNow, ms);
}

// Single flight: a call while a sync runs makes it run once more afterwards.
function syncNow() {
  // Signed in but the account row couldn't be loaded yet (offline at start): load it first.
  if (sb && cloud.session && !cloud.account) return refreshAccount().then(() => (cloud.account ? syncNow() : undefined));
  if (!canSync()) return Promise.resolve();
  if (syncRun) {
    syncAgain = true;
    return syncRun;
  }
  syncRun = (async () => {
    do {
      syncAgain = false;
      await syncOnce();
    } while (syncAgain && canSync());
  })().finally(() => { syncRun = null; });
  return syncRun;
}

async function syncOnce() {
  clearTimeout(syncTimer);
  const userId = cloud.session.user.id;
  if (db.sync.userId && db.sync.userId !== userId) removeCloudData(); // another person, same phone
  const first = !db.sync.userId;
  if (first) {
    db.sync.userId = userId;
    saveQuiet();
    offerUploadAfterSync = true;
  }
  const epoch = syncEpoch;
  Object.assign(syncState, { status: 'running' });
  showSyncStatus();
  try {
    const pushed = await push(epoch);
    await pull(epoch, userId);
    db.sync.lastSyncAt = Date.now();
    syncState.status = pushed ? 'ok' : 'failed';
  } catch (e) {
    if (e === ABORTED) return;
    syncState.status = isOffline(e) ? 'offline' : 'failed';
    console.warn('Sync failed', e);
  } finally {
    if (epoch === syncEpoch) saveQuiet();
    showSyncStatus();
  }
  // The team screen was waiting for its upload to show People.
  const ppl = remote.people;
  if (ppl?.status === 'uploading' && !db.sync.uploads.includes(ppl.teamId) && isCloudTeam(ppl.teamId)) loadPeople(ppl.teamId);
  if (offerUploadAfterSync && syncState.status === 'ok') {
    offerUploadAfterSync = false;
    if (canUpload() && localTeams().length) offerUpload();
  }
}

// Returns false if some upload failed for a reason other than the network (it's retried later).
async function push(epoch) {
  const refused = new Set(); // teams the server refused this time
  let ok = true;
  for (const kind of RECORD_KINDS) {
    const byTeam = new Map();
    for (const r of db[kind]) {
      if (!pushable(kind, r)) continue;
      const tid = teamIdOf(kind, r);
      if (!byTeam.has(tid)) byTeam.set(tid, []);
      byTeam.get(tid).push(r);
    }
    for (const [tid, recs] of byTeam) {
      for (let i = 0; i < recs.length && !refused.has(tid); i += PUSH_BATCH) {
        const batch = recs.slice(i, i + PUSH_BATCH);
        const keys = batch.map(recordKey);
        const { error, status } = await sb.from(kind).upsert(batch.map(toRow[kind]), { onConflict: 'id' });
        checkEpoch(epoch);
        if (error) {
          const e = new SyncError(error, status);
          if (isOffline(e)) throw e;
          refused.add(tid);
          if (e.code === '42501') pushRefused(tid);
          else ok = false;
          console.warn('Sync: upload refused', kind, tid, e);
          continue;
        }
        // Edits made while the request was on its way stay dirty for the next push.
        batch.forEach((r, j) => { if (recordKey(r) === keys[j]) r.dirty = false; });
        if (kind === 'teams') db.sync.uploads = db.sync.uploads.filter((id) => id !== tid);
        saveQuiet();
      }
    }
  }

  // Deletes. Those of teams on this phone (or where this user is a coach) are never sent.
  const toSend = [];
  for (const d of db.deleted) {
    const role = roleOf(d.teamId);
    if (role === 'director' && !refused.has(d.teamId)) toSend.push(d);
    else if (role === 'coach') forceFull.add(d.teamId); // get the deleted record back
  }
  db.deleted = db.deleted.filter((d) => toSend.includes(d) || (refused.has(d.teamId) && roleOf(d.teamId) === 'director'));
  for (const kind of RECORD_KINDS) {
    const ds = toSend.filter((d) => d.kind === kind);
    for (let i = 0; i < ds.length; i += PUSH_BATCH) {
      const batch = ds.slice(i, i + PUSH_BATCH);
      const { error, status } = await sb.from(kind).update({ deleted_at: new Date().toISOString() }).in('id', batch.map((d) => d.id));
      checkEpoch(epoch);
      if (error) throw new SyncError(error, status);
      db.deleted = db.deleted.filter((d) => !batch.includes(d));
      saveQuiet();
    }
  }
  return ok;
}

// The server refused an upload for a team (RLS, error 42501). A team being uploaded wasn't
// allowed (e.g. its id belongs to someone else's team): it goes back to being a local team.
// Otherwise this user probably isn't a director any more: drop the changes so the cloud wins,
// and download the team in full on the pull that follows (which also refreshes the role).
function pushRefused(tid) {
  if (db.sync.uploads.includes(tid)) {
    delete db.sync.teams[tid];
    db.sync.uploads = db.sync.uploads.filter((id) => id !== tid);
    syncState.error = t('syncUploadFailed');
  } else {
    for (const kind of RECORD_KINDS) for (const r of db[kind]) if (teamIdOf(kind, r) === tid) r.dirty = false;
    db.deleted = db.deleted.filter((d) => d.teamId !== tid);
    forceFull.add(tid);
  }
  saveQuiet();
  renderSoon();
}

// All rows of `kind` for these teams, changed after `since` (all rows when null), oldest first.
async function fetchRows(kind, teamIds, since, epoch) {
  if (!teamIds.length) return [];
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    let q = sb.from(kind).select(COLUMNS[kind]).in(kind === 'teams' ? 'id' : 'team_id', teamIds);
    if (since) q = q.gt('updated_at', since);
    const { data, error, status } = await q.order('updated_at').order('id').range(from, from + PAGE - 1);
    checkEpoch(epoch);
    if (error) throw new SyncError(error, status);
    rows.push(...data);
    if (data.length < PAGE) return rows;
  }
}

async function pull(epoch, userId) {
  const { data: members, error, status } = await sb.from('team_members').select('team_id, role').eq('user_id', userId);
  checkEpoch(epoch);
  if (error) throw new SyncError(error, status);
  const prev = db.sync.teams;
  const teams = Object.fromEntries(members.map((m) => [m.team_id, m.role]));
  // Teams still being uploaded aren't in the cloud yet: keep them.
  for (const id of db.sync.uploads) if (prev[id] && !teams[id]) teams[id] = prev[id];
  const ids = Object.keys(teams);
  // Download in full: new teams, teams whose role changed, refused ones, and coach teams with
  // local edits (so the cloud version comes back).
  const full = new Set(ids.filter((id) => !prev[id] || prev[id] !== teams[id] || forceFull.has(id)
    || (teams[id] === 'coach' && RECORD_KINDS.some((kind) => db[kind].some((r) => r.dirty && teamIdOf(kind, r) === id)))));
  const since = db.sync.lastPulledAt ? new Date(Date.parse(db.sync.lastPulledAt) - PULL_OVERLAP_MS).toISOString() : null;
  const rows = {};
  for (const kind of RECORD_KINDS) {
    rows[kind] = [
      ...await fetchRows(kind, ids.filter((id) => !full.has(id)), since, epoch),
      ...await fetchRows(kind, [...full], null, epoch),
    ];
  }

  // Everything is downloaded: apply it in one go (no awaits from here on).
  let changed = false;
  const removed = Object.keys(prev).filter((id) => !teams[id]);
  if (removed.length) {
    // Removed from these teams. Changes not uploaded yet for them are lost (a director removed
    // while offline with pending edits).
    removeTeamsLocally(removed);
    changed = true;
  }
  if (ids.some((id) => prev[id] !== teams[id])) changed = true;
  db.sync.teams = teams;
  for (const id of full) forceFull.delete(id);

  let latest = db.sync.lastPulledAt;
  for (const kind of RECORD_KINDS) {
    const index = new Map(db[kind].map((r, i) => [r.id, i]));
    const seen = new Set();
    const drop = new Set();
    for (const row of rows[kind]) {
      if (!latest || Date.parse(row.updated_at) > Date.parse(latest)) latest = row.updated_at;
      const tid = kind === 'teams' ? row.id : row.team_id;
      if (!teams[tid]) continue;
      seen.add(row.id);
      const i = index.get(row.id);
      const local = i == null ? null : db[kind][i];
      // A record moved to a team on this phone is no longer the cloud's.
      if (local && !isCloudTeam(teamIdOf(kind, local))) continue;
      if (row.deleted_at) {
        if (local) drop.add(row.id);
        // A deleted team takes its (normally already deleted) players with it.
        if (kind === 'teams') db.players = db.players.filter((p) => p.teamId !== row.id);
        continue;
      }
      if (local?.dirty && teams[teamIdOf(kind, local)] === 'director') continue; // will be uploaded
      const rec = { ...fromRow[kind](row), updatedAt: Date.parse(row.updated_at), dirty: false };
      if (local && sameRecord(local, rec)) {
        Object.assign(local, { dirty: false, updatedAt: rec.updatedAt });
        continue;
      }
      if (local) db[kind][i] = rec;
      else {
        index.set(rec.id, db[kind].length);
        db[kind].push(rec);
      }
      changed = true;
    }
    // Teams downloaded in full: what the cloud doesn't have isn't theirs (except changes a
    // director hasn't uploaded yet).
    for (const r of db[kind]) {
      const tid = teamIdOf(kind, r);
      if (full.has(tid) && !seen.has(r.id) && !(r.dirty && teams[tid] === 'director')) drop.add(r.id);
    }
    if (drop.size) {
      db[kind] = db[kind].filter((r) => !drop.has(r.id));
      changed = true;
    }
  }
  db.sync.lastPulledAt = latest;
  saveQuiet();
  if (changed) renderSoon();
}

// Upload teams from this phone: they become cloud teams with this user as director.
function uploadTeams(ids) {
  syncState.error = ''; // a previous upload's error (it stays until the next upload)
  for (const id of ids) {
    if (!getTeam(id) || isCloudTeam(id)) continue;
    db.sync.teams[id] = 'director';
    if (!db.sync.uploads.includes(id)) db.sync.uploads.push(id);
    for (const kind of RECORD_KINDS) for (const r of db[kind]) if (teamIdOf(kind, r) === id) r.dirty = true;
  }
  saveQuiet();
  toast(t('uploading'));
  render();
  syncNow();
}

// After the first sign-in on this phone (director accounts): which local teams to upload?
function offerUpload() {
  if (!$('#sheet').hidden || document.querySelector('.dialog')) return;
  openSheet(`
    <h3>${t('uploadTitle')}</h3>
    <p class="hint">${t('uploadHint')}</p>
    <form class="form" data-form="upload-teams">
      <div class="check-list">${localTeams().map((tm) => `
        <label class="check"><input type="checkbox" name="team" value="${esc(tm.id)}" checked>
          <span class="grow"><strong>${esc(teamLabel(tm))}</strong>${tm.club && tm.name ? `<span class="muted small"> · ${esc(tm.club)}</span>` : ''}
          <span class="muted small sub-line">${t('playersCount', { n: teamPlayers(tm.id).length })}</span></span></label>`).join('')}
      </div>
      <button class="btn primary block">${t('uploadSelected')}</button>
      <button type="button" class="btn ghost block" data-action="close-sheet">${t('notNow')}</button>
    </form>`);
}

// "Synced" / "On this phone" pill for a team ("On this phone" only matters when signed in).
function teamBadge(tm) {
  if (isCloudTeam(tm.id)) return `<span class="badge cloud">${t('badgeCloud')}</span>`;
  return canSync() ? `<span class="badge">${t('badgeLocal')}</span>` : '';
}

function agoText(ms) {
  const min = Math.floor((Date.now() - ms) / 60000);
  if (min < 1) return t('agoNow');
  if (min < 60) return t('agoMin', { n: min });
  if (min < 24 * 60) return t('agoHour', { n: Math.floor(min / 60) });
  return new Date(ms).toLocaleDateString(locale(), { day: 'numeric', month: 'short' });
}

const plural = (key, n) => t(n === 1 ? `${key}1` : key, { n });

function syncStatusText() {
  const n = pendingCount();
  const { status, error } = syncState;
  let s;
  if (status === 'running') s = t('syncing');
  else if (status === 'offline') s = n ? plural('syncWaitingOffline', n) : t('syncOffline');
  else if (status === 'failed') s = t('syncFailed');
  else if (db.sync.lastSyncAt) s = t('syncedAgo', { ago: agoText(db.sync.lastSyncAt) }) + (n ? ` · ${plural('syncWaiting', n)}` : '');
  else s = n ? plural('syncWaiting', n) : t('syncNever');
  return error ? `${s}<br>${esc(error)}` : s;
}

// Update the status line in place (no re-render, so nothing being typed is disturbed).
function showSyncStatus() {
  const el = document.getElementById('sync-status');
  if (el) el.innerHTML = syncStatusText();
}

// Re-render after a sync changed the data, but not while the user is in the middle of
// something (typing, a sheet or dialog open, a ⋯ menu, dragging a player): then later.
let renderPending = false;
function canRenderNow() {
  const a = document.activeElement;
  return $('#sheet').hidden && !document.querySelector('.dialog') && !document.querySelector('.menu-list:not([hidden])')
    && !(a && a.matches('input, textarea, select')) && !drag.active && !drag.timer;
}
function renderSoon() {
  if (canRenderNow()) render();
  else renderPending = true;
}
setInterval(() => { if (renderPending && canRenderNow()) render(); }, 1500);

// When to sync: coming back to the app, the network returning, and every minute while open.
document.addEventListener('visibilitychange', () => { if (!document.hidden) syncNow(); });
window.addEventListener('online', () => syncNow());
setInterval(() => {
  if (document.hidden || !canSync()) return;
  syncNow();
  showSyncStatus();
}, 60000);

// ---------- Team access: read-only coach view ----------
// In a cloud team where this user's role is 'coach' everything is read-only: the views hide the
// edit controls, and the click / submit / input handlers and dragging refuse anything that would
// change data (the database refuses those writes anyway). Teams on this phone are never
// read-only.

const readOnlyTeam = (teamId) => roleOf(teamId) === 'coach';
const readOnlyGame = (g) => !!g && readOnlyTeam(g.teamId);
// Teams this user may create games in / move games to.
const writableTeams = () => db.teams.filter((tm) => !readOnlyTeam(tm.id));

// Is the screen being shown (and its sheets) about a read-only team or game?
function viewReadOnly() {
  const { view, id } = route();
  if (view === 'team') return readOnlyTeam(id);
  if (view === 'game' || view === 'report' || view === 'edit') return readOnlyGame(getGame(id));
  if (view === 'new') return !!draft && readOnlyTeam(draft.teamId);
  return false;
}

// Actions allowed on a read-only screen. Everything else is refused there: delete-team,
// edit-player, delete-player, upload-team, remove-coach, sel, set-gk, set-home, save-game,
// kickoff, resume, end-period, next-period, do-sub, goal, yellow, red, make-gk, formation,
// set-formation, opp-goal, fix-open, fix-end, fix-started, fix-apply, edit-goal, set-scorer,
// delete-goal, undo-toast, undo, edit-info, delete-game (and any action added later, until it is
// listed here). The admin-* actions are only on the Admin page, which is never read-only.
const READ_ONLY_OK = new Set([
  'close-sheet', 'menu-toggle', 'games-team', 'soon', // navigation
  'theme', 'lang', 'backup', // settings
  'signin-back', 'signin-resend', 'sign-out', 'sync-now', 'privacy', // account and sync
  'auth-mode', 'change-password', 'cancel-password', 'profile-section',
  'pdf', // share the report
  'player', // opens a read-only info sheet for coaches (see actions.player)
  'people-reload', 'leave-team', // People section (anyone may leave a team)
  'new-team', // creates a team of their own
]);
// Forms allowed on a read-only screen (others: add-player, edit-player, add-player-draft, game-info).
const READ_ONLY_FORMS = new Set(['signin-email', 'signin-code', 'signin-password', 'set-password', 'upload-teams']);

const refuseReadOnly = () => toast(t('readOnlyToast'));
const readOnlyPill = () => `<span class="badge ro">${t('readOnly')}</span>`;

// Tap on a player in a read-only game: who it is and how they're doing, no actions.
function openPlayerInfo(g, id) {
  const d = derive(g);
  const s = d.stats[id];
  const bits = [s.goals && `⚽ ${s.goals}`, s.yellow && `🟨 ${s.yellow}`, s.red && `🟥 ${s.red}`].filter(Boolean).join(' · ');
  openSheet(`
    <div class="sheet-head">
      <h3>${esc(pname(g, id))}${id === d.gk ? gkTag() : ''}</h3>
      <span class="muted small">${d.on.has(id) ? t('onPitch') : t('benchState')} · ${t('played', { t: fmtMins(s.played) })}</span>
    </div>
    ${bits ? `<p>${bits}</p>` : ''}
    <p class="hint">${readOnlyPill()} ${t('readOnlyHint')}</p>
    <button class="btn ghost block" data-action="close-sheet">${t('ok')}</button>`);
}

// ---------- Team access: people of a team, admin page (online only) ----------
// These screens read and change team_members / accounts directly (RLS decides what is allowed)
// and the `admin` Edge Function for creating and removing accounts. Nothing is cached on the
// phone: offline they show "Needs internet".

const remote = { people: null, admin: null }; // reset when the route changes

// Run a supabase-js query; throw its error (with HTTP status) instead of returning it.
async function q(query) {
  const { data, error, status } = await query;
  if (error) throw new SyncError(error, status);
  return data;
}

function accessError(e) {
  if (isOffline(e)) return t('needsInternet');
  if (e.code === '23514' || /at least one director/i.test(e.message)) return t('lastDirector');
  if (e.code === '42501') return t('notAllowed');
  return t('actionFailed', { msg: esc(e.message) });
}

const roleLabel = (role) => t(role === 'director' ? 'roleDirector' : 'roleCoach');
const kindLabel = (kind) => t(kind === 'director' ? 'acctDirector' : 'acctCoach');
const myId = () => cloud.session?.user?.id;

const OFFLINE = Object.assign(new Error('offline'), { status: 0 });

// Members of a team with their emails (teammates' accounts are visible through RLS).
async function fetchMembers(teamIds) {
  if (!navigator.onLine) throw OFFLINE; // don't wait for the request to time out
  const rows = await q(sb.from('team_members').select('team_id, user_id, role').in('team_id', teamIds));
  const ids = [...new Set(rows.map((r) => r.user_id))];
  const accts = ids.length ? await q(sb.from('accounts').select('user_id, email').in('user_id', ids)) : [];
  const email = new Map(accts.map((a) => [a.user_id, a.email]));
  return rows.map((r) => ({ ...r, email: email.get(r.user_id) || '?' }))
    .sort((a, b) => (a.role === b.role ? 0 : a.role === 'director' ? -1 : 1) || a.email.localeCompare(b.email));
}

async function loadPeople(teamId) {
  const prev = remote.people;
  const st = { teamId, status: 'loading', members: [], msg: prev?.teamId === teamId ? prev.msg : null };
  remote.people = st;
  showPeople();
  try {
    st.members = await fetchMembers([teamId]);
    st.status = 'ok';
  } catch (e) {
    st.status = isOffline(e) ? 'offline' : 'error';
    console.warn('People: load failed', e);
  }
  if (remote.people === st) showPeople();
}

// People section of a cloud team's screen (filled in place, so it never disturbs typing).
function peopleHtml(teamId) {
  const st = remote.people?.teamId === teamId ? remote.people : null;
  if (!canSync()) return `<p class="hint">${t('peopleSignIn')}</p>`;
  if (!st || st.status === 'loading') return `<p class="hint">${t('loading')}</p>`;
  if (st.status === 'uploading') return `<p class="hint">${t('uploading')}</p>`;
  if (st.status !== 'ok') {
    return `<p class="hint warn">${t('needsInternet')}</p>
      <button class="btn small ghost" data-action="people-reload">${t('tryAgain')}</button>`;
  }
  const me = myId();
  const director = roleOf(teamId) === 'director';
  const msg = st.msg ? `<p class="hint ${st.msg.ok ? 'ok' : 'warn'}" role="status">${st.msg.text}</p>` : '';
  return `
    <ul class="list people">${st.members.map((m) => `
      <li class="item">
        <span class="grow"><span class="email">${esc(m.email)}</span>${m.user_id === me ? ` <span class="muted small">(${t('you')})</span>` : ''}</span>
        <span class="badge ${m.role === 'director' ? 'cloud' : ''}">${roleLabel(m.role)}</span>
        ${director && m.role === 'coach' && m.user_id !== me
          ? `<button class="btn small ghost danger" data-action="remove-coach" data-id="${esc(m.user_id)}" aria-label="${t('removeFromTeam')}">✕</button>` : ''}
      </li>`).join('')}</ul>
    ${director ? `<form class="form add-coach" data-form="add-coach">
      <label>${t('addCoachEmail')}<input name="email" type="email" required autocomplete="off" inputmode="email"></label>
      <button class="btn">${t('addCoach')}</button>
    </form>
    <p class="hint">${t('addCoachHint')}</p>` : ''}
    ${msg}
    <button class="btn ghost danger small" data-action="leave-team">${t('leaveTeam')}</button>`;
}

function showPeople() {
  const el = document.getElementById('people');
  if (el && remote.people && route().view === 'team' && route().id === remote.people.teamId) el.innerHTML = peopleHtml(remote.people.teamId);
}

function setPeopleMsg(text, ok) {
  if (remote.people) remote.people.msg = { text, ok };
  showPeople();
}

async function addCoach(teamId, email) {
  try {
    const r = await q(sb.rpc('add_team_coach', { _team_id: teamId, _email: email }));
    const e = `<b>${esc(email)}</b>`;
    if (r === 'added') setPeopleMsg(t('coachAdded', { email: e }), true);
    else if (r === 'already_member') setPeopleMsg(t('coachAlready', { email: e }), true);
    else setPeopleMsg(t('coachNoAccount'), false);
  } catch (e) {
    return setPeopleMsg(accessError(e), false);
  }
  loadPeople(teamId);
}

// Delete a membership; RLS skips rows it doesn't allow silently, so check something was deleted.
async function deleteMember(teamId, userId) {
  const rows = await q(sb.from('team_members').delete().eq('team_id', teamId).eq('user_id', userId).select('user_id'));
  if (!rows.length) throw Object.assign(new Error('not allowed'), { code: '42501' });
}

// ---------- Admin page ----------

// Call the `admin` Edge Function. Errors come back as { error: code, message } with a status.
async function adminCall(body) {
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

function adminError(e) {
  if (isOffline(e)) return t('needsInternet');
  if (e.code === 'exists') return t('errExists');
  if (e.code === 'invalid_email') return t('errEmail');
  if (e.code === 'not_admin') return t('errNotAdmin');
  if (e.code === 'self') return t('errSelf');
  if (e.code === 'is_admin') return t('errIsAdmin');
  if (e.status === 401) return t('errSession', { msg: esc(e.message) });
  return accessError(e);
}

async function loadAdmin() {
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
  if (remote.admin === st && route().view === 'admin') renderSoon();
}

// An admin change: run it, say how it went, reload the page's data. Membership changes may be
// about this user's own teams, so sync too.
async function adminDo(fn, okText, sync = false) {
  try {
    await fn();
    if (okText) toast(okText);
  } catch (e) {
    notify(adminError(e));
  }
  await loadAdmin();
  if (sync) syncNow();
}

function viewAdmin() {
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
  else if (st.status !== 'ok') body = `<p class="hint warn">${t('needsInternet')}</p><button class="btn small ghost" data-action="admin-reload">${t('tryAgain')}</button>`;
  else {
    const email = new Map(st.accounts.map((a) => [a.user_id, a.email]));
    const teamsOf = (uid) => st.members.filter((m) => m.user_id === uid).length;
    const kindSelect = (a) => `<select class="mini" data-change="admin-kind" data-id="${esc(a.user_id)}" aria-label="${t('accountKind')}">
      ${['director', 'coach'].map((k) => `<option value="${k}" ${a.kind === k ? 'selected' : ''}>${kindLabel(k)}</option>`).join('')}</select>`;
    const accounts = `
      <h2>${t('accounts')} <span class="muted small">${st.accounts.length}</span></h2>
      <ul class="list admin-accounts">${st.accounts.map((a) => `
        <li class="item wrap">
          <span class="grow"><span class="email">${esc(a.email)}</span>${a.user_id === me ? ` <span class="muted small">(${t('you')})</span>` : ''}
            <div class="muted small">${a.is_admin ? `${t('acctAdmin')} · ` : ''}${plural('teamsN', teamsOf(a.user_id))}</div></span>
          ${a.user_id === me || a.is_admin ? `<span class="muted small">${kindLabel(a.kind)}</span>` : `${kindSelect(a)}
          <button class="btn small ghost danger" data-action="admin-remove-account" data-id="${esc(a.user_id)}" aria-label="${t('removeAccess')}">✕</button>`}
        </li>`).join('')}</ul>`;
    const roleSelect = (m) => `<select class="mini" data-change="admin-role" data-tid="${esc(m.team_id)}" data-id="${esc(m.user_id)}" aria-label="${t('roleDirector')} / ${t('roleCoach')}">
      ${['director', 'coach'].map((r) => `<option value="${r}" ${m.role === r ? 'selected' : ''}>${roleLabel(r)}</option>`).join('')}</select>`;
    const teams = st.teams.map((tm) => {
      const ms = st.members.filter((m) => m.team_id === tm.id)
        .map((m) => ({ ...m, email: email.get(m.user_id) || '?' }))
        .sort((a, b) => (a.role === b.role ? 0 : a.role === 'director' ? -1 : 1) || a.email.localeCompare(b.email));
      const others = st.accounts.filter((a) => !ms.some((m) => m.user_id === a.user_id));
      return `<li class="card admin-team">
        <div class="row gap"><strong class="grow">${esc(teamLabel(tm))}${tm.club && tm.name ? ` <span class="muted small">· ${esc(tm.club)}</span>` : ''}</strong>
          ${ms.some((m) => m.role === 'director') ? '' : `<span class="badge warn">${t('noDirector')}</span>`}</div>
        ${ms.length ? `<ul class="members">${ms.map((m) => `
          <li class="row gap"><span class="grow email">${esc(m.email)}</span>${roleSelect(m)}
            <button class="btn small ghost danger" data-action="admin-remove-member" data-tid="${esc(m.team_id)}" data-id="${esc(m.user_id)}" aria-label="${t('removeFromTeam')}">✕</button></li>`).join('')}</ul>`
          : `<p class="muted small">${t('noMembers')}</p>`}
        ${others.length ? `<form class="row gap add-member" data-form="admin-add-member" data-tid="${esc(tm.id)}">
          <select class="grow" name="user" required aria-label="${t('pickAccount')}"><option value="">${t('pickAccount')}</option>
            ${others.map((a) => `<option value="${esc(a.user_id)}">${esc(a.email)}</option>`).join('')}</select>
          <select class="mini" name="role" aria-label="${t('roleDirector')} / ${t('roleCoach')}">
            <option value="coach">${t('roleCoach')}</option><option value="director">${t('roleDirector')}</option></select>
          <button class="btn small">${t('addMember')}</button>
        </form>` : ''}
      </li>`;
    }).join('');
    body = `${accounts}
      <h2>${t('cloudTeams')} <span class="muted small">${st.teams.length}</span></h2>
      ${st.teams.length ? `<ul class="list">${teams}</ul>` : `<p class="empty">${t('noCloudTeams')}</p>`}`;
  }
  main.innerHTML = `${head}${give}${body}`;
  if (!st) loadAdmin();
}

// ---------- Views: profile / settings ----------
// App settings live here; add new sections as more settings appear.

// Profile is an accordion: Account, Settings, Backup. One section open at a time (Account by
// default, every time the app starts); each closed header shows a one-line summary. While
// creating an account / choosing a password, Account stays open.
let profileOpen = 'account';

function viewProfile() {
  const seg = (action, current, options) => `<span class="seg big" role="group">${options.map(([v, label]) =>
    `<button class="${current === v ? 'on' : ''}" data-action="${action}" data-v="${v}" aria-pressed="${current === v}">${label}</button>`).join('')}</span>`;
  const busyAuth = cloud.needsPassword || cloud.step === 'code';
  const open = busyAuth ? 'account' : profileOpen;
  const a = cloud.account;
  const accountSum = cloud.session
    ? (cloud.needsPassword ? t('stepOf', { n: 3 }) : [cloud.session.user.email, a && !a.none && (a.isAdmin ? t('acctAdmin') : t(a.kind === 'director' ? 'acctDirector' : 'acctCoach'))].filter(Boolean).join(' · '))
    : t('notSignedIn');
  const themeLabel = { light: t('themeLight'), dark: t('themeDark'), auto: t('themeAuto') }[theme];
  const section = (id, title, summary, body) => `
    <section class="acc ${open === id ? 'open' : ''}">
      <button class="acc-head" data-action="profile-section" data-v="${id}" aria-expanded="${open === id}" aria-controls="acc-${id}">
        <span class="grow"><span class="acc-title">${title}</span><span class="acc-sum">${esc(summary)}</span></span>
        <svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
      </button>
      <div class="acc-body" id="acc-${id}" ${open === id ? '' : 'hidden'}>${body}</div>
    </section>`;
  main.innerHTML = `
    ${bar(t('tabProfile'))}
    <div class="accordion">
    ${section('account', t('account'), accountSum, accountSection())}
    ${section('settings', t('settings'), `${lang === 'pt' ? 'Português' : 'English'} · ${themeLabel}`, `
      <ul class="list settings">
        <li class="item"><span class="grow">${t('language')}</span>
          ${seg('lang', lang, [['en', 'English'], ['pt', 'Português']])}</li>
        <li class="item wrap"><span class="grow">${t('theme')}</span>
          ${seg('theme', theme, [['light', `☀️ ${t('themeLight')}`], ['dark', `🌙 ${t('themeDark')}`], ['auto', t('themeAuto')]])}</li>
      </ul>`)}
    ${section('backup', t('backupTitle'), t('backupSummary'), `
      <p class="hint">${t('backupHint')}</p>
      ${persisted === null ? '' : `<p class="hint ${persisted ? 'ok' : 'warn'}">${persisted ? `✓ ${t('storageKept')}` : t('storageNotKept')}</p>`}
      <div class="row gap">
        <button class="btn grow" data-action="backup">⬇️ ${t('exportBackup')}</button>
        <label class="btn grow">⬆️ ${t('importBackup')}<input type="file" accept="application/json,.json" data-change="restore" hidden></label>
      </div>`)}
    </div>`;
}

function gameCard(g) {
  const d = derive(g);
  const href = g.status === 'finished' ? `#/report/${g.id}` : `#/game/${g.id}`;
  // Result of a finished game: win / draw / loss, shown as a coloured stripe and a pill.
  const res = g.status === 'finished' ? (d.us > d.them ? 'win' : d.us < d.them ? 'loss' : 'draw') : '';
  // Our goals green, theirs red, both neutral on a draw.
  const score = scoreHtml(g, d, '–', true);
  // Only what helps pick a game out of the list: team (when there are several), date and round.
  const meta = [
    db.teams.length > 1 && g.team ? esc(g.team) : '',
    esc(fmtDate(g)),
    g.round ? t('roundN', { n: esc(g.round) }) : '',
  ].filter(Boolean).join(' · ');
  return `<li><a class="card game ${res}" href="${href}">
    <div class="grow">
      <strong>${esc(matchTitle(g))}</strong>
      <div class="muted small">${meta}</div>
    </div>
    <div class="right">
      ${g.status !== 'scheduled' ? `<div class="score">${score}</div>` : ''}
      ${res ? `<span class="badge result ${res}">${t(`res_${res}`)}</span>` : `<span class="badge ${g.status}">${t(`st_${g.status}`)}</span>`}
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
        <div class="right">
          <span class="badge">${t('playersCount', { n: teamPlayers(tm.id).length })}</span>
          ${teamBadge(tm)}
        </div>
      </a></li>`).join('')}</ul>` : `<p class="empty">${t('noTeams')}</p>`}`;
}

let newCloudTeam = null; // id of a team just created as a cloud team (shows a note once)

function viewTeam(id) {
  const tm = getTeam(id);
  if (!tm) return viewTeams();
  const ps = teamPlayers(id).sort(byNumber);
  const ro = readOnlyTeam(id);
  const cloudTeam = isCloudTeam(id);
  const field = (key, label, ph) => (ro
    ? `<div class="ro-field"><span class="muted small">${label}</span><div>${esc(tm[key]) || '–'}</div></div>`
    : `<label>${label}<input data-team="${key}" value="${esc(tm[key])}" placeholder="${ph}" autocomplete="off"></label>`);
  main.innerHTML = `
    ${bar(esc(teamLabel(tm)), '#/teams', '', ro ? readOnlyPill() : '')}
    ${teamBadge(tm) ? `<div class="team-kind">${teamBadge(tm)}</div>` : ''}
    ${ro ? `<p class="hint">${t('readOnlyHint')}</p>` : ''}
    ${newCloudTeam === id && cloudTeam ? `<p class="hint ok">☁️ ${t('newTeamCloud')}</p>` : ''}
    <div class="form">
      ${field('club', t('club'), t('clubPh'))}
      ${field('name', t('team'), t('teamPh'))}
    </div>
    ${canUpload() && !cloudTeam ? `<div class="upload-team">
      <button class="btn block" data-action="upload-team">${t('uploadTeam')}</button>
      <p class="hint">${t('uploadTeamHint')}</p>
    </div>` : ''}
    <h2>${t('players')}</h2>
    ${ro ? '' : `<form class="add-player" data-form="add-player">
      <div class="row gap">
        <input class="num" name="number" inputmode="numeric" placeholder="#" maxlength="3">
        <input class="grow" name="name" placeholder="${t('shirtName')}" required autocomplete="off">
      </div>
      <div class="row gap">
        <input class="grow" name="fullName" placeholder="${t('fullName')}" autocomplete="off">
        <button class="btn primary">${t('add')}</button>
      </div>
    </form>`}
    ${ps.length ? `<ul class="list">${ps.map((p) => `
      <li class="item">
        <span class="shirt">${esc(p.number) || '–'}</span>
        <span class="grow">${esc(p.name)}${p.fullName ? `<div class="muted small">${esc(p.fullName)}</div>` : ''}</span>
        ${ro ? '' : `<button class="btn small ghost" data-action="edit-player" data-id="${p.id}">${t('edit')}</button>
        <button class="btn small ghost danger" data-action="delete-player" data-id="${p.id}" aria-label="✕">✕</button>`}
      </li>`).join('')}</ul>` : `<p class="empty">${t('noPlayers')}</p>`}
    ${cloudTeam ? `<h2>${t('people')}</h2><section id="people" class="people-section">${peopleHtml(id)}</section>` : ''}
    ${ro ? '' : `<div class="row gap foot">
      <button class="btn ghost danger" data-action="delete-team">${t('deleteTeam')}</button>
    </div>`}`;
  // Members are loaded online, once per visit of this screen (and after changes).
  if (cloudTeam && canSync()) {
    if (db.sync.uploads.includes(id)) {
      remote.people = { teamId: id, status: 'uploading', members: [], msg: null };
      showPeople();
    } else if (remote.people?.teamId !== id || remote.people.status === 'uploading') loadPeople(id);
  }
}

// ---------- Views: new / edit game ----------

// Teams where this user is a coach (read-only) are never offered for new games.
function defaultTeamId() {
  const ok = (id) => (getTeam(id) && !readOnlyTeam(id) ? id : null);
  return ok(gamesTeam()) ?? ok(db.lastTeamId) ?? writableTeams()[0]?.id ?? null;
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
  if (draft.id && readOnlyGame(getGame(draft.id))) {
    main.innerHTML = `${bar(title, back, '', readOnlyPill())}<p class="empty">${t('readOnlyHint')}</p>`;
    return;
  }
  if (!draft.teamId) {
    // Only teams where this user is a coach: explain why there's nothing to pick.
    const msg = db.teams.length ? t('newGameCoachOnly') : t('needTeam');
    main.innerHTML = `${bar(title, back)}<p class="empty">${msg}</p><a class="btn primary block" href="#/teams">${t('goTeams')}</a>`;
    return;
  }
  const ps = teamPlayers(draft.teamId).sort(byNumber);
  main.innerHTML = `
    ${bar(title, back)}
    <div class="form">
      <label>${t('team')}
        <select data-field="teamId">${writableTeams().map((tm) => `<option value="${tm.id}" ${tm.id === draft.teamId ? 'selected' : ''}>${esc(teamLabel(tm))}</option>`).join('')}</select>
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
  if (readOnlyTeam(draft.teamId) || (draft.id && readOnlyGame(getGame(draft.id)))) return refuseReadOnly();
  const field = parseInt(draft.field, 10);
  const periods = parseInt(draft.periods, 10);
  const periodMin = parseInt(draft.periodMin, 10);
  const maxExtra = parseInt(draft.maxExtra, 10) || 10;
  const round = parseInt(draft.round, 10);
  if (!(field >= 1)) return notify(t('errField'));
  if (!(periods >= 1) || !(periodMin >= 1)) return notify(t('errPeriods'));
  if (!draft.date) return notify(t('errDate'));

  const team = getTeam(draft.teamId);
  const order = teamPlayers(team.id).sort(byNumber).map((p) => p.id);
  const squad = order.filter((id) => draft.sel[id]);
  const starters = squad.filter((id) => draft.sel[id] === 'start');
  const need = field + 1;
  if (starters.length !== need) return notify(t('errStarters', { need, field, n: starters.length }));
  if (!starters.includes(draft.gkId)) return notify(t('errGk'));

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
function pitch(g, d, ro = false) {
  const pts = slotCoords(formationOf(g));
  return `<div class="pitch">${PITCH_LINES}
    ${ro ? `<span class="pitch-corner left ro" aria-label="${t('formation')}">${formationOf(g)}</span>`
    : formationsFor(g.field).length > 1 ? `<button class="pitch-corner left" data-action="formation" aria-label="${t('formation')}">${formationOf(g)} ▾</button>` : ''}
    <span class="pitch-corner right" aria-label="${t('onPitch')}">${d.on.size}/${g.field + 1}</span>
    ${d.slots.map((id, i) => {
    const pos = `data-slot="${i}" style="left:${pts[i].x.toFixed(1)}%;top:${typeof pts[i].y === 'number' ? `${pts[i].y.toFixed(1)}%` : pts[i].y}"`;
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
  const ro = readOnlyGame(g); // coach of this cloud team: no controls that change the game
  const last = ro ? null : g.events[g.events.length - 1];
  const canEdit = g.status === 'scheduled' && g.events.length === 0;
  const overtime = g.status === 'live' && matchTime(g) - periodStart(g) >= g.periodMin * 60000;
  const us = g.team || g.club || t('unnamedTeam');
  const them = g.opponent || t('opponent');
  const [home, away] = g.home === false ? [them, us] : [us, them];

  main.innerHTML = `
    ${bar(esc(matchTitle(g)), '#/games', ro ? (g.status !== 'scheduled' ? `<a class="menu-item" role="menuitem" href="#/report/${g.id}">📋 ${t('report')}</a>` : '') : `
      ${canEdit
        ? `<a class="menu-item" role="menuitem" href="#/edit/${g.id}">✎ ${t('edit')}</a>`
        : `<button class="menu-item" role="menuitem" data-action="edit-info">${t('gameInfo')}</button>`}
      ${g.status !== 'scheduled' ? `<a class="menu-item" role="menuitem" href="#/report/${g.id}">📋 ${t('report')}</a>` : ''}
      ${g.status !== 'scheduled' ? `<button class="menu-item" role="menuitem" data-action="fix-open">${t('fixTimesBtn')}</button>` : ''}
      <button class="menu-item danger" role="menuitem" data-action="delete-game">🗑 ${t('deleteGame')}</button>`, ro ? readOnlyPill() : '')}
    <section class="scoreboard ${overtime ? 'overtime' : ''}">
      ${statusPill(g)}
      <div class="clock-line">
        <span class="clock" id="clock">${fmtNow(g)}</span>
        ${g.status === 'live' && !g.clock.running && !ro ? `<button class="icon-btn on" data-action="resume" aria-label="${t('resume')}">▶</button>` : ''}
      </div>
      <div class="muted small" id="period">${periodLabel(g)}</div>
      <div class="score-row">
        <span class="side">${esc(home)}</span>
        <span class="score big">${scoreHtml(g, d, ' – ', true)}</span>
        <span class="side">${esc(away)}</span>
      </div>
      ${g.status === 'break' && g.autoStopped === g.clock.period && !ro ? `<div class="alert">${t('autoStoppedAlert', { p: periodName(g, g.clock.period), m: g.maxExtra ?? 10, fix: t('fixTimes') })}
        <div class="row center"><button class="btn small" data-action="fix-open">${t('fixTimesBtn')}</button></div></div>` : ''}
      ${ro ? (g.status === 'finished' ? `<div class="row gap center wrap score-actions">${clockButtons(g)}</div>` : '') : `<div class="row gap center wrap score-actions">
        ${g.status === 'live' ? `<button class="btn small ghost" data-action="opp-goal">${t('oppGoalBtn')}</button>` : ''}
        ${clockButtons(g)}
      </div>`}
      ${pitch(g, d, ro)}
    </section>

    <h2>${t('bench')}</h2>
    ${benchIds.length ? `<div class="round-row">${benchIds.map((p) => token(g, d, p, 'bench')).join('')}</div>` : `<p class="empty small">${t('noSubs')}</p>`}

    ${offIds.length ? `<h2>${t('sentOff')}</h2><div class="round-row">${offIds.map((p) => token(g, d, p, 'off')).join('')}</div>` : ''}

    <h2>${t('timeline')}</h2>
    ${last ? `<button class="btn small ghost" data-action="undo">${t('undoX', { x: describe(g, last) })}</button>` : ''}
    ${timeline.length ? `<ul class="timeline">${timeline.map((e) => e.type === 'goal' && !ro
      ? `<li class="tap" data-action="edit-goal" data-id="${e.id}"><span class="t">${timeOf(g, e)}</span><span>${describe(g, e)}</span><span class="edit">✎</span></li>`
      : `<li><span class="t">${timeOf(g, e)}</span><span>${describe(g, e)}</span></li>`).join('')}</ul>` : `<p class="empty small">${t('nothingYet')}</p>`}
`;
}

function tick() {
  // Read-only games (coach): reminders and the auto-stop are the director's phone's job.
  for (const g of db.games) if (g.status === 'live' && g.clock.running && !readOnlyGame(g)) checkTime(g);
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
    ${bar(t('gameReport'), `#/game/${g.id}`, '', readOnlyGame(g) ? readOnlyPill() : '')}
    <section class="scoreboard">
      <strong>${esc(matchTitle(g))}</strong>
      <div class="muted small">${formatLine(g)}</div>
      <div class="score big">${scoreHtml(g, d, ' – ', true)}</div>
      <div class="muted">${t('gameTime', { t: fmtNow(g) })}${g.status === 'finished' ? '' : ` · <span class="warn">${t('inProgress')}</span>`}</div>
    </section>

    <button class="btn primary block" data-action="pdf">${t('pdf')}</button>
    ${readOnlyGame(g) ? '' : `<button class="btn ghost block" data-action="edit-info">${t('gameInfo')}</button>`}
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
  'games-team': ({ id }) => {
    localStorage.setItem(GAMES_TEAM_KEY, id);
    render();
  },
  soon: ({ v }) => askConfirm({ title: t('soonTitle'), message: t('soonMsg', { x: t(v) }), ok: t('ok'), cancel: false }),

  privacy: () => openSheet(`<h3>${t('privacyTitle')}</h3><div class="privacy">${t('privacyBody')}</div>
    <button class="btn block" data-action="close-sheet">${t('ok')}</button>`),
  'signin-back': () => { Object.assign(cloud, { step: 'email', error: '' }); render(); },
  'profile-section': ({ v }) => {
    profileOpen = profileOpen === v ? '' : v; // tap the open one to close it
    render();
  },
  'auth-mode': ({ v }) => {
    // Keep a typed email when switching between Sign in / Activate account / Reset.
    const typed = $('main input[name="email"]')?.value.trim();
    Object.assign(cloud, { mode: v, step: 'email', error: '', email: typed || cloud.email });
    render();
  },
  'change-password': () => { Object.assign(cloud, { changingPassword: true, error: '' }); render(); },
  'cancel-password': () => { Object.assign(cloud, { changingPassword: false, error: '' }); render(); },
  'signin-resend': () => sendCode(cloud.email),
  'sign-out': async () => {
    const n = pendingCount();
    const message = [t('signOutConfirm'), Object.keys(db.sync.teams).length ? t('signOutCloud') : '',
      n ? `<b>${plural('signOutLose', n)}</b>` : ''].filter(Boolean).join(' ');
    if (!(await askConfirm({ title: t('signOut'), message, ok: t('signOut'), danger: n > 0 }))) return;
    removeCloudData(); // cloud teams leave this phone; teams on this phone stay
    await sb.auth.signOut({ scope: 'local' }); // local: works offline too
    render();
  },
  'sync-now': () => syncNow(),
  'upload-team': () => uploadTeams([route().id]),

  // People of a cloud team (team screen)
  'people-reload': () => loadPeople(route().id),
  'remove-coach': async ({ id }) => {
    const teamId = route().id;
    const m = remote.people?.members.find((x) => x.user_id === id);
    const ok = await askConfirm({
      title: t('removeFromTeam'), message: t('removeMemberConfirm', { email: `<b>${esc(m?.email || '')}</b>` }), ok: t('removeFromTeam'), danger: true,
    });
    if (!ok) return;
    try {
      await deleteMember(teamId, id);
      setPeopleMsg(t('removed'), true);
    } catch (e) {
      return setPeopleMsg(accessError(e), false);
    }
    loadPeople(teamId);
  },
  'leave-team': async () => {
    const teamId = route().id;
    const ok = await askConfirm({ title: t('leaveTeam'), message: t('leaveTeamConfirm'), ok: t('leaveTeam'), danger: true });
    if (!ok) return;
    try {
      if (pendingCount()) await syncNow(); // a director's changes go up first
      await deleteMember(teamId, myId());
    } catch (e) {
      return setPeopleMsg(accessError(e), false);
    }
    toast(t('leftTeam'));
    await syncNow(); // the team leaves this phone
    if (route().view === 'team' && route().id === teamId) location.hash = '#/teams';
  },

  // Admin page
  'admin-reload': () => { remote.admin = null; render(); },
  'admin-remove-account': async ({ id }) => {
    const a = remote.admin?.accounts.find((x) => x.user_id === id);
    const ok = await askConfirm({
      title: t('removeAccess'), message: t('removeAccessConfirm', { email: `<b>${esc(a?.email || '')}</b>` }), ok: t('removeAccess'), danger: true,
    });
    if (ok) adminDo(() => adminCall({ action: 'delete_account', user_id: id }), t('accessRemoved'));
  },
  'admin-remove-member': async ({ tid, id }) => {
    const a = remote.admin?.accounts.find((x) => x.user_id === id);
    const ok = await askConfirm({
      title: t('removeFromTeam'), message: t('removeMemberConfirm', { email: `<b>${esc(a?.email || '')}</b>` }), ok: t('removeFromTeam'), danger: true,
    });
    if (ok) adminDo(() => deleteMember(tid, id), t('removed'), true);
  },

  theme: ({ v }) => {
    theme = v;
    localStorage.setItem(THEME_KEY, v);
    applyTheme();
    render();
  },

  lang: ({ v }) => {
    lang = v;
    localStorage.setItem(LANG_KEY, v);
    document.documentElement.lang = v;
    render();
  },

  // teams and players
  // Signed in with a director (or admin) account: new teams are cloud teams straight away.
  // Otherwise (signed out, coach account) they stay on this phone, as before.
  'new-team': () => {
    const tm = { id: uid(), club: db.teams[0]?.club || '', name: '' };
    db.teams.push(tm);
    save();
    if (canUpload()) {
      newCloudTeam = tm.id;
      uploadTeams([tm.id]);
    }
    location.hash = `#/team/${tm.id}`;
  },
  'delete-team': async () => {
    const id = route().id;
    if (teamPlayers(id).length) {
      return askConfirm({ title: t('deleteTeam'), message: t('teamHasPlayers'), ok: t('ok'), cancel: false });
    }
    const ok = await askConfirm({
      title: t('confirmDeleteTeam'), message: esc(teamLabel(getTeam(id))), ok: t('deleteBtn'), danger: true,
    });
    if (!ok) return;
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
  'delete-player': async ({ id }) => {
    const p = db.players.find((x) => x.id === id);
    const ok = await askConfirm({
      title: t('removePlayerTitle'), message: t('confirmRemovePlayer', { name: `<b>${esc(p.name)}</b>` }), ok: t('deleteBtn'), danger: true,
    });
    if (!ok) return;
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
  'end-period': async () => {
    const g = currentGame();
    const last = g.clock.period >= g.periods;
    if (g.status !== 'live') return;
    if (last && !(await askConfirm({ title: t('confirmFullTime'), ok: t('fullTimeBtn') }))) return;
    if (g.status !== 'live') return; // auto-stopped while the popup was open
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
  player: ({ id }) => (readOnlyGame(currentGame()) ? openPlayerInfo : openPlayerSheet)(currentGame(), id),
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
      return notify(t('errFixEnd', { a: fmtInPeriod(g, p, 0), b: fmtInPeriod(g, p, maxMin * 60000) }));
    }
    if (fix.started != null && !(fix.started >= 0 && fix.started <= maxMin - fix.end + 0.01)) {
      return notify(t('errFixStart', { p: periodName(g, p) }));
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
  'delete-goal': async ({ id }) => {
    const g = currentGame();
    if (!(await askConfirm({ title: t('confirmRemoveGoal'), ok: t('deleteBtn'), danger: true }))) return;
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
          <select name="teamId">${db.teams.filter((tm) => tm.id === teamId || !readOnlyTeam(tm.id)).map((tm) => `<option value="${tm.id}" ${tm.id === teamId ? 'selected' : ''}>${esc(teamLabel(tm))}</option>`).join('')}</select>
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
  if (!READ_ONLY_OK.has(el.dataset.action) && viewReadOnly()) return refuseReadOnly();
  fn(el.dataset, el);
});

document.addEventListener('input', (e) => {
  const { fix: fk, team: tk, field: fd } = e.target.dataset;
  if ((fk || tk || fd) && viewReadOnly()) return refuseReadOnly();
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
    if (!tm) return;
    tm[teamKey] = e.target.value.trim();
    syncGameTeams(db, tm.id);
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
  const { change, id, tid } = e.target.dataset; // (data-tid: data-team is the team screen's inputs)
  // Admin page: account type and team roles (RLS lets only the admin change them).
  if (change === 'admin-kind') {
    return adminDo(async () => {
      const rows = await q(sb.from('accounts').update({ kind: e.target.value }).eq('user_id', id).select('user_id'));
      if (!rows.length) throw Object.assign(new Error('not allowed'), { code: '42501' });
    }, t('kindChanged'));
  }
  if (change === 'admin-role') {
    return adminDo(async () => {
      const rows = await q(sb.from('team_members').update({ role: e.target.value }).eq('team_id', tid).eq('user_id', id).select('user_id'));
      if (!rows.length) throw Object.assign(new Error('not allowed'), { code: '42501' });
    }, t('roleChanged'), true);
  }
  if (change !== 'restore') return;
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data.players) || !Array.isArray(data.games)) throw new Error('bad file');
    const ok = await askConfirm({
      title: t('importBackup'), message: t('confirmRestore', { p: data.players.length, g: data.games.length }), ok: t('restoreBtn'),
    });
    if (!ok) return;
    // Cloud teams aren't replaced by a backup (that would delete them in the cloud): they and
    // the sync state stay as they are; the backup replaces the teams on this phone.
    delete data.sync; // another phone's (or person's) sync state
    const restored = normalize(data);
    const cloudIds = new Set(Object.keys(db.sync.teams));
    for (const kind of RECORD_KINDS) {
      restored[kind] = restored[kind].filter((r) => !cloudIds.has(teamIdOf(kind, r)))
        .concat(db[kind].filter((r) => cloudIds.has(teamIdOf(kind, r))));
    }
    Object.assign(restored, { sync: db.sync, deleted: db.deleted });
    db = restored;
    save();
    render();
    toast(t('restored'));
  } catch {
    notify(t('badBackup'));
  }
});

document.addEventListener('submit', (e) => {
  const form = e.target.dataset.form;
  if (!form) return;
  e.preventDefault();
  if (!READ_ONLY_FORMS.has(form) && viewReadOnly()) return refuseReadOnly();
  const data = new FormData(e.target);
  if (form === 'add-coach') {
    // Directors only (the form isn't shown to coaches; the database checks it too).
    if (roleOf(route().id) !== 'director') return refuseReadOnly();
    return addCoach(route().id, String(data.get('email')).trim().toLowerCase());
  }
  if (form === 'admin-create') {
    const email = String(data.get('email')).trim().toLowerCase();
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    return adminDo(async () => {
      await adminCall({ action: 'create_account', email, kind: String(data.get('kind')) });
      notify(t('accessGiven', { email: `<b>${esc(email)}</b>` }), t('accessGivenTitle'));
    }).finally(() => { btn.disabled = false; });
  }
  if (form === 'admin-add-member') {
    const teamId = e.target.dataset.tid;
    return adminDo(() => q(sb.from('team_members').insert({
      team_id: teamId, user_id: String(data.get('user')), role: String(data.get('role')), invited_by: myId(),
    })), t('memberAdded'), true);
  }
  if (form === 'signin-email') return sendCode(String(data.get('email')).trim().toLowerCase());
  if (form === 'signin-password') return signInPassword(String(data.get('email')).trim().toLowerCase(), String(data.get('password')));
  if (form === 'set-password') return setPassword(String(data.get('password')), String(data.get('password2')));
  if (form === 'signin-code') return verifyCode(String(data.get('code')).replace(/\D/g, ''));
  if (form === 'upload-teams') {
    closeSheet();
    const ids = data.getAll('team').map(String);
    if (ids.length) uploadTeams(ids);
    return;
  }
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

const drag = { timer: null, active: false, moved: false, from: null, x0: 0, y0: 0, dx: 0, dy: 0, ghost: null, target: null, suppressClick: false };

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
  if (chip.disabled || !chip.dataset.id || route().view !== 'game' || readOnlyGame(currentGame())) return;
  Object.assign(drag, { from: chip, x0: x, y0: y, moved: false, target: null });
  drag.timer = setTimeout(() => {
    drag.active = true;
    buzz();
    // Keep the point where the player was grabbed under the finger (a pitch token's circle is
    // at its top, so centring the token on the finger would make the circle jump up).
    const r = chip.getBoundingClientRect();
    drag.dx = x - r.left;
    drag.dy = y - r.top;
    const ghost = chip.cloneNode(true);
    ghost.className += ' ghost';
    Object.assign(ghost.style, {
      width: `${chip.offsetWidth}px`, left: `${r.left}px`, top: `${r.top}px`, transformOrigin: `${drag.dx}px ${drag.dy}px`,
    });
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
  drag.ghost.style.left = `${x - drag.dx}px`;
  drag.ghost.style.top = `${y - drag.dy}px`;
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
requestPersistence();
tick(); // apply any auto-stop that was due while the app was closed
