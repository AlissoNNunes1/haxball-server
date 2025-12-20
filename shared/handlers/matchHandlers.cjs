// Handler global para eventos de inicio, fim e controle de partida
// Centraliza logica de gerenciamento de partidas

const { announce } = require('../config/messages.cjs');
const { formatGameTime } = require('./goalHandlers.cjs');
const { createNamedInterval, clearNamedTimer } = require('../config/roomTimers.cjs');

/**
 * Ajusta automaticamente o mapa conforme quantidade de jogadores
 * Usa getFutsalMap para escolher o bucket correto e aplica no room
 *
 * @param {object} room
 * @param {object} gameState
 * @param {function} getFutsalMap - funcao de maps compartilhada
 */
function autoAdjustMapForPlayerCount(room, gameState, getFutsalMap) {
  if (!room || !gameState || typeof getFutsalMap !== 'function') return;

  const playerList = room.getPlayerList().filter((p) => p.id !== 0);
  const count = playerList.length;

  let bucket;
  let newMap;

  if (count <= 2) {
    bucket = 'tiny';
    newMap = getFutsalMap(2);
  } else if (count <= 6) {
    bucket = 'small';
    newMap = getFutsalMap(6);
  } else if (count <= 12) {
    bucket = 'mid';
    newMap = getFutsalMap(12);
  } else if (count <= 14) {
    bucket = 'x7';
    newMap = getFutsalMap(14);
  } else {
    bucket = 'x8';
    newMap = getFutsalMap(16);
  }

  if (gameState.mapBucket !== bucket) {
    gameState.mapBucket = bucket;
    gameState.currentMap = newMap;
    room.setCustomStadium(newMap);
    announce(room, `🗺️ Mapa ajustado para ${count} jogadores`);
  }
}

/**
 * Verifica pronto para iniciar partida e agenda intervalo de AFK
 * Minimos: ao menos 1 por time. Inicia jogo apos 3s.
 * Cria named timer 'afk_check' para aplicar timeout AFK.
 *
 * @param {object} room
 * @param {object} gameState
 * @param {function} isPlayerAFK
 * @param {function} isAFKTimeout
 * @param {function} removeAFKPlayer
 */
function startGameIfReadyWithAfk(room, gameState, { isPlayerAFK, isAFKTimeout, removeAFKPlayer }) {
  if (!room || !gameState || !isPlayerAFK || !isAFKTimeout || !removeAFKPlayer) return;

  const players = room.getPlayerList().filter((p) => p.id !== 0);
  const redCount = players.filter((p) => p.team === 1).length;
  const blueCount = players.filter((p) => p.team === 2).length;

  var AFK_CHECK_INTERVAL = globalThis.__CIRS_AFK_CHECK_INTERVAL || 30000;
  globalThis.__CIRS_AFK_CHECK_INTERVAL = AFK_CHECK_INTERVAL;

  if (redCount >= 1 && blueCount >= 1 && !gameState.started) {
    announce(room, '⚽ Iniciando partida em 3 segundos...', null, 0xffaa00);
    setTimeout(() => {
      room.startGame();
      gameState.started = true;
      announce(room, '🎮 BOA SORTE A TODOS!', null, 0x00ff00);
    }, 3000);
  }

  createNamedInterval(
    room,
    'afk_check',
    () => {
      const plist = room.getPlayerList().filter((p) => p.id !== 0);
      for (const player of plist) {
        const isAdmin = player.admin || false;
        if (isPlayerAFK(player.id) && isAFKTimeout(player.id, isAdmin)) {
          announce(
            room,
            `${player.name} foi kickado por ficar AFK por mais de 10 minutos`,
            null,
            0xff0000
          );
          removeAFKPlayer(player.id);
          room.kickPlayer(player.id, 'AFK timeout (10 minutos)', false);
        }
      }
    },
    globalThis.__CIRS_AFK_CHECK_INTERVAL || 30000
  );
}

/**
 * Inicializa StatsCollector e registra jogadores autenticados
 * Retorna objeto { statsCollector, gameState } atualizado
 */
