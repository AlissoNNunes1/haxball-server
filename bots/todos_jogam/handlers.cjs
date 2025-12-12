//Handlers para sala Todos Jogam
//Sistema simplificado sem autenticacao - todos podem jogar

const { getFutsalMap } = require('../../shared/config/maps.cjs');
const { announce, whisper } = require('../cirs-stadium/messages.cjs');
const { processCommand } = require('../../shared/config/commands.cjs');
const { getAuthDb } = require('../../dist/database/auth-client');
const {
  setPlayerAFK,
  isPlayerAFK,
  isAFKTimeout,
  removeAFKPlayer,
  clearAFKPlayers,
  balanceTeams,
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
    announce(`🗺️ Mapa ajustado para ${count} jogadores`);
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
    announce('⚽ Iniciando partida em 3 segundos...', null, 0xffaa00);
    setTimeout(() => {
      room.startGame();
      gameState.started = true;
      announce('🎮 BOA SORTE A TODOS!', null, 0x00ff00);
    }, 3000);
  }
}

function updatePlayerActivity(playerId) {
  const now = Date.now();
  if (gameState.afkPlayers.has(playerId)) {
    const afkData = gameState.afkPlayers.get(playerId);
    afkData.lastActivity = now;
    afkData.warnings = 0;
  } else {
    gameState.afkPlayers.set(playerId, { lastActivity: now, warnings: 0 });
  }
}

// Verificacao global de AFK timeout (10 minutos)
const AFK_CHECK_INTERVAL = 30000; // Verifica a cada 30 segundos

setInterval(() => {
  const players = room.getPlayerList().filter((p) => p.id !== 0);

  for (const player of players) {
    if (isPlayerAFK(player.id) && isAFKTimeout(player.id)) {
      announce(`${player.name} foi kickado por ficar AFK por mais de 10 minutos`, null, 0xff0000);
      removeAFKPlayer(player.id);
      room.kickPlayer(player.id, 'AFK timeout (10 minutos)', false);
    }
  }
}, AFK_CHECK_INTERVAL);

// Anuncios periodicos da comunidade (a cada 5 minutos)
const ANNOUNCEMENT_INTERVAL = 5 * 60 * 1000; // 5 minutos

setInterval(() => {
  announce('', null, null, null, 0);
  announce('═══════════════════════════════════', null, 0x55aaff, 'bold', 1);
  announce('🏆 COMUNIDADE CIRS - REAL SOCCER', null, 0x00ff00, 'bold', 2);
  announce('═══════════════════════════════════', null, 0x55aaff, 'bold', 1);
  announce('Entre no nosso Discord: https://discord.gg/b2km7nvHP7', null, 0xffaa00, 'bold', 1);
  announce('Participe de campeonatos, ligas e eventos!', null, 0xaaaaaa, 'normal', 1);
  announce('═══════════════════════════════════', null, 0x55aaff, 'bold', 1);
  announce('', null, null, null, 0);
}, ANNOUNCEMENT_INTERVAL);

// Verificacao global de AFK timeout (10 minutos)
const AFK_CHECK_INTERVAL = 30000; // Verifica a cada 30 segundos

setInterval(() => {
  const players = room.getPlayerList().filter((p) => p.id !== 0);

  for (const player of players) {
    if (isPlayerAFK(player.id) && isAFKTimeout(player.id)) {
      announce(`${player.name} foi kickado por ficar AFK por mais de 10 minutos`, null, 0xff0000);
      removeAFKPlayer(player.id);
      room.kickPlayer(player.id, 'AFK timeout (10 minutos)', false);
    }
  }
}, AFK_CHECK_INTERVAL);

// Anuncios periodicos da comunidade (a cada 5 minutos)
const ANNOUNCEMENT_INTERVAL = 5 * 60 * 1000; // 5 minutos

//===========================================
// HANDLERS DE EVENTOS
//===========================================

