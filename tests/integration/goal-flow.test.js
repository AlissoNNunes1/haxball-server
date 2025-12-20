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
    // Usar fake timers para controlar setTimeout
    jest.useFakeTimers();

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
      getPlayer: jest.fn((playerId) => {
        const players = [
          { id: 1, name: 'Player1', team: 1 },
          { id: 2, name: 'Player2', team: 1 },
          { id: 3, name: 'Player3', team: 2 },
          { id: 4, name: 'Player4', team: 2 },
        ];
        return players.find((p) => p.id === playerId) || null;
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
      lastKickerId: 1,
      lastKickerName: 'Player1',
      lastKickerTeam: 1,
      secondLastKickerId: 2,
      secondLastKickerName: 'Player2',
      secondLastKickerTeam: 1,
    };
  });

  afterEach(() => {
    // Restaurar timers reais
    jest.useRealTimers();
  });

  afterEach(() => {
    // Restaurar timers reais
    jest.useRealTimers();
  });

  describe('Fluxo de Gol Normal com Assistencia', () => {
    test('deve processar gol completo com celebracoes', async () => {
      const onGoalCallback = jest.fn((room, goalInfo) => {
        // Simula celebracoes
        if (goalInfo.scorer) {
          avatarCelebration(room, goalInfo.scorer, { duration: 500 });
        }
        if (goalInfo.assister) {
          assistCelebration(room, goalInfo.assister, { duration: 300 });
        }
      });

      handleGoal(room, 1, gameState, { onGoal: onGoalCallback });

      // Verifica se callback foi chamado
      expect(onGoalCallback).toHaveBeenCalled();

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
      gameState.secondLastKickerId = undefined;
      gameState.secondLastKickerName = undefined;
      gameState.secondLastKickerTeam = undefined;

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
      // Jogador do time 1 chuta no proprio gol (time 2 marca)
      gameState = {
        lastKickerId: 1,
        lastKickerName: 'Player1',
        lastKickerTeam: 1,
      };

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
      gameState = {
        lastKickerId: 1,
        lastKickerName: 'Player1',
        lastKickerTeam: 1,
      };

      const customMessages = {
        ownGoal: {
          red: 'Esses bagres estao evoluindo...',
          blue: 'Esses bagres estao evoluindo...',
        },
      };

      handleGoal(room, 2, gameState, { customMessages });

      const customMentions = announcements.filter((a) => a.msg.includes('bagres'));
      expect(customMentions.length).toBeGreaterThan(0);
    });
  });

  describe('Celebracoes de Gol', () => {
    test('deve executar celebracao de time', () => {
      goalCelebration(room, 1, { duration: 300 });

      // Avanca timers para executar setTimeout
      jest.runAllTimers();

      // Verifica mudancas de avatar do time vermelho (team 1)
      const team1Changes = avatarChanges.filter((c) => c.playerId === 1 || c.playerId === 2);
      expect(team1Changes.length).toBeGreaterThan(0);
    });

    test('deve executar celebracao de assister', () => {
      const assister = { id: 2, name: 'Player2', team: 1 };

      // assistCelebration espera apenas o playerId, nao o objeto completo
      assistCelebration(room, assister.id, { duration: 200 });

      // Avanca timers para executar setTimeout
      jest.runAllTimers();

      // Verifica mudancas de avatar do assister
      const assisterChanges = avatarChanges.filter((c) => c.playerId === 2);
      expect(assisterChanges.length).toBeGreaterThan(0);
    });
  });

  describe('Integracao com Mensagens Customizadas', () => {
    test('deve permitir sobrescrever mensagens padrao', () => {
      const customMessages = {
        goal: {
          red: '⚽⚽⚽ GOOOOOLAÇO!!! ⚽⚽⚽',
          blue: '⚽⚽⚽ GOOOOOLAÇO!!! ⚽⚽⚽',
        },
        assist: 'Assistencia linda de: {player}',
      };

      handleGoal(room, 1, gameState, { customMessages });

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
      gameState = {
        lastKickerId: 1,
        lastKickerName: 'Player1',
        lastKickerTeam: 1,
        secondLastKickerId: 2,
        secondLastKickerName: 'Player2',
        secondLastKickerTeam: 1,
      };
      handleGoal(room, 1, gameState);
      const firstGoalCount = announcements.length;

      // Limpa anuncios
      announcements.length = 0;

      // Segundo gol (sem scorer para testar variacao)
      gameState = {
        lastKickerId: undefined,
        lastKickerName: undefined,
        lastKickerTeam: undefined,
        secondLastKickerId: undefined,
        secondLastKickerName: undefined,
        secondLastKickerTeam: undefined,
      };
      room.getScores = jest.fn(() => ({ red: 2, blue: 0, time: 200, timeLimit: 300 }));
      handleGoal(room, 1, gameState);

      expect(announcements.length).toBeGreaterThan(0);
      // Sem scorer, menos anuncios (sem nome de jogador)
      expect(announcements.length).toBeLessThan(firstGoalCount);
    });

    test('deve processar gols de times diferentes', () => {
      // Gol time 1
      handleGoal(room, 1, gameState);
      const team1Announcements = [...announcements];

      announcements.length = 0;

      // Gol time 2
      gameState = {
        lastKickerId: 3,
        lastKickerName: 'Player3',
        lastKickerTeam: 2,
        secondLastKickerId: undefined,
        secondLastKickerName: undefined,
        secondLastKickerTeam: undefined,
      };
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