function startStatsCollector(room, gameState, { StatsCollector }, authHandler, whisperFn) {
  if (!room || !gameState || !StatsCollector) return { statsCollector: null };
  let statsCollector = null;
  try {
    gameState.matchId = Date.now();
    statsCollector = new StatsCollector(gameState.matchId, true);
    gameState.statsEnabled = true;

    const players = room.getPlayerList().filter((p) => p.id !== 0 && p.team !== 0);
    let authenticatedCount = 0;

    for (const player of players) {
      if (authHandler && authHandler.isAuthenticated(player.id)) {
        const account = authHandler.getAuthenticatedPlayer(player.id);
        if (account && account.id) {
          const teamStr = player.team === 1 ? 'red' : player.team === 2 ? 'blue' : 'spectator';
          statsCollector.registerPlayer(account.id, player.name, teamStr);
          authenticatedCount++;
          console.log(
            `[STATS] Jogador ${player.name} (accountId ${account.id}) registrado no time ${teamStr}`
          );
        }
      } else if (typeof whisperFn === 'function') {
        whisperFn(
          room,
          '⚠️ Use !login <senha> para suas stats serem contabilizadas',
          player.id,
          0xffaa00,
          'small',
          1
        );
      }
    }

    console.log(
      `[STATS] Coleta iniciada para matchId ${gameState.matchId} (${authenticatedCount}/${players.length} jogadores autenticados)`
    );
  } catch (error) {
    console.error('[STATS] Erro ao inicializar statsCollector:', error.message);
    gameState.statsEnabled = false;
  }
  return { statsCollector };
}

/**
 * Finaliza partida e persiste estatisticas basicas/avancadas/eventos
 * Aplica fallback basico quando necessario e atualiza agregados/Elo
 */
async function finalizeMatchStats(
  room,
  gameState,
  winningTeam,
  statsCollector,
  statsService,
  authHandler,
  getAuthDb
) {
  if (!room || !gameState || !statsCollector || !statsService) return;
  try {
    statsCollector.endMatch(winningTeam);
    const summary = statsCollector.getSummary();
    console.log(`[STATS] Partida finalizada. ${summary.basicStats.length} jogadores rastreados.`);

    if (summary.basicStats.length === 0) {
      const fallbackStats = buildFallbackBasicStats(
        room,
        authHandler,
        getAuthDb,
        gameState.matchId,
        winningTeam
      );
      summary.basicStats.push(...fallbackStats);
    }

    const savedAccountIds = new Set();
    for (const basicStats of summary.basicStats) {
      savedAccountIds.add(basicStats.accountId);
      statsService.saveBasicStats(basicStats).catch((err) => {
        console.error(
          `[STATS] Erro ao salvar stats basicas do accountId ${basicStats.accountId}:`,
          err.message
        );
      });
    }

    if (summary.advancedStats && summary.advancedStats.length > 0) {
      for (const advStats of summary.advancedStats) {
        statsService.saveAdvancedStats(advStats).catch((err) => {
          console.error(
            `[STATS] Erro ao salvar stats avancadas do accountId ${advStats.accountId}:`,
            err.message
          );
        });
      }
    }

    if (summary.events && summary.events.length > 0) {
      for (const event of summary.events) {
        statsService.saveEvent(event).catch((err) => {
          console.error('[STATS] Erro ao salvar evento de partida:', err.message);
        });
      }
    }

    announce(
      room,
      `📊 Estatisticas salvas para ${summary.basicStats.length} jogadores`,
      null,
      0x00ff00
    );

    try {
      const accountIdsToUpdate = Array.from(savedAccountIds);
      if (accountIdsToUpdate.length > 0) {
        console.log('[DEBUG] Atualizando agregados para accountIds:', accountIdsToUpdate);
        await Promise.all(
          accountIdsToUpdate.map((accId) =>
            statsService.updatePlayerAggregate(accId).catch((err) => {
              console.error(
                '[STATS] Erro ao atualizar agregado do accountId ' + accId + ':',
                err.message
              );
            })
          )
        );
        console.log('[DEBUG] Agregados atualizados com sucesso');
      }

      if (typeof statsService.applyEloFromMatch === 'function') {
        await statsService.applyEloFromMatch(summary.basicStats, winningTeam).catch((err) => {
          console.error('[STATS] Erro ao atualizar ranking Elo:', err.message);
        });
      }

      announce(
        room,
        `📊 Estatisticas salvas para ${summary.basicStats.length} jogadores`,
        null,
        0x00ff00
      );
    } catch (err) {
      console.error('[STATS] Erro no processo de atualizacao de agregados:', err.message);
    }
  } catch (error) {
    console.error('[STATS] Erro ao finalizar/salvar estatisticas:', error.message);
  }
}

