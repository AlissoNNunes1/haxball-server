//Handlers para sala Todos Jogam

const { getFutsalMap } = require('../../shared/config/maps.cjs');
const {
  announce,
  whisper,
  welcomeWhispers,
  startCommunityAnnouncements,
  matchStartAnnouncement,
  matchGoalAnnouncement,
  matchVictoryAnnouncement,
  startRegistrationReminders,
} = require('../../shared/config/messages.cjs');
const { processCommand, authHandler } = require('../../shared/config/commands.cjs');
const {
  handleFormattedGlobalChat,
  setAuthHandler,
} = require('../../shared/handlers/chatHandlers.cjs');

// Configura authHandler para sistema de tags automatico
setAuthHandler(authHandler);

//===========================================
// FUNCAO LOCAL DE TAG (prioridade sobre a shared)
//===========================================

/**
 * Determina tag do jogador: manual > admin > autenticado > nenhuma
 */
function getPlayerTag(player) {
  if (!player) return null;

  // Verifica tag manual definida
  try {
    const { getPlayerTag: getManualTag } = require('../../shared/config/utils.cjs');
    const manualTag = getManualTag(room, player.id);
    if (manualTag) return manualTag;
  } catch (e) {
    // Silent
  }

  // Admin da sala
  if (player.admin) return 'ADM';

  // Jogador autenticado
  if (authHandler && authHandler.isAuthenticated && authHandler.isAuthenticated(player.id)) {
    try {
      const account = authHandler.getAuthenticatedPlayer(player.id);
      if (account && account.ranking) {
        return account.ranking; // S1, A1, B2, etc
      }
    } catch (e) {
      // Silent
    }
  }

  return null;
}

/**
 * Formata nome com tag
 */
function formatChatName(player) {
  if (!player) return '';
  const tag = getPlayerTag(player);
  if (tag) {
    return `[${tag}] ${player.name}`;
  }
  return player.name;
}

// Handlers globais reutilizaveis
const { handleGoal } = require('../../shared/handlers/goalHandlers.cjs');
const {
  handleMatchStart,
  handleMatchEnd,
  ensureStatsRegistration,
  buildFallbackBasicStats,
  autoAdjustMapForPlayerCount,
  startGameIfReadyWithAfk,
  startStatsCollector,
  finalizeMatchStats,
} = require('../../shared/handlers/matchHandlers.cjs');
const { goalCelebration, assistCelebration } = require('../../shared/utils/celebrationUtils.cjs');

const { getAuthDb } = require('../../dist/database/auth-client');
const {
  createInterval,
  createNamedInterval,
  createTimeout,
  clearRoomTimers,
  clearNamedTimer,
} = require('../../shared/config/roomTimers.cjs');
const {
  setPlayerAFK,
  isPlayerAFK,
  isAFKTimeout,
  removeAFKPlayer,
  clearAFKPlayers,
  balanceTeams,
  clearPlayerTag,
} = require('../../shared/config/utils.cjs');

// Sistema de estatisticas
let StatsCollector;
let StatsService;
let StatsCalculator;
let statsCollector;
let statsService;
try {
  const { StatsCollector: SC } = require('../../dist/stats/StatsCollector');
  const { StatsService: SS } = require('../../dist/stats/StatsService');
  const { StatsCalculator: SCalc } = require('../../dist/stats/StatsCalculator');
  StatsCollector = SC;
  StatsService = SS;
  StatsCalculator = SCalc;

  // Inicializa statsService
  const authDb = getAuthDb();
  const sqliteDb = authDb && authDb.sqlite ? authDb.sqlite : authDb;
  const calculator = new StatsCalculator();
  statsService = new StatsService(sqliteDb, calculator);
  console.log('[STATS] Sistema de estatisticas carregado');
} catch (error) {
  console.error('[STATS] Erro ao carregar sistema de estatisticas:', error.message);
  console.log('[STATS] Estatisticas desabilitadas');
}

const room = globalThis.room;

let gameState = {
  started: false,
  redScore: 0,
  blueScore: 0,
  currentMap: null,
  mapBucket: null,
  playerCount: 0,
  lastBallTouch: null,
  lastKickerId: undefined,
  lastKickerName: undefined,
  lastKickerTeam: undefined,
  secondLastKickerId: undefined,
  secondLastKickerName: undefined,
  secondLastKickerTeam: undefined,
  matchId: 0, // ID da partida atual para stats
  statsEnabled: false, // Se stats estao sendo coletadas
};

