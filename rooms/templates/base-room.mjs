import { buildRoomContext, applyHooks, attachStatsPipeline } from '../../core/room-engine.mjs';
import { messages, uniforms, rules } from '../../shared/config/index.js';

// Esqueleto generico para scripts de sala
export function createRoomModule(sharedOverrides = {}) {
  return {
    name: 'base-room',
    init({ room, settings = {}, db = null }) {
      const context = buildRoomContext({
        room,
        sharedConfig: { messages, uniforms, rules, ...sharedOverrides },
        settings,
        db,
      });

      const handlers = {
        onPlayerJoin: ({ context }, player) => {
          room.sendChat(context.config.messages.welcome(player.name));
          context.state.players.set(player.id, { name: player.name, joinedAt: Date.now() });
        },
        onPlayerLeave: ({ context }, player) => {
          context.state.players.delete(player.id);
          room.sendChat(context.config.messages.goodbye(player.name));
        },
        onTeamGoal: ({ context }, team) => {
          room.sendChat(context.config.messages.goal({ scorer: 'desconhecido', team }));
        },
      };

      applyHooks(room, handlers, context);
      attachStatsPipeline(room, context);

      return { room, context };
    },
  };
}

//    __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