/**
 * Garante que um jogador autenticado esteja registrado no StatsCollector
 * Antes de rastrear gols, toques ou outras stats.
 *
 * Fluxo de validacao:
 * 1. Valida parametros nao-nulos
 * 2. Verifica se stats sao habilitados (gameState.statsEnabled)
 * 3. Valida autenticacao do jogador
 * 4. Recupera conta autenticada
 * 5. Se nao registrado, registra automaticamente
 *
 * USO OBRIGATORIO:
 * - Antes de trackGoal: accountId = ensureStatsRegistration(...)
 * - Antes de trackTouch: accountId = ensureStatsRegistration(...)
 * - Antes de trackSave: accountId = ensureStatsRegistration(...)
 *
 * @param {object} room - Room do Haxball
 * @param {object} statsCollector - StatsCollector instance
 * @param {object} authHandler - AuthHandler com getAuthenticatedPlayer
 * @param {object} gameState - GameState com propriedade statsEnabled
 * @param {object} player - Player do room (team 1, 2, ou 0 para spec)
 *
 * @returns {string|null} accountId se sucesso, null se falha em qualquer validacao
 *
 * @example
 * // Rastrear toque com stats
 * const accountId = ensureStatsRegistration(room, statsCollector, authHandler, gameState, player);
 * if (accountId) {
 *   statsCollector.trackTouch(accountId, Date.now());
 * }
 *
 * @example
 * // Rastrear gol com stats
 * const scorerPlayer = room.getPlayer(goalInfo.scorer.id);
 * const accountId = ensureStatsRegistration(room, statsCollector, authHandler, gameState, scorerPlayer);
 * if (accountId) {
 *   statsCollector.trackGoal(accountId, Date.now(), false);
 * }
 */
function ensureStatsRegistration(room, statsCollector, authHandler, gameState, player) {
  // Validar parametros nao-nulos (fail-fast)
  if (!statsCollector || !gameState || !authHandler || !player) return null;

  // Stats desabilitadas para essa partida
  if (!gameState.statsEnabled) return null;

  // Jogador nao esta autenticado
  if (!authHandler.isAuthenticated(player.id)) return null;

  // Recuperar conta autenticada
  const account = authHandler.getAuthenticatedPlayer(player.id);
  if (!account || !account.id) return null;

  // Mapear time: 1 = red, 2 = blue, 0 = spectator
  const teamStr = player.team === 1 ? 'red' : player.team === 2 ? 'blue' : 'spectator';

  // Se ja registrado, retornar ID
  if (typeof statsCollector.hasPlayer === 'function' && statsCollector.hasPlayer(account.id)) {
    return account.id;
  }

  // Registrar novo jogador na primeira vez
  statsCollector.registerPlayer(account.id, player.name, teamStr);
  return account.id;
}

function buildFallbackBasicStats(room, authHandler, getAuthDb, matchId, winningTeam) {
  if (!room || !matchId) return [];

  const db = typeof getAuthDb === 'function' ? getAuthDb() : null;
  const players = room.getPlayerList().filter((p) => p.id !== 0 && p.team !== 0);
  const basics = [];

  for (const player of players) {
    const account =
      authHandler && authHandler.isAuthenticated(player.id)
        ? authHandler.getAuthenticatedPlayer(player.id)
        : null;
    const accountFromNick =
      db && typeof db.getAccountByNick === 'function' ? db.getAccountByNick(player.name) : null;
    const accountId = account && account.id ? account.id : accountFromNick && accountFromNick.id;
    if (!accountId) continue;

    const teamStr = player.team === 1 ? 'red' : 'blue';
    basics.push({
      accountId,
      matchId,
      goals: 0,
      assists: 0,
      saves: 0,
      ownGoals: 0,
      touches: 0,
      timeInGame: 0,
      team: teamStr,
      won: teamStr === winningTeam,
    });
  }

  return basics;
}