//===========================================
// UTILITARIOS
//===========================================

function updateMapForPlayerCount() {
  autoAdjustMapForPlayerCount(room, gameState, getFutsalMap);
}

function autoBalanceTeams() {
  balanceTeams(room, false);
}

function balanceTeamsWithScore() {
  balanceTeams(room, true);
}

function startGameIfReady() {
  startGameIfReadyWithAfk(room, gameState, { isPlayerAFK, isAFKTimeout, removeAFKPlayer });
}

// Anuncios periodicos da comunidade (a cada 5 minutos)
startCommunityAnnouncements(room, globalThis.__CIRS_ANNOUNCEMENT_INTERVAL || 5 * 60 * 1000);

//===========================================
// HANDLERS DE EVENTOS
//===========================================

// Lembretes de registro/login a cada 3 minutos
startRegistrationReminders(room, authHandler, 3 * 60 * 1000, getAuthDb);

room.onPlayerJoin = function (player) {
  announce(room, `${player.name} entrou na sala!`, null, 0x00ff00);

  // Mensagens de boas-vindas
  welcomeWhispers(room, player);

  // Verifica conta para sugerir login
  try {
    const db = getAuthDb();
    const account = db.getAccountByNick(player.name);

    if (account) {
      whisper(room, 'Conta encontrada no CIRS!', player.id, 0x00ff00, 'bold', 1);
      whisper(room, 'Use !login <senha> para autenticar', player.id, 0xffaa00, 'bold', 1);
      whisper(
        room,
        `Tag: [${account.ranking}] ${account.haxballNick}`,
        player.id,
        0xaaaaaa,
        'normal',
        1
      );
    } else {
      whisper(
        room,
        'Nao encontramos sua conta. Registre-se no Discord com /register',
        player.id,
        0xffaa00,
        'normal',
        1
      );
    }
  } catch (error) {
    console.error('[TODOS-JOGAM] Erro ao verificar conta:', error.message);
  }

  // Atualiza contador
  gameState.playerCount++;

  // Coloca jogador em um time automaticamente
  setTimeout(() => {
    const p = room.getPlayer(player.id);
    if (p && p.team === 0) {
      const redCount = room.getPlayerList().filter((pl) => pl.team === 1).length;
      const blueCount = room.getPlayerList().filter((pl) => pl.team === 2).length;

      if (redCount <= blueCount) {
        room.setPlayerTeam(player.id, 1);
      } else {
        room.setPlayerTeam(player.id, 2);
      }
    }

    // Tenta iniciar jogo
    startGameIfReady();
  }, 500);
};

room.onPlayerLeave = function (player) {
  announce(room, `${player.name} saiu da sala`, null, 0xff0000);
  gameState.playerCount--;

  // Remove jogador do sistema AFK global
  removeAFKPlayer(player.id);

  // Remove tag do jogador caso exista
  try {
    clearPlayerTag(room, player.id);
  } catch (err) {
    console.error('[TODOS-JOGAM] Erro ao limpar tag do jogador:', err.message);
  }

  // Ajusta times apos saida
  createTimeout(
    room,
    () => {
      autoBalanceTeams();
    },
    100
  );
};

room.onPlayerChat = function (player, message) {
  // Processa comandos globais PRIMEIRO (inclui !help, !login, !afk, !bb, etc)
  const commandHandled = processCommand(room, player, message);
  if (commandHandled) return false;

  const msg = message.trim();
  if (!msg) return false;

  const lower = msg.toLowerCase();

  // Comando especifico da sala
  if (lower === '!swap') {
    const p = room.getPlayer(player.id);
    if (p) {
      if (p.team === 1) {
        room.setPlayerTeam(player.id, 2);
        whisper(room, 'Voce foi movido para o time azul', player.id, 0x0000ff, 'normal', 1);
      } else if (p.team === 2) {
        room.setPlayerTeam(player.id, 1);
        whisper(room, 'Voce foi movido para o time vermelho', player.id, 0xff0000, 'normal', 1);
      }
    }
    return false;
  }

  // Formata e envia chat com tag
  const formattedName = formatChatName(player);
  room.sendChat(`${formattedName}: ${msg}`);
  console.log(`[Chat] ${formattedName}: ${msg}`);
  return true; // Bloqueia mensagem padrao
};

