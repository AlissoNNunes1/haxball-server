//Modulo para utilitarios compartilhados

// Sistema global de AFK
const afkPlayers = new Map(); // { playerId: { timestamp: Date, warnings: number } }
const AFK_TIMEOUT = 10 * 60 * 1000; // 10 minutos em ms

/**
 * Define jogador em estado AFK
 * @param {number} playerId - ID do jogador
 * @param {boolean} state - true para ativar AFK, false para desativar
 */
function setPlayerAFK(playerId, state, prevTeam = null) {
  if (state) {
    afkPlayers.set(playerId, { timestamp: Date.now(), warnings: 0, prevTeam });
  } else {
    afkPlayers.delete(playerId);
  }
}

/**
 * Verifica se jogador esta em estado AFK
 * @param {number} playerId - ID do jogador
 * @returns {boolean}
 */
function isPlayerAFK(playerId) {
  return afkPlayers.has(playerId);
}

/**
 * Pega tempo em AFK (em ms)
 * @param {number} playerId - ID do jogador
 * @returns {number} Tempo em ms, ou 0 se nao esta AFK
 */
function getAFKTime(playerId) {
  if (!afkPlayers.has(playerId)) return 0;
  return Date.now() - afkPlayers.get(playerId).timestamp;
}

/**
 * Verifica se jogador passou do tempo limite de AFK
 * @param {number} playerId - ID do jogador
 * @returns {boolean}
 */
function isAFKTimeout(playerId) {
  return getAFKTime(playerId) > AFK_TIMEOUT;
}

/**
 * Remove jogador do mapa de AFK (usado ao deixar sala)
 * @param {number} playerId - ID do jogador
 */
function removeAFKPlayer(playerId) {
  const info = afkPlayers.get(playerId);
  afkPlayers.delete(playerId);
  return info?.prevTeam ?? null;
}

/**
 * Limpa todos os players AFK (usado ao resetar sala)
 */
function clearAFKPlayers() {
  afkPlayers.clear();
}

// Sistema de tags por sala (persistente na memoria do processo)
// Estrutura: globalThis.__CIRS_PLAYER_TAGS__ => Map<roomName, Map<playerId, tag>>
globalThis.__CIRS_PLAYER_TAGS__ = globalThis.__CIRS_PLAYER_TAGS__ || new Map();

/**
 * Define tag para um jogador sem alterar avatar
 * @param {object} room - instancia da sala Haxball
 * @param {number} playerId - ID do jogador
 * @param {string} tag - tag visual do jogador (ex: "[S1]")
 */
function setPlayerTag(room, playerId, tag) {
  const name = room && room.name ? room.name : 'default';
  const map = globalThis.__CIRS_PLAYER_TAGS__.get(name) || new Map();
  map.set(playerId, tag);
  globalThis.__CIRS_PLAYER_TAGS__.set(name, map);
}

/**
 * Retorna tag do jogador, ou null se nao definida
 * @param {object} room
 * @param {number} playerId
 * @returns {string|null}
 */
function getPlayerTag(room, playerId) {
  const name = room && room.name ? room.name : 'default';
  const map = globalThis.__CIRS_PLAYER_TAGS__.get(name);
  if (!map) return null;
  return map.get(playerId) || null;
}

/**
 * Limpa tag do jogador
 */
function clearPlayerTag(room, playerId) {
  const name = room && room.name ? room.name : 'default';
  const map = globalThis.__CIRS_PLAYER_TAGS__.get(name);
  if (!map) return;
  map.delete(playerId);
}

/**
 * Balanceia times de forma inteligente
 * @param {object} room - Instancia da sala Haxball
 * @param {boolean} useScore - Se true, considera placar da partida anterior
 */
function balanceTeams(room, useScore = false) {
  const players = room.getPlayerList().filter((p) => p.id !== 0);

  if (useScore) {
    // Balance considerando placar - para redistribuicao inteligente
    const scores = room.getScores();

    if (scores && (scores.red > 0 || scores.blue > 0)) {
      const winningTeam = scores.red > scores.blue ? 1 : 2;

      // Tenta carregar ranking dos jogadores
      const playersWithRanking = [];
      let db = null;

      try {
        const authModule = require('./../../dist/database/auth-client');
        db = authModule.getAuthDb();
      } catch (e) {
        // Database nao disponivel, usa balance simples
      }

      for (const player of players.filter((p) => p.team !== 0)) {
        try {
          const account = db ? db.getAccountByNick(player.name) : null;
          playersWithRanking.push({
            id: player.id,
            name: player.name,
            team: player.team,
            points: account ? account.points : 0,
            wasWinner: player.team === winningTeam,
          });
        } catch (error) {
          playersWithRanking.push({
            id: player.id,
            name: player.name,
            team: player.team,
            points: 0,
            wasWinner: player.team === winningTeam,
          });
        }
      }

      // Ordena por pontos (maior primeiro)
      playersWithRanking.sort((a, b) => b.points - a.points);

      // Distribui alternadamente para equilibrar
      playersWithRanking.forEach((p, index) => {
        const newTeam = index % 2 === 0 ? 1 : 2;
        if (p.team !== newTeam) {
          room.setPlayerTeam(p.id, newTeam);
        }
      });
    }
  } else {
    // Balance simples - coloca espectadores no time com menos jogadores
    const redCount = players.filter((p) => p.team === 1).length;
    const blueCount = players.filter((p) => p.team === 2).length;
    const specCount = players.filter((p) => p.team === 0).length;

    if (specCount > 0 && Math.abs(redCount - blueCount) > 0) {
      const specs = players.filter((p) => p.team === 0);
      for (const player of specs) {
        if (redCount < blueCount) {
          room.setPlayerTeam(player.id, 1);
          break;
        } else if (blueCount < redCount) {
          room.setPlayerTeam(player.id, 2);
          break;
        }
      }
    }
  }
}

function pointDistance(p1, p2) {
  var d1 = p1.x - p2.x;
  var d2 = p1.y - p2.y;
  return Math.sqrt(d1 * d1 + d2 * d2);
}

function sleep(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

function ballWarning(origColour, warningCount) {
  sleep(200).then(() => {
    if (game.warningCount == warningCount) {
      room.setDiscProperties(0, { color: '0xffffff' });
    }
  });
  sleep(400).then(() => {
    if (game.warningCount == warningCount) {
      room.setDiscProperties(0, { color: origColour });
    }
  });
  sleep(600).then(() => {
    if (game.warningCount == warningCount) {
      room.setDiscProperties(0, { color: '0xffffff' });
    }
  });
  sleep(800).then(() => {
    if (game.warningCount == warningCount) {
      room.setDiscProperties(0, { color: origColour });
    }
  });
  sleep(1000).then(() => {
    if (game.warningCount == warningCount) {
      room.setDiscProperties(0, { color: '0xffffff' });
    }
  });
  sleep(1200).then(() => {
    if (game.warningCount == warningCount) {
      room.setDiscProperties(0, { color: origColour });
    }
  });
  sleep(1400).then(() => {
    if (game.warningCount == warningCount) {
      room.setDiscProperties(0, { color: '0xffffff' });
    }
  });
}

module.exports = {
  pointDistance,
  sleep,
  ballWarning,
  setPlayerAFK,
  isPlayerAFK,
  getAFKTime,
  isAFKTimeout,
  removeAFKPlayer,
  clearAFKPlayers,
  balanceTeams,
  setPlayerTag,
  getPlayerTag,
  clearPlayerTag,
};

//   __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