/**
 * Handler para inicio de partida
 * Anuncia inicio e configura estado inicial
 *
 * @param {object} room - Instancia da sala Haxball
 * @param {object} gameState - Estado do jogo
 * @param {object} options - Opcoes adicionais
 * @param {function} options.onStart - Callback customizado (opcional)
 * @param {boolean} options.announce - Se deve anunciar inicio (padrao: true)
 */
function handleMatchStart(room, gameState, options = {}) {
  if (!room || !gameState) return;

  console.log('[MATCH] Partida iniciada');

  // Reseta estado do jogo
  gameState.started = true;
  gameState.redScore = 0;
  gameState.blueScore = 0;
  gameState.lastKickerId = undefined;
  gameState.lastKickerName = undefined;
  gameState.lastKickerTeam = undefined;
  gameState.secondLastKickerId = undefined;
  gameState.secondLastKickerName = undefined;
  gameState.secondLastKickerTeam = undefined;

  // Anuncia inicio
  if (options.announce !== false) {
    announce(room, '', null, null, null, 0);
    announce(room, '═══════════════════════════════════', null, 0x00ff00, 'bold', 1);
    announce(room, '🎮 PARTIDA INICIADA!', null, 0x00ff00, 'bold', 2);
    announce(room, 'Jogo limpo e respeito sempre!', null, 0xffaa00, 'normal', 1);
    announce(room, '═══════════════════════════════════', null, 0x00ff00, 'bold', 1);
    announce(room, '', null, null, null, 0);
  }

  // Callback customizado
  if (options.onStart && typeof options.onStart === 'function') {
    options.onStart(room, gameState);
  }
}

/**
 * Handler para fim de partida
 * Anuncia vencedor e salva stats se disponivel
 *
 * @param {object} room - Instancia da sala Haxball
 * @param {object} gameState - Estado do jogo
 * @param {object} options - Opcoes adicionais
 * @param {function} options.onEnd - Callback customizado (opcional)
 * @param {object} options.statsService - Servico de stats para salvar dados (opcional)
 * @param {boolean} options.announce - Se deve anunciar fim (padrao: true)
 */
async function handleMatchEnd(room, gameState, options = {}) {
  if (!room || !gameState) return;

  const scores = room.getScores();

  console.log(`[MATCH] Partida finalizada. Placar: ${scores.red}-${scores.blue}`);

  // Determina vencedor
  let winnerName = 'EMPATE';
  let winnerColor = 0xffaa00;

  if (scores.red > scores.blue) {
    winnerName = 'VERMELHO';
    winnerColor = 0xff0000;
  } else if (scores.blue > scores.red) {
    winnerName = 'AZUL';
    winnerColor = 0x0000ff;
  }

  // Anuncia fim
  if (options.announce !== false) {
    announce(room, '', null, null, null, 0);
    announce(room, '=================================', null, 0xffaa00, 'bold', 1);

    if (winnerName === 'EMPATE') {
      announce(room, '🤝 EMPATE!', null, winnerColor, 'bold', 2);
    } else {
      announce(room, `🏆 TIME ${winnerName} VENCEU!`, null, winnerColor, 'bold', 2);
    }

    announce(room, `Placar final: ${scores.red} - ${scores.blue}`, null, 0xffffff, 'bold', 1);
    announce(room, '=================================', null, 0xffaa00, 'bold', 1);
    announce(room, '', null, null, null, 0);
  }

  // Salva stats se disponivel
  if (options.statsService) {
    try {
      console.log('[MATCH] Salvando estatisticas...');
      // Stats serao salvos pelo statsService
      // Este handler apenas fornece o hook
    } catch (error) {
      console.error('[MATCH] Erro ao salvar stats:', error.message);
    }
  }

  // Reseta estado do jogo
  gameState.started = false;
  gameState.redScore = scores.red;
  gameState.blueScore = scores.blue;

  // Callback customizado
  if (options.onEnd && typeof options.onEnd === 'function') {
    await options.onEnd(room, gameState, scores);
  }
}

