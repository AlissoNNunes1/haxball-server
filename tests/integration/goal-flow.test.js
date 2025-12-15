/**
 * Testes de integracao para fluxo completo de gol
 * Testa a interacao entre goalHandlers e celebrationUtils
 */

const { handleGoal } = require('../../shared/handlers/goalHandlers.cjs');
const {
  goalCelebration,
  assistCelebration,
  avatarCelebration,
} = require('../../shared/utils/celebrationUtils.cjs');

describe('Goal Flow Integration', () => {
  let room;
  let gameState;
  let announcements;
  let avatarChanges;

  beforeEach(() => {
    announcements = [];
    avatarChanges = [];

    // Mock da sala Haxball
    room = {
      sendAnnouncement: jest.fn((msg, playerId, color, style, sound) => {
        announcements.push({ msg, playerId, color, style, sound });
      }),
      setPlayerAvatar: jest.fn((playerId, avatar) => {
        avatarChanges.push({ playerId, avatar });
      }),
      getPlayerList: jest.fn(() => [
        { id: 1, name: 'Player1', team: 1 },
        { id: 2, name: 'Player2', team: 1 },
        { id: 3, name: 'Player3', team: 2 },
        { id: 4, name: 'Player4', team: 2 },
      ]),
      getScores: jest.fn(() => ({ red: 1, blue: 0, time: 180, timeLimit: 300 })),
    };

    // Estado do jogo mockado
    gameState = {
      lastTouchTeam: 1,
      lastPlayersTouched: [
        { player: { id: 1, name: 'Player1', team: 1 }, time: 180 },
        { player: { id: 2, name: 'Player2', team: 1 }, time: 178 },
      ],
    };
  });

  describe('Fluxo de Gol Normal com Assistencia', () => {
    test('deve processar gol completo com celebracoes', async () => {
      const callbacks = {
        onScorerCelebration: jest.fn((room, scorer) => {
          avatarCelebration(room, scorer, { duration: 500 });
        }),
        onAssisterCelebration: jest.fn((room, assister) => {
          assistCelebration(room, assister, { duration: 300 });
        }),
      };

      handleGoal(room, 1, gameState, {}, callbacks);

      // Verifica se callbacks foram chamados
      expect(callbacks.onScorerCelebration).toHaveBeenCalled();
      expect(callbacks.onAssisterCelebration).toHaveBeenCalled();

      // Verifica anuncios de gol
      const goalAnnouncements = announcements.filter((a) => a.msg.includes('GOL'));
      expect(goalAnnouncements.length).toBeGreaterThan(0);

      // Verifica mencao do scorer
      const scorerMentions = announcements.filter((a) => a.msg.includes('Player1'));
      expect(scorerMentions.length).toBeGreaterThan(0);

      // Verifica mencao do assister
      const assisterMentions = announcements.filter((a) => a.msg.includes('Player2'));
      expect(assisterMentions.length).toBeGreaterThan(0);

      // Verifica placar
      const scoreMentions = announcements.filter((a) => a.msg.includes('1') && a.msg.includes('0'));
      expect(scoreMentions.length).toBeGreaterThan(0);
    });

    test('deve processar gol sem assistencia', () => {
      gameState.lastPlayersTouched = [{ player: { id: 1, name: 'Player1', team: 1 }, time: 180 }];

      handleGoal(room, 1, gameState);

      // Verifica anuncios de gol
      const goalAnnouncements = announcements.filter((a) => a.msg.includes('GOL'));
      expect(goalAnnouncements.length).toBeGreaterThan(0);

      // Verifica mencao do scorer
      const scorerMentions = announcements.filter((a) => a.msg.includes('Player1'));
      expect(scorerMentions.length).toBeGreaterThan(0);

      // Nao deve mencionar assistencia
      const assistMentions = announcements.filter((a) => a.msg.toLowerCase().includes('assist'));
      expect(assistMentions.length).toBe(0);
    });
  });

  describe('Fluxo de Gol Contra', () => {
    test('deve detectar e processar gol contra', () => {
      // Time 1 marcou contra si mesmo (gol para time 2)
      gameState.lastTouchTeam = 1;

      handleGoal(room, 2, gameState);

      // Verifica mencao de gol contra
      const ownGoalMentions = announcements.filter(
        (a) => a.msg.toLowerCase().includes('contra') || a.msg.includes('🤦')
      );
      expect(ownGoalMentions.length).toBeGreaterThan(0);

      // Verifica mencao do jogador que marcou contra
      const playerMentions = announcements.filter((a) => a.msg.includes('Player1'));
      expect(playerMentions.length).toBeGreaterThan(0);
    });

    test('deve usar mensagens customizadas para gol contra', () => {
      gameState.lastTouchTeam = 1;

      const customMessages = {
        ownGoal: 'Esses bagres estao evoluindo...',
      };

      handleGoal(room, 2, gameState, customMessages);

      const customMentions = announcements.filter((a) => a.msg.includes('bagres'));
      expect(customMentions.length).toBeGreaterThan(0);
    });
  });

  describe('Celebracoes de Gol', () => {
    test('deve executar celebracao de time', async () => {
      await goalCelebration(room, 1, { duration: 300 });

      // Verifica mudancas de avatar do time vermelho (team 1)
      const team1Changes = avatarChanges.filter((c) => c.playerId === 1 || c.playerId === 2);
      expect(team1Changes.length).toBeGreaterThan(0);
    });

    test('deve executar celebracao de assister', async () => {
      const assister = { id: 2, name: 'Player2', team: 1 };

      await assistCelebration(room, assister, { duration: 200 });

      // Verifica mudancas de avatar do assister
      const assisterChanges = avatarChanges.filter((c) => c.playerId === 2);
      expect(assisterChanges.length).toBeGreaterThan(0);
    });
  });

  describe('Integracao com Mensagens Customizadas', () => {
    test('deve permitir sobrescrever mensagens padrao', () => {
      const customMessages = {
        goal: '⚽⚽⚽ GOOOOOLAÇO!!! ⚽⚽⚽',
        assist: 'Assistencia linda de: {player}',
      };

      handleGoal(room, 1, gameState, customMessages);

      const customGoalMsg = announcements.find((a) => a.msg.includes('GOOOOOLAÇO'));
      expect(customGoalMsg).toBeDefined();
    });

    test('deve usar mensagens padrao quando custom nao fornecido', () => {
      handleGoal(room, 1, gameState, {});

      const goalAnnouncements = announcements.filter((a) => a.msg.includes('GOL'));
      expect(goalAnnouncements.length).toBeGreaterThan(0);
    });
  });

  describe('Timing de Gol', () => {
    test('deve calcular tempo correto do gol', () => {
      room.getScores = jest.fn(() => ({ red: 1, blue: 0, time: 125, timeLimit: 300 }));

      handleGoal(room, 1, gameState);

      // Verifica se tempo foi mencionado (2:05 para 125 segundos)
      const timeMentions = announcements.filter((a) => a.msg.includes('2:'));
      expect(timeMentions.length).toBeGreaterThan(0);
    });

    test('deve lidar com gol no inicio da partida', () => {
      room.getScores = jest.fn(() => ({ red: 1, blue: 0, time: 5, timeLimit: 300 }));

      handleGoal(room, 1, gameState);

      const timeMentions = announcements.filter((a) => a.msg.includes('0:'));
      expect(timeMentions.length).toBeGreaterThan(0);
    });
  });

  describe('Multiplos Gols em Sequencia', () => {
    test('deve processar multiplos gols corretamente', () => {
      // Primeiro gol
      handleGoal(room, 1, gameState);
      const firstGoalCount = announcements.length;

      // Limpa anuncios
      announcements.length = 0;

      // Segundo gol
      room.getScores = jest.fn(() => ({ red: 2, blue: 0, time: 200, timeLimit: 300 }));
      handleGoal(room, 1, gameState);

      expect(announcements.length).toBeGreaterThan(0);
      expect(announcements.length).toBeCloseTo(firstGoalCount, 2);
    });

    test('deve processar gols de times diferentes', () => {
      // Gol time 1
      handleGoal(room, 1, gameState);
      const team1Announcements = [...announcements];

      announcements.length = 0;

      // Gol time 2
      gameState.lastTouchTeam = 2;
      gameState.lastPlayersTouched = [{ player: { id: 3, name: 'Player3', team: 2 }, time: 180 }];
      room.getScores = jest.fn(() => ({ red: 1, blue: 1, time: 190, timeLimit: 300 }));

      handleGoal(room, 2, gameState);

      expect(announcements.length).toBeGreaterThan(0);
      expect(announcements[0].msg).not.toBe(team1Announcements[0].msg);
    });
  });
});

/*
   __  ____ ____ _  _
  / _\/ ___) ___) )( \
 /    \___ \___ ) \/ (
 \_/\_(____(____|____/
*/
