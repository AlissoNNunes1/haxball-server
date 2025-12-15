// Handler global para eventos de gol, assistencia e gol contra
// Centraliza logica de gol e padroniza mensagens

const { announce } = require('../config/messages.cjs');
const { formatPlayerName } = require('./playerHandlers.cjs');

// Mensagens padronizadas (podem ser customizadas por sala)
const DEFAULT_GOAL_MESSAGES = {
  goal: {
    red: '⚽ GOLAÇO DO TIME VERMELHO!',
    blue: '⚽ GOLAÇO DO TIME AZUL!',
  },
  ownGoal: {
    red: '🤦 GOL CONTRA! Time vermelho marcou contra si mesmo!',
    blue: '🤦 GOL CONTRA! Time azul marcou contra si mesmo!',
  },
  assist: 'Assistência de: {player}',
  time: 'Marcado aos {time}',
  scorer: 'Gol de: {player}',
  score: 'Vermelho {red} - {blue} Azul',
};

/**
 * Converte tempo em segundos para formato MM:SS
 * Exemplo: 225 segundos vira "3:45"
 *
 * @param {number} timeInSeconds - Tempo em segundos
 * @returns {string} Tempo formatado em MM:SS
 */
function formatGameTime(timeInSeconds) {
  if (typeof timeInSeconds !== 'number' || timeInSeconds < 0) return '0:00';

  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Calcula informacoes do gol baseado no estado do jogo
 * Detecta gol normal, gol contra e assistencia
 *
 * @param {object} gameState - Estado do jogo com info de ultimo e penultimo chutador
 * @param {number} team - Time que marcou (1 = vermelho, 2 = azul)
 * @param {object} room - Instancia da sala Haxball (para scores)
 * @returns {object} Informacoes do gol
 */
function calculateGoalInfo(gameState, team, room) {
  if (!gameState || !room) return null;

  const scores = room.getScores();
  const goalTime = formatGameTime(scores.time);

  const goalInfo = {
    team: team,
    isOwnGoal: false,
    scorer: null,
    assister: null,
    goalTime: goalTime,
    redScore: scores.red || 0,
    blueScore: scores.blue || 0,
  };

  // Determina quem marcou o gol
  if (gameState.lastKickerId && gameState.lastKickerName && gameState.lastKickerTeam) {
    goalInfo.scorer = {
      id: gameState.lastKickerId,
      name: gameState.lastKickerName,
      team: gameState.lastKickerTeam,
    };

    // Verifica se foi gol contra
    if (gameState.lastKickerTeam !== team) {
      goalInfo.isOwnGoal = true;
    }
  }

  // Determina assistencia
  if (
    !goalInfo.isOwnGoal &&
    gameState.secondLastKickerId &&
    gameState.secondLastKickerName &&
    gameState.secondLastKickerTeam === team &&
    gameState.lastKickerId !== gameState.secondLastKickerId
  ) {
    goalInfo.assister = {
      id: gameState.secondLastKickerId,
      name: gameState.secondLastKickerName,
      team: gameState.secondLastKickerTeam,
    };
  }

  // Se foi gol contra e tem segundo chutador do time que marcou
  if (
    goalInfo.isOwnGoal &&
    gameState.secondLastKickerId &&
    gameState.secondLastKickerTeam === team
  ) {
    goalInfo.assister = {
      id: gameState.secondLastKickerId,
      name: gameState.secondLastKickerName,
      team: gameState.secondLastKickerTeam,
    };
  }

  return goalInfo;
}

/**
 * Anuncia gol com todas as informacoes formatadas
 * Usa tags visuais nos nomes dos jogadores
 *
 * @param {object} room - Instancia da sala Haxball
 * @param {object} goalInfo - Informacoes do gol
 * @param {object} customMessages - Mensagens customizadas (opcional)
 */
function announceGoal(room, goalInfo, customMessages = null) {
  if (!room || !goalInfo) return;

  const messages = customMessages || DEFAULT_GOAL_MESSAGES;

  // Cor do anuncio
  const color = goalInfo.isOwnGoal ? 0xff6600 : goalInfo.team === 1 ? 0xff0000 : 0x0000ff;

  // Linha 1: Tipo de gol
  let message = '';
  if (goalInfo.isOwnGoal) {
    const teamName = goalInfo.team === 1 ? 'red' : 'blue';
    message += messages.ownGoal[teamName] || DEFAULT_GOAL_MESSAGES.ownGoal[teamName];
  } else {
    const teamName = goalInfo.team === 1 ? 'red' : 'blue';
    message += messages.goal[teamName] || DEFAULT_GOAL_MESSAGES.goal[teamName];
  }

  announce(room, message, null, color, 'bold', 2);

  // Linha 2: Scorer
  if (goalInfo.scorer) {
    const scorerPlayer = room.getPlayer(goalInfo.scorer.id);
    if (scorerPlayer) {
      const scorerName = formatPlayerName(room, scorerPlayer);
      const scorerMsg = goalInfo.isOwnGoal
        ? `Gol contra de: ${scorerName}`
        : `Gol de: ${scorerName}`;
      announce(room, scorerMsg, null, 0xffff00, 'bold', 1);
    }
  }

  // Linha 3: Assister (se houver)
  if (goalInfo.assister) {
    const assisterPlayer = room.getPlayer(goalInfo.assister.id);
    if (assisterPlayer) {
      const assisterName = formatPlayerName(room, assisterPlayer);
      const assisterMsg = goalInfo.isOwnGoal
        ? `Chute de: ${assisterName}`
        : `Assistência de: ${assisterName}`;
      announce(room, assisterMsg, null, 0xaaffaa, 'normal', 1);
    }
  }

  // Linha 4: Placar
  const scoreMsg = `Vermelho ${goalInfo.redScore} - ${goalInfo.blueScore} Azul`;
  announce(room, scoreMsg, null, 0xffffff, 'bold', 1);

  // Linha 5: Tempo
  const timeMsg = `Marcado aos ${goalInfo.goalTime}`;
  announce(room, timeMsg, null, 0xaaaaaa, 'normal', 0);

  // Linha em branco para separacao
  announce(room, '', null, null, null, 0);
}

/**
 * Handler completo para evento onTeamGoal
 * Calcula informacoes e anuncia gol
 *
 * @param {object} room - Instancia da sala Haxball
 * @param {number} team - Time que marcou (1 = vermelho, 2 = azul)
 * @param {object} gameState - Estado do jogo
 * @param {object} options - Opcoes adicionais
 * @param {object} options.customMessages - Mensagens customizadas (opcional)
 * @param {function} options.onGoal - Callback apos processar gol (opcional)
 */
function handleGoal(room, team, gameState, options = {}) {
  if (!room || !gameState) return;

  // Calcula informacoes do gol
  const goalInfo = calculateGoalInfo(gameState, team, room);

  if (!goalInfo) {
    console.error('[GOAL] Erro ao calcular informacoes do gol');
    return;
  }

  // Anuncia gol
  announceGoal(room, goalInfo, options.customMessages);

  // Log para auditoria
  console.log(`[GOAL] Time ${team} marcou. Placar: ${goalInfo.redScore}-${goalInfo.blueScore}`);

  // Callback customizado (para stats, celebracao, etc)
  if (options.onGoal && typeof options.onGoal === 'function') {
    options.onGoal(room, goalInfo);
  }

  // Limpa ultimo chutador apos processar gol
  gameState.lastKickerId = undefined;
  gameState.lastKickerName = undefined;
  gameState.lastKickerTeam = undefined;
  gameState.secondLastKickerId = undefined;
  gameState.secondLastKickerName = undefined;
  gameState.secondLastKickerTeam = undefined;
}

module.exports = {
  formatGameTime,
  calculateGoalInfo,
  announceGoal,
  handleGoal,
  DEFAULT_GOAL_MESSAGES,
};

//   __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