/**
 * Calcula acrescimos (extra time) baseado no estado do jogo
 *
 * @param {object} gameState - Estado do jogo
 * @param {number} gameTime - Tempo regulamentar da partida em minutos
 * @returns {number} Segundos de acrescimo
 */
function calculateExtraTime(gameState, gameTime) {
  if (!gameState || !gameState.extraTimeCount) return 0;

  const extraSeconds = Math.ceil(gameState.extraTimeCount / 60);
  const extraTimeEnd = gameTime * 60 + extraSeconds;

  gameState.extraTimeEnd = extraTimeEnd;

  return extraSeconds;
}

/**
 * Handler para anunciar acrescimos
 *
 * @param {object} room - Instancia da sala Haxball
 * @param {object} gameState - Estado do jogo
 * @param {number} gameTime - Tempo regulamentar da partida em minutos
 */
function handleExtraTime(room, gameState, gameTime) {
  if (!room || !gameState) return;

  const extraSeconds = calculateExtraTime(gameState, gameTime);

  if (extraSeconds > 0) {
    announce(room, `⏱️ Acréscimos: ${extraSeconds} segundos`, null, 0xffaa00, 'bold', 1);
    gameState.extraTimeAnnounced = true;

    console.log(`[MATCH] Acrescimos: ${extraSeconds} segundos`);
  }
}

/**
 * Handler para pausar partida
 *
 * @param {object} room - Instancia da sala Haxball
 * @param {object} gameState - Estado do jogo
 * @param {object} player - Jogador que pausou (null se automatico)
 */
function handlePause(room, gameState, player = null) {
  if (!room || !gameState) return;

  gameState.paused = true;

  if (player) {
    announce(room, `⏸️ Jogo pausado por ${player.name}`, null, 0xffaa00, 'bold', 0);
    console.log(`[MATCH] Jogo pausado por ${player.name}`);
  } else {
    announce(room, `⏸️ Jogo pausado`, null, 0xffaa00, 'bold', 0);
    console.log('[MATCH] Jogo pausado automaticamente');
  }
}

/**
 * Handler para despausar partida
 *
 * @param {object} room - Instancia da sala Haxball
 * @param {object} gameState - Estado do jogo
 * @param {object} player - Jogador que despausou (null se automatico)
 */
function handleUnpause(room, gameState, player = null) {
  if (!room || !gameState) return;

  gameState.paused = false;

  if (player) {
    announce(room, `▶️ Jogo despausado por ${player.name}`, null, 0x00ff00, 'bold', 0);
    console.log(`[MATCH] Jogo despausado por ${player.name}`);
  } else {
    announce(room, `▶️ Jogo despausado`, null, 0x00ff00, 'bold', 0);
    console.log('[MATCH] Jogo despausado automaticamente');
  }
}

/**
 * Handler para atualizar status do jogo
 * Atualiza informacoes de tempo e estado
 *
 * @param {object} room - Instancia da sala Haxball
 * @param {object} gameState - Estado do jogo
 */
function updateGameStatus(room, gameState) {
  if (!room || !gameState) return;

  const scores = room.getScores();

  if (scores) {
    gameState.time = Math.floor(scores.time);
    gameState.redScore = scores.red;
    gameState.blueScore = scores.blue;
  }

  const ballProps = room.getDiscProperties(0);
  if (ballProps) {
    gameState.ballRadius = ballProps.radius;
  }
}

module.exports = {
  handleMatchStart,
  handleMatchEnd,
  handleExtraTime,
  calculateExtraTime,
  handlePause,
  handleUnpause,
  updateGameStatus,
  ensureStatsRegistration,
  buildFallbackBasicStats,
  autoAdjustMapForPlayerCount,
  startGameIfReadyWithAfk,
  startStatsCollector,
  finalizeMatchStats,
};

//   __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
