import {
  advancedStats,
  baseStats,
  messages,
  positions,
  rules,
  scorePlayer,
  splitTeams,
  uniforms,
} from '../shared/config/index.js';

// Construtor de contexto padrao para scripts de sala
export function buildRoomContext({ room, sharedConfig = {}, settings = {}, db = null }) {
  return {
    room,
    settings,
    config: {
      messages: sharedConfig.messages ?? messages,
      uniforms: sharedConfig.uniforms ?? uniforms,
      rules: sharedConfig.rules ?? rules,
      stats: {
        base: sharedConfig.baseStats ?? baseStats,
        advanced: sharedConfig.advancedStats ?? advancedStats,
      },
      balance: {
        scorePlayer,
        splitTeams,
      },
      positions,
    },
    state: {
      players: new Map(),
      recentPerformance: new Map(),
      lastSample: Date.now(),
      statsBuffer: [],
    },
    db,
  };
}

// Aplica handlers declarados para eventos conhecidos
export function applyHooks(room, handlers, context) {
  const mapping = {
    onPlayerJoin: 'onPlayerJoin',
    onPlayerLeave: 'onPlayerLeave',
    onTeamGoal: 'onTeamGoal',
    onTeamVictory: 'onTeamVictory',
    onGameTick: 'onGameTick',
    onGameStart: 'onGameStart',
    onGameStop: 'onGameStop',
  };

  Object.entries(mapping).forEach(([key, event]) => {
    if (typeof handlers?.[key] === 'function') {
      room[event] = (...args) => handlers[key]({ room, context }, ...args);
    }
  });
}

// Coletor simples de estatisticas em memoria
export function attachStatsPipeline(room, context) {
  if (!context?.config?.stats?.base?.touches) return;

  // Buffer de eventos (touches, goals) e armazenamento em DB periodico se context.db presente
  room.onPlayerBallKick = (player) => {
    context.state.statsBuffer.push({
      type: 'touch',
      playerId: player.id,
      at: Date.now(),
    });
  };

  room.onTeamGoal = (team) => {
    context.state.statsBuffer.push({ type: 'goal', team, at: Date.now() });
  };

  // Ao iniciar jogo, criar room_session e match se DB estiver disponivel
  if (context.db) {
    const originalOnGameStart = room.onGameStart;
    room.onGameStart = async (...args) => {
      try {
        const sessionId = await context.db.createRoomSession(
          room.getName ? room.getName() : 'unknown'
        );
        const matchId = await context.db.createMatch(sessionId);
        context.state.currentMatchId = matchId;
      } catch (e) {
        // ignore failures - DB optional
      }
      if (typeof originalOnGameStart === 'function') {
        originalOnGameStart.call(room, ...args);
      }
    };

    const originalOnGameStop = room.onGameStop;
    room.onGameStop = async (...args) => {
      // Flush stats buffer to DB
      try {
        const insertMatchEvent = context.db.insertMatchEvent;
        const ensureUserByName = context.db.ensureUserByName;
        const incrementStatCount = context.db.incrementStatCount;
        const logEvent = context.db.logEvent;
        const matchId = context.state.currentMatchId;
        if (!matchId) return;
        while (context.state.statsBuffer.length > 0) {
          const ev = context.state.statsBuffer.shift();
          if (!ev) continue;
          if (ev.type === 'touch') {
            const player = context.state.players.get(ev.playerId);
            const userId = player ? await ensureUserByName(player.name) : null;
            await insertMatchEvent(
              matchId,
              userId,
              'touch',
              { playerId: ev.playerId, at: ev.at },
              ev.at
            );
            if (userId) await incrementStatCount(matchId, userId, 'touches');
          } else if (ev.type === 'goal') {
            // Goals are team-based; we can increment team stats or find the scorer via context
            await insertMatchEvent(matchId, null, 'goal', { team: ev.team, at: ev.at }, ev.at);
          }
        }
      } catch (e) {
        // ignore DB errors
      }
      if (typeof originalOnGameStop === 'function') {
        originalOnGameStop.call(room, ...args);
      }
    };
  }
}

//    __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
