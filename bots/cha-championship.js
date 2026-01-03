// Bot de sala temporaria para campeonatos CHA
// Usa presets globais e desativa balanceamento automatico
// Integrado com autenticacao e coleta de estatisticas

const fs = require('fs');
const path = require('path');
const { getRealSoccerMap } = require('../shared/config/maps.cjs');
const { announce } = require('../shared/config/messages.cjs');
const { getAuthDb } = require('../dist/database/auth-client');
const { RoomAuthHandler } = require('../dist/auth/RoomAuthHandler');
const { StatsCollector } = require('../dist/stats/StatsCollector');
const { StatsService } = require('../dist/stats/StatsService');
const { StatsCalculator } = require('../dist/stats/StatsCalculator');

function parseGeo(geoValue) {
  try {
    if (typeof geoValue === 'string') return JSON.parse(geoValue);
    return geoValue;
  } catch (_) {
    return undefined;
  }
}

const settings = globalThis.customSettings || {};
const roomName = settings['reserved.haxball.roomName'] || settings.name || 'CHA Championship';
const maxPlayers = Number(settings['reserved.haxball.maxPlayers'] || 30);
const isPublic = settings['reserved.haxball.public'] !== false;
const password = settings['reserved.haxball.password'] || '';
const geo = parseGeo(settings['reserved.haxball.geo']) || {
  code: 'BR',
  lat: -23.5505,
  lon: -46.6333,
};

room = HBInit({
  roomName,
  password,
  maxPlayers,
  public: isPublic,
  token: settings.token,
  noPlayer: true,
  geo,
});

const mapPath = settings.map;
try {
  if (mapPath && typeof mapPath === 'string') {
    // Se for 'RSR', usa o mapa Real Soccer customizado
    if (mapPath === 'RSR') {
      room.setCustomStadium(getRealSoccerMap());
    } else {
      // Tenta carregar de arquivo - resolve relativo a raiz do projeto, nao ao diretorio bots/
      const projectRoot = path.resolve(__dirname, '..');
      const fullMapPath = path.resolve(projectRoot, mapPath);
      const mapContent = fs.readFileSync(fullMapPath, 'utf-8');
      room.setCustomStadium(mapContent);
    }
  } else {
    room.setCustomStadium(getRealSoccerMap());
  }
} catch (err) {
  console.log('Erro ao carregar mapa personalizado, usando padrao:', err?.message || err);
  room.setCustomStadium(getRealSoccerMap());
}

const timeLimit = settings['rule.matchTimeMinutes']
  ? Number(settings['rule.matchTimeMinutes'])
  : 20;
room.setScoreLimit(0);
room.setTimeLimit(timeLimit);

if (settings.homeTeam || settings.awayTeam) {
  const format = settings.format ? ` (${settings.format})` : '';
  announce(
    room,
    `Sala campeonato${format}: ${settings.homeTeam || 'Time A'} x ${settings.awayTeam || 'Time B'}`
  );
}

// Inicializa autenticacao
let authHandler = null;
try {
  authHandler = new RoomAuthHandler();
  authHandler.registerHandlers(room);
  console.log('[AUTH] Sistema de autenticacao inicializado no campeonato');
} catch (error) {
  console.error('[AUTH] Erro ao inicializar autenticacao:', error.message);
}

// Inicializa coleta de estatisticas
let statsCollector = null;
let statsService = null;
let gameState = {
  matchId: null,
  statsEnabled: false,
  redScore: 0,
  blueScore: 0,
};

try {
  const authDb = getAuthDb();
  const sqliteDb = authDb && authDb.sqlite ? authDb.sqlite : authDb;
  const calculator = new StatsCalculator();
  statsService = new StatsService(sqliteDb, calculator);
  console.log('[STATS] Sistema de estatisticas inicializado no campeonato');
} catch (error) {
  console.error('[STATS] Erro ao inicializar sistema de estatisticas:', error.message);
}

// Importa modulos de Real Soccer ANTES de carregar handlers
const variables = require('../shared/config/variables.cjs');
const { Game } = require('../bots/cha-stadium/rules.cjs');

// Configura variaveis globais para Real Soccer ANTES de carregar handlers
variables.map = settings.map || 'RSR';
variables.roomName = roomName;
variables.maxPlayers = maxPlayers;
variables.roomPublic = isPublic;
variables.roomPassword = password;
variables.gameTime = timeLimit;

// Inicializa jogo Real Soccer
globalThis.room = room;
globalThis.game = new Game();

// IMPORTANTE: Carrega handlers do Real Soccer ANTES dos handlers globais
// Os handlers do cha-stadium incluem toda a logica de Real Soccer
require('../bots/cha-stadium/handlers.cjs');

// Configura authHandler para sistema de tags no chat
// Importa funcao depois de carregar handlers para evitar conflito
const { setAuthHandler } = require('../shared/handlers/chatHandlers.cjs');
if (authHandler) {
  setAuthHandler(authHandler);
  console.log('[AUTH] AuthHandler configurado para sistema de chat');
}

// Inicializa coleta ao comecar partida
const originalGameStart = room.onGameStart;
room.onGameStart = function () {
  if (originalGameStart) originalGameStart();

  // Inicia StatsCollector se disponivel
  if (statsService && StatsCollector) {
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
            `[STATS] Jogador ${player.name} (accountId ${account.id}) registrado no campeonato`
          );
        }
      }
    }

    console.log(
      `[STATS] Coleta iniciada para matchId ${gameState.matchId} (${authenticatedCount}/${players.length} autenticados)`
    );
  }
};

// Finaliza coleta ao terminar partida
const originalGameStop = room.onGameStop;
room.onGameStop = function (byServer) {
  if (originalGameStop) originalGameStop(byServer);

  if (gameState.statsEnabled && statsCollector && statsService) {
    gameState.redScore = room.getScores().red;
    gameState.blueScore = room.getScores().blue;

    // Finaliza coleta e salva
    const matchData = statsCollector.finalize();
    console.log(
      `[STATS] Partida finalizada: Red ${gameState.redScore} x Blue ${gameState.blueScore}`
    );

    if (matchData && matchData.players && matchData.players.length > 0) {
      try {
        // Salva stats de cada jogador
        for (const playerStats of matchData.players) {
          statsService.savePlayerStats(
            playerStats.accountId,
            gameState.matchId,
            playerStats,
            gameState.redScore,
            gameState.blueScore
          );
        }
        console.log(`[STATS] ${matchData.players.length} stats salvas no banco de dados`);
      } catch (error) {
        console.error('[STATS] Erro ao salvar stats:', error.message);
      }
    }

    gameState.statsEnabled = false;
  }
};

//   __  ____ ____ _  _
// / _\/ ___) ___) )( \
//    \___ \___ ) \/ (
// \_/\_(____(____|____/
