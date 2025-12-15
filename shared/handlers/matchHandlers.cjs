// Handler global para eventos de inicio, fim e controle de partida
// Centraliza logica de gerenciamento de partidas

const { announce } = require('../config/messages.cjs');
const { formatGameTime } = require('./goalHandlers.cjs');

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
};

//   __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