room.onPlayerJoin = function (player) {
  announce(`${player.name} entrou na sala!`, null, 0x00ff00);

  // Mensagens de boas-vindas
  whisper('', player.id, null, null, 0);
  whisper('═══════════════════════════', player.id, 0x55aaff, 'bold', 1);
  whisper('🎮 BEM-VINDO AO TODOS JOGAM!', player.id, 0x00ff00, 'bold', 2);
  whisper('═══════════════════════════', player.id, 0x55aaff, 'bold', 1);
  whisper('', player.id, null, null, 0);
  whisper('✓ Aqui TODOS podem jogar, sem restricoes!', player.id, 0xaaaaaa, 'normal', 1);
  whisper(
    '✓ Mapa se ajusta automaticamente ao numero de jogadores',
    player.id,
    0xaaaaaa,
    'normal',
    1
  );
  whisper('✓ Times balanceados automaticamente', player.id, 0xaaaaaa, 'normal', 1);
  whisper('✓ Jogo inicia automaticamente com 4+ jogadores', player.id, 0xaaaaaa, 'normal', 1);
  whisper('', player.id, null, null, 0);
  whisper('Digite !help para ver todos os comandos disponiveis', player.id, 0xffaa00, 'bold', 1);
  whisper('', player.id, null, null, 0);

  // Verifica conta para sugerir login
  try {
    const db = getAuthDb();
    const account = db.getAccountByNick(player.name);

    if (account) {
      whisper('Conta encontrada no CIRS!', player.id, 0x00ff00, 'bold', 1);
      whisper('Use !login <senha> para autenticar', player.id, 0xffaa00, 'bold', 1);
      whisper(`Tag: [${account.ranking}] ${account.haxballNick}`, player.id, 0xaaaaaa, 'normal', 1);
    } else {
      whisper(
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
  announce(`${player.name} saiu da sala`, null, 0xff0000);
  gameState.playerCount--;

  // Remove jogador do sistema AFK global
  removeAFKPlayer(player.id);

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
        whisper('Voce foi movido para o time azul', player.id, 0x0000ff, 'normal', 1);
      } else if (p.team === 2) {
        room.setPlayerTeam(player.id, 1);
        whisper('Voce foi movido para o time vermelho', player.id, 0xff0000, 'normal', 1);
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

  announce('', null, null, null, 0);
  announce('═══════════════════════════', null, color);
  announce(`⚽ GOOOOL DO TIME ${teamName}!`, null, color);

  if (gameState.lastBallTouch && gameState.lastBallTouch.team === team) {
    announce(`Gol de ${gameState.lastBallTouch.player}!`, null, 0xffff00);
  }

  announce(`Placar: ${scores.red} x ${scores.blue}`, null, 0xffffff);
  announce('═══════════════════════════', null, color);
  announce('', null, null, null, 0);
};

room.onGameStart = function (byPlayer) {
  gameState.started = true;

  if (!byPlayer) {
    announce('', null, null, null, 0);
    announce('═══════════════════════════════════', null, 0x00ff00);
    announce('🎮 PARTIDA INICIADA!', null, 0x00ff00);
    announce('Jogo limpo e respeito sempre!', null, 0xffaa00);
    announce('═══════════════════════════════════', null, 0x00ff00);
    announce('', null, null, null, 0);
  }
};

room.onGameStop = function () {
  gameState.started = false;

  // Ajusta mapa apenas quando jogo parar
  updateMapForPlayerCount();
};

room.onGamePause = function () {
  announce('⏸️ Jogo pausado', null, 0xffaa00);
};

room.onGameUnpause = function () {
  announce('▶️ Jogo retomado', null, 0x00ff00);
};

room.onPositionsReset = function () {
  announce('Posicoes resetadas', null, 0xaaaaaa);
};

room.onTeamVictory = function (scores) {
  const winner = scores.red > scores.blue ? 'VERMELHO' : 'AZUL';
  const color = scores.red > scores.blue ? 0xff0000 : 0x0000ff;
  const score = `${scores.red} x ${scores.blue}`;

  announce('', null, null, null, 0);
  announce('=================================', null, 0xffaa00);
  announce(`🏆 TIME ${winner} VENCEU!`, null, color);
  announce(`Placar final: ${score}`, null, 0xffffff);
  announce('=================================', null, 0xffaa00);

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