room.onPlayerBallKick = function (player) {
  // Atualiza penultimo chutador
  gameState.secondLastKickerId = gameState.lastKickerId;
  gameState.secondLastKickerName = gameState.lastKickerName;
  gameState.secondLastKickerTeam = gameState.lastKickerTeam;

  // Atualiza ultimo chutador
  gameState.lastKickerId = player.id;
  gameState.lastKickerName = player.name;
  gameState.lastKickerTeam = player.team;

  // Legado: lastBallTouch (mantido por compatibilidade)
  gameState.lastBallTouch = {
    player: player.name,
    playerId: player.id,
    team: player.team,
    time: Date.now(),
  };

  // Rastreia toque na bola para stats
  if (statsCollector && gameState.statsEnabled) {
    try {
      const accountId = ensureStatsRegistration(
        room,
        statsCollector,
        authHandler,
        gameState,
        player
      );
      if (accountId) {
        statsCollector.trackTouch(accountId, Date.now());
      }
    } catch (error) {
      console.error('[STATS] Erro ao rastrear toque:', error.message);
    }
  }
};

room.onPlayerActivity = function (player) {
  // Registra atividade do jogador para sistema global de AFK
  if (isPlayerAFK(player.id)) {
    // Se esta em AFK, nao sai automaticamente - precisa usar !afk novamente
  }
};

room.onTeamGoal = function (team) {
  // Usa handler global para logica de gol
  handleGoal(room, team, gameState, {
    onGoal: (room, goalInfo) => {
      // Rastreia gol para stats
      if (
        statsCollector &&
        gameState.statsEnabled &&
        authHandler &&
        goalInfo.scorer &&
        !goalInfo.isOwnGoal
      ) {
        try {
          const scorerPlayer = room.getPlayer(goalInfo.scorer.id);
          const accountId = scorerPlayer
            ? ensureStatsRegistration(room, statsCollector, authHandler, gameState, scorerPlayer)
            : null;
          if (accountId) {
            statsCollector.trackGoal(accountId, Date.now(), false);
            console.log(`[STATS] Gol rastreado para accountId ${accountId}`);
          }
        } catch (error) {
          console.error('[STATS] Erro ao rastrear gol:', error.message);
        }
      }

      // Celebracoes
      if (goalInfo.scorer && !goalInfo.isOwnGoal) {
        goalCelebration(room, goalInfo.scorer.id);
      }
      if (goalInfo.assister) {
        assistCelebration(room, goalInfo.assister.id);
      }
    },
  });
};

room.onGameStart = function (byPlayer) {
  handleMatchStart(room, gameState);
  if (StatsCollector && !statsCollector) {
    const { statsCollector: sc } = startStatsCollector(
      room,
      gameState,
      { StatsCollector },
      authHandler,
      whisper
    );
    statsCollector = sc || statsCollector;
  }
};

room.onGameStop = function () {
  gameState.started = false;

  // Ajusta mapa apenas quando jogo parar
  updateMapForPlayerCount();
  // Limpa timers de verificacoes/cronometros relacionados a esta partida para evitar vazamento
  try {
    clearNamedTimer(room, 'afk_check');
  } catch (err) {
    console.error('[TIMERS] Erro ao limpar timers da sala:', err.message);
  }
};

room.onGamePause = function () {
  announce(room, '⏸️ Jogo pausado', null, 0xffaa00);
};

room.onGameUnpause = function () {
  announce(room, '▶️ Jogo retomado', null, 0x00ff00);
};

room.onPositionsReset = function () {
  announce(room, 'Posicoes resetadas', null, 0xaaaaaa);
};

room.onTeamVictory = async function (scores) {
  const winner = scores.red > scores.blue ? 'VERMELHO' : 'AZUL';
  const color = scores.red > scores.blue ? 0xff0000 : 0x0000ff;
  const score = `${scores.red} x ${scores.blue}`;
  const winningTeam = scores.red > scores.blue ? 'red' : 'blue';

  // Salva estatisticas da partida (agora via helper compartilhado)
  if (statsCollector && gameState.statsEnabled && statsService) {
    await finalizeMatchStats(
      room,
      gameState,
      winningTeam,
      statsCollector,
      statsService,
      authHandler,
      getAuthDb
    );
    statsCollector = null;
    gameState.statsEnabled = false;
  }

  // Mensagem padrao de vitoria
  matchVictoryAnnouncement(room, winner, score);

  gameState.started = false;

  // Ajusta mapa para proxima partida
  updateMapForPlayerCount();

  // Prepara proxima partida com redistribuicao
  createTimeout(
    room,
    () => {
      balanceTeamsWithScore();
      startGameIfReady();
    },
    3000
  );
};

//   __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
