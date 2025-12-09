/**
 * Exemplo de Bot Migrado - Futsal 4v4
 * Compativel com haxball.js v5.0.0+
 *
 * Este e um exemplo de como adaptar um script de bot legado (Puppeteer)
 * para a nova arquitetura de haxball.js nativo
 */

// Configuracao do jogo
const gameConfig = {
  minPlayers: 2,
  maxTeamSize: 4,
  ballResetTime: 3000,
  scoreLimit: 5,
};

// Estado do jogo
let gameState = {
  redTeam: [],
  blueTeam: [],
  gameActive: false,
  redScore: 0,
  blueScore: 0,
  lastBallReset: Date.now(),
};

/**
 * Gerenciar entrada de jogador
 * Distribui jogadores entre times de forma equilibrada
 */
room.onPlayerJoin = function (player) {
  // Contar jogadores por time
  const redCount = gameState.redTeam.length;
  const blueCount = gameState.blueTeam.length;

  // Distribuir jogador para o time menor
  if (redCount <= blueCount) {
    gameState.redTeam.push(player);
    room.setPlayerTeam(player.id, 1); // 1 = Red
    room.sendChat(`${player.name} entrou no time VERMELHO (${redCount + 1})`);
  } else {
    gameState.blueTeam.push(player);
    room.setPlayerTeam(player.id, 2); // 2 = Blue
    room.sendChat(`${player.name} entrou no time AZUL (${blueCount + 1})`);
  }

  // Checar se pode comeccar jogo
  if (
    gameState.redTeam.length >= gameConfig.minPlayers &&
    gameState.blueTeam.length >= gameConfig.minPlayers
  ) {
    room.sendChat('Suficientes jogadores! Digite !start para comeccar');
  }
};

/**
 * Gerenciar saida de jogador
 */
room.onPlayerLeave = function (player) {
  // Remover do time
  gameState.redTeam = gameState.redTeam.filter((p) => p.id !== player.id);
  gameState.blueTeam = gameState.blueTeam.filter((p) => p.id !== player.id);

  room.sendChat(`${player.name} saiu da sala`);

  // Parar jogo se muito poucos jogadores
  const totalPlayers = gameState.redTeam.length + gameState.blueTeam.length;
  if (totalPlayers < gameConfig.minPlayers && gameState.gameActive) {
    room.stopGame();
    gameState.gameActive = false;
    room.sendChat('Jogo parou: Jogadores insuficientes');
  }
};

/**
 * Gerenciar mensagens de chat
 * Processa comandos e responde ao chat
 */
room.onPlayerChat = function (player, message) {
  // Comandos
  if (message.startsWith('!')) {
    const cmd = message.split(' ')[0].toLowerCase();

    if (cmd === '!start') {
      if (
        gameState.redTeam.length >= gameConfig.minPlayers &&
        gameState.blueTeam.length >= gameConfig.minPlayers
      ) {
        room.startGame();
        gameState.gameActive = true;
        gameState.redScore = 0;
        gameState.blueScore = 0;
        room.sendChat('Jogo comecou!');
      } else {
        room.sendChat('Jogadores insuficientes para comecar');
      }
      return false; // Nao exibir comando no chat
    }

    if (cmd === '!stop') {
      if (gameState.gameActive) {
        room.stopGame();
        gameState.gameActive = false;
        room.sendChat('Jogo parado');
      }
      return false;
    }

    if (cmd === '!status') {
      const status = `
STATUS DO JOGO
Vermelho: ${gameState.redTeam.length} jogadores | Score: ${gameState.redScore}
Azul: ${gameState.blueTeam.length} jogadores | Score: ${gameState.blueScore}
Ativo: ${gameState.gameActive ? 'Sim' : 'Nao'}`;
      room.sendChat(status);
      return false;
    }

    if (cmd === '!help') {
      room.sendChat('Comandos: !start, !stop, !status, !help, !reset');
      return false;
    }

    if (cmd === '!reset') {
      gameState.redScore = 0;
      gameState.blueScore = 0;
      room.sendChat('Score resetado');
      return false;
    }
  }

  return true; // Exibir mensagem normalmente
};

/**
 * Gerenciar gol
 */
room.onGoal = function (player) {
  if (player.team === 1) {
    gameState.redScore++;
    room.sendChat(`⚽ GOL! Vermelho: ${gameState.redScore} x ${gameState.blueScore}`);
  } else if (player.team === 2) {
    gameState.blueScore++;
    room.sendChat(`⚽ GOL! Azul: ${gameState.blueScore} x ${gameState.redScore}`);
  }

  // Checar vitoria
  if (gameState.redScore >= gameConfig.scoreLimit) {
    room.sendChat(`🏆 Vermelho venceu ${gameState.redScore}x${gameState.blueScore}!`);
    room.stopGame();
    gameState.gameActive = false;
  } else if (gameState.blueScore >= gameConfig.scoreLimit) {
    room.sendChat(`🏆 Azul venceu ${gameState.blueScore}x${gameState.redScore}!`);
    room.stopGame();
    gameState.gameActive = false;
  }
};

/**
 * Gerenciar reset de bola
 * Se a bola fica parada muito tempo, resetar posicao
 */
room.onGameTick = function () {
  if (!room.getBallTrajectory || Date.now() - gameState.lastBallReset > gameConfig.ballResetTime) {
    return;
  }

  const ball = room.getBallTrajectory?.();
  if (ball && ball.pos.x !== 0 && ball.pos.y !== 0) {
    gameState.lastBallReset = Date.now();
  }
};

/**
 * Inicializacao
 */
room.sendChat('Bot Futsal carregado! Digite !help para comandos');

//    __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
