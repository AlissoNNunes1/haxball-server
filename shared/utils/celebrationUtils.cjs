// Modulo para utilidades de comemoracao e animacoes visuais

/**
 * Funcao auxiliar para criar delays assincronos
 * @param {number} time - Tempo em milissegundos
 * @returns {Promise<void>}
 */
function sleep(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

/**
 * Celebracao de avatar com efeito piscante
 * Alterna o avatar do jogador entre presente e ausente para criar efeito visual
 *
 * @param {object} room - Instancia da sala Haxball
 * @param {number} playerId - ID do jogador
 * @param {string} avatar - Avatar a ser exibido (emoji ou string)
 * @param {object} options - Opcoes adicionais
 * @param {number} options.duration - Duracao total da animacao em ms (padrao: 3250ms)
 * @param {number} options.interval - Intervalo entre piscadas em ms (padrao: 250ms)
 *
 * @example
 * // Celebracao basica com emoji
 * avatarCelebration(room, player.id, '⚽');
 *
 * @example
 * // Celebracao customizada com duracao maior
 * avatarCelebration(room, player.id, '🎉', { duration: 5000, interval: 200 });
 */
function avatarCelebration(room, playerId, avatar, options = {}) {
  const { duration = 3250, interval = 250 } = options;

  // Calcula numero de piscadas baseado na duracao e intervalo
  const blinks = Math.floor(duration / interval);

  // Cria sequencia de piscadas
  for (let i = 0; i < blinks; i++) {
    const delay = i * interval;
    const showAvatar = i % 2 === 0; // Alterna entre mostrar e esconder

    sleep(delay).then(() => {
      room.setPlayerAvatar(playerId, showAvatar ? avatar : null);
    });
  }

  // Garante que avatar final esta visivel
  sleep(duration).then(() => {
    room.setPlayerAvatar(playerId, avatar);
  });
}

/**
 * Aviso visual na bola usando efeito de cores piscantes
 * Usado para indicar eventos importantes ou alertas
 *
 * @param {object} room - Instancia da sala Haxball
 * @param {object} gameState - Estado do jogo com propriedade warningCount
 * @param {string} origColour - Cor original da bola (formato: '0xRRGGBB')
 * @param {number} warningCount - Contador de avisos atual
 * @param {object} options - Opcoes adicionais
 * @param {string} options.warningColor - Cor usada no aviso (padrao: '0xffffff' - branco)
 * @param {number} options.duration - Duracao total da animacao em ms (padrao: 1400ms)
 * @param {number} options.interval - Intervalo entre piscadas em ms (padrao: 200ms)
 *
 * @example
 * // Aviso basico com cor branca
 * ballWarning(room, gameState, '0xff0000', gameState.warningCount);
 *
 * @example
 * // Aviso customizado com cor amarela
 * ballWarning(room, gameState, '0xff0000', gameState.warningCount, {
 *   warningColor: '0xffff00',
 *   duration: 2000
 * });
 */
function ballWarning(room, gameState, origColour, warningCount, options = {}) {
  const { warningColor = '0xffffff', duration = 1400, interval = 200 } = options;

  // Calcula numero de piscadas
  const blinks = Math.floor(duration / interval);

  // Cria sequencia de piscadas da bola
  for (let i = 0; i <= blinks; i++) {
    const delay = i * interval;
    const useWarningColor = i % 2 === 0; // Alterna entre cor original e cor de aviso

    sleep(delay).then(() => {
      // Verifica se ainda e o mesmo aviso (evita conflitos com multiplos avisos)
      if (gameState.warningCount === warningCount) {
        room.setDiscProperties(0, {
          color: useWarningColor ? warningColor : origColour,
        });
      }
    });
  }
}

/**
 * Celebracao de gol com avatar piscante
 * Conveniencia wrapper para avatarCelebration especifico para gols
 *
 * @param {object} room - Instancia da sala Haxball
 * @param {number} playerId - ID do jogador que marcou
 * @param {string} avatar - Avatar de comemoracao (padrao: '⚽')
 *
 * @example
 * // Celebracao padrao de gol
 * goalCelebration(room, scorer.id);
 *
 * @example
 * // Celebracao de gol com emoji customizado
 * goalCelebration(room, scorer.id, '🔥');
 */
function goalCelebration(room, playerId, avatar = '⚽') {
  avatarCelebration(room, playerId, avatar, {
    duration: 3000,
    interval: 250,
  });
}

/**
 * Celebracao de assistencia com avatar piscante
 * Conveniencia wrapper para avatarCelebration especifico para assistencias
 *
 * @param {object} room - Instancia da sala Haxball
 * @param {number} playerId - ID do jogador que deu assistencia
 * @param {string} avatar - Avatar de comemoracao (padrao: '👟')
 *
 * @example
 * // Celebracao padrao de assistencia
 * assistCelebration(room, assister.id);
 *
 * @example
 * // Celebracao de assistencia com emoji customizado
 * assistCelebration(room, assister.id, '🎯');
 */
function assistCelebration(room, playerId, avatar = '👟') {
  avatarCelebration(room, playerId, avatar, {
    duration: 2000,
    interval: 250,
  });
}

/**
 * Aviso de impedimento com efeito visual na bola
 * Conveniencia wrapper para ballWarning especifico para impedimento
 *
 * @param {object} room - Instancia da sala Haxball
 * @param {object} gameState - Estado do jogo
 * @param {string} ballColor - Cor original da bola
 *
 * @example
 * offsideWarning(room, gameState, '0xffffff');
 */
function offsideWarning(room, gameState, ballColor) {
  gameState.warningCount = (gameState.warningCount || 0) + 1;
  ballWarning(room, gameState, ballColor, gameState.warningCount, {
    warningColor: '0xffaa00', // Laranja para impedimento
    duration: 1000,
  });
}

/**
 * Aviso de falta com efeito visual na bola
 * Conveniencia wrapper para ballWarning especifico para faltas
 *
 * @param {object} room - Instancia da sala Haxball
 * @param {object} gameState - Estado do jogo
 * @param {string} ballColor - Cor original da bola
 *
 * @example
 * foulWarning(room, gameState, '0xffffff');
 */
function foulWarning(room, gameState, ballColor) {
  gameState.warningCount = (gameState.warningCount || 0) + 1;
  ballWarning(room, gameState, ballColor, gameState.warningCount, {
    warningColor: '0xff0000', // Vermelho para falta
    duration: 1200,
  });
}

module.exports = {
  sleep,
  avatarCelebration,
  ballWarning,
  goalCelebration,
  assistCelebration,
  offsideWarning,
  foulWarning,
};

/*   __  ____ ____ _  _ 
 / _\/ ___) ___) )( \
/    \___ \___ ) \/ (
\_/\_(____(____|____/ */
