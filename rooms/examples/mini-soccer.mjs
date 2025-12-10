import { scorePlayer, splitTeams } from '../../shared/config/balance.js';
import { uniforms } from '../../shared/config/uniforms.js';
import { createRoomModule } from '../templates/base-room.mjs';

// Exemplo de sala simples usando balanceamento basico
export const miniSoccerRoom = createRoomModule({ uniforms });

miniSoccerRoom.init = ({ room, settings = {}, db = null }) => {
  const module = createRoomModule({ uniforms });
  const { context } = module.init({ room, settings, db });

  room.onGameStart = () => {
    const players = Array.from(context.state.players.entries()).map(([id, data]) => ({
      id,
      name: data.name,
      ratings: data.ratings ?? { overall: 1000, byPosition: { value: 1000 } },
      recent: data.recent ?? 0,
    }));
    const sorted = players.sort(
      (a, b) => scorePlayer(b.ratings, b.recent) - scorePlayer(a.ratings, a.recent)
    );
    const { red, blue } = splitTeams(sorted);
    red.forEach((p) => room.setPlayerTeam(p.id, 1));
    blue.forEach((p) => room.setPlayerTeam(p.id, 2));
  };

  // Example: record goals to DB if available
  const originalOnTeamGoal = room.onTeamGoal;
  room.onTeamGoal = async (team) => {
    if (context.db && context.state.currentMatchId) {
      const userId = null; // would find scorer here
      await context.db.insertMatchEvent(context.state.currentMatchId, userId, 'goal', {
        team,
        at: Date.now(),
      });
    }

    if (typeof originalOnTeamGoal === 'function') originalOnTeamGoal.call(room, team);
  };

  return { room, context };
};

//    __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
