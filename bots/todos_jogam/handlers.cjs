//Handlers para sala Todos Jogam


const { getFutsalMap } = require('../../shared/config/maps.cjs');
const { announce, whisper, welcomeWhispers, startCommunityAnnouncements, matchStartAnnouncement, matchGoalAnnouncement, matchVictoryAnnouncement } = require('../../shared/config/messages.cjs');
const { processCommand } = require('../../shared/config/commands.cjs');
const { getAuthDb } = require('../../dist/database/auth-client');
const {
  setPlayerAFK,
  isPlayerAFK,
  isAFKTimeout,
  removeAFKPlayer,
  clearAFKPlayers,
  balanceTeams,
  clearPlayerTag,
} = require('../../shared/config/utils.cjs');
const room = globalThis.room;

let gameState = {
  started: false,
  redScore: 0,
  blueScore: 0,
  currentMap: null,
  mapBucket: null,
  playerCount: 0,
  lastBallTouch: null,
};

//===========================================
// UTILITARIOS
//===========================================

function updateMapForPlayerCount() {
  const playerList = room.getPlayerList().filter((p) => p.id !== 0);
  const count = playerList.length;

  let bucket;
  let newMap;

  // Sincronizado com getFutsalMap
  if (count <= 2) {
    bucket = 'tiny';
    newMap = getFutsalMap(2); // 1x1 ou 2x2
  } else if (count <= 6) {
    bucket = 'small';
    newMap = getFutsalMap(6); // 3x3 ou 4x4
  } else if (count <= 12) {
    bucket = 'mid';
    newMap = getFutsalMap(12); // 5x5 ou 6x6
  } else if (count <= 14) {
    bucket = 'x7';
    newMap = getFutsalMap(14); // 7x7
  } else {
    bucket = 'x8';
    newMap = getFutsalMap(16); // 8x8+
  }

  if (gameState.mapBucket !== bucket) {
    gameState.mapBucket = bucket;
    gameState.currentMap = newMap;
    room.setCustomStadium(newMap);
    announce(room, `🗺️ Mapa ajustado para ${count} jogadores`);
  }
}

function autoBalanceTeams() {
  balanceTeams(room, false);
}

function balanceTeamsWithScore() {
  balanceTeams(room, true);
}

function startGameIfReady() {
  const players = room.getPlayerList().filter((p) => p.id !== 0);
  const redCount = players.filter((p) => p.team === 1).length;
  const blueCount = players.filter((p) => p.team === 2).length;

  // Precisa pelo menos 1 jogadores em cada time
  if (redCount >= 1 && blueCount >= 1 && !gameState.started) {
    announce(room, '⚽ Iniciando partida em 3 segundos...', null, 0xffaa00);
    setTimeout(() => {
      room.startGame();
      gameState.started = true;
      announce(room, '🎮 BOA SORTE A TODOS!', null, 0x00ff00);
    }, 3000);
  }
}

// Verificacao global de AFK timeout (10 minutos)
var AFK_CHECK_INTERVAL = globalThis.__CIRS_AFK_CHECK_INTERVAL || 30000; globalThis.__CIRS_AFK_CHECK_INTERVAL = AFK_CHECK_INTERVAL;

setInterval(() => {
  const players = room.getPlayerList().filter((p) => p.id !== 0);

  for (const player of players) {
    if (isPlayerAFK(player.id) && isAFKTimeout(player.id)) {
      announce(room, `${player.name} foi kickado por ficar AFK por mais de 10 minutos`, null, 0xff0000);
      removeAFKPlayer(player.id);
      room.kickPlayer(player.id, 'AFK timeout (10 minutos)', false);
    }
  }
}, AFK_CHECK_INTERVAL);

// Anuncios periodicos da comunidade (a cada 5 minutos)
startCommunityAnnouncements(room, globalThis.__CIRS_ANNOUNCEMENT_INTERVAL || 5 * 60 * 1000);

//===========================================
// HANDLERS DE EVENTOS
//===========================================

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
      whisper(room, `Tag: [${account.ranking}] ${account.haxballNick}`, player.id, 0xaaaaaa, 'normal', 1);
    } else {
      whisper(room,
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
  setTimeout(() => {
    autoBalanceTeams();
  }, 100);
};

room.onPlayerChat = function (player, message) {
  // Processa comandos globais PRIMEIRO (inclui !help, !login, !afk, !bb, etc)
  const commandHandled = processCommand(room, player, message);
  if (commandHandled) return false;

  const msg = message.trim().toLowerCase();

  // Comandos especificos da sala
  if (msg === '!swap') {
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

  return true;
};

room.onPlayerBallKick = function (player) {
  gameState.lastBallTouch = { player: player.name, team: player.team, time: Date.now() };
};

room.onPlayerActivity = function (player) {
  // Registra atividade do jogador para sistema global de AFK
  if (isPlayerAFK(player.id)) {
    // Se esta em AFK, nao sai automaticamente - precisa usar !afk novamente
  }
};

room.onTeamGoal = function (team) {
  const teamName = team === 1 ? 'VERMELHO' : 'AZUL';
  const color = team === 1 ? 0xff0000 : 0x0000ff;
  const scores = room.getScores();

  // Mensagem padrao de gol + marcador
  matchGoalAnnouncement(room, teamName, gameState.lastBallTouch && gameState.lastBallTouch.team === team ? gameState.lastBallTouch.player : null);
  announce(room, `Placar: ${scores.red} x ${scores.blue}`, null, 0xffffff);
};

room.onGameStart = function (byPlayer) {
  gameState.started = true;

  if (!byPlayer) {
    // Mensagem padrao de inicio de partida
    matchStartAnnouncement(room);
  }
};

room.onGameStop = function () {
  gameState.started = false;

  // Ajusta mapa apenas quando jogo parar
  updateMapForPlayerCount();
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

room.onTeamVictory = function (scores) {
  const winner = scores.red > scores.blue ? 'VERMELHO' : 'AZUL';
  const color = scores.red > scores.blue ? 0xff0000 : 0x0000ff;
  const score = `${scores.red} x ${scores.blue}`;

  // Mensagem padrao de vitoria
  matchVictoryAnnouncement(room, winner, score);

  gameState.started = false;

  // Ajusta mapa para proxima partida
  updateMapForPlayerCount();

  // Prepara proxima partida com redistribuicao
  setTimeout(() => {
    balanceTeamsWithScore();
    startGameIfReady();
  }, 3000);
};

//   __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
