// Testes unitarios para goalHandlers.cjs

const {
  formatGameTime,
  calculateGoalInfo,
  handleGoal,
} = require('../../../shared/handlers/goalHandlers.cjs');

describe('goalHandlers', () => {
  describe('formatGameTime', () => {
    it('deve formatar tempo corretamente', () => {
      expect(formatGameTime(0)).toBe('0:00');
      expect(formatGameTime(45)).toBe('0:45');
      expect(formatGameTime(60)).toBe('1:00');
      expect(formatGameTime(125)).toBe('2:05');
      expect(formatGameTime(225)).toBe('3:45');
    });

    it('deve lidar com tempo negativo', () => {
      expect(formatGameTime(-10)).toBe('0:00');
    });

    it('deve lidar com entrada invalida', () => {
      expect(formatGameTime(null)).toBe('0:00');
      expect(formatGameTime(undefined)).toBe('0:00');
    });
  });

  describe('calculateGoalInfo', () => {
    let mockRoom;
    let gameState;

    beforeEach(() => {
      mockRoom = {
        getScores: jest.fn(() => ({
          time: 125,
          red: 1,
          blue: 0,
        })),
      };

      gameState = {
        lastKickerId: 1,
        lastKickerName: 'Lukra',
        lastKickerTeam: 1,
        secondLastKickerId: 2,
        secondLastKickerName: 'Bagre',
        secondLastKickerTeam: 1,
      };
    });

    it('deve calcular gol normal corretamente', () => {
      const goalInfo = calculateGoalInfo(gameState, 1, mockRoom);

      expect(goalInfo).toBeTruthy();
      expect(goalInfo.team).toBe(1);
      expect(goalInfo.isOwnGoal).toBe(false);
      expect(goalInfo.scorer.name).toBe('Lukra');
      expect(goalInfo.redScore).toBe(1);
      expect(goalInfo.blueScore).toBe(0);
    });

    it('deve calcular gol contra corretamente', () => {
      gameState.lastKickerTeam = 2; // Jogador do time 2 chutou, time 1 marcou
      const goalInfo = calculateGoalInfo(gameState, 1, mockRoom);

      expect(goalInfo.isOwnGoal).toBe(true);
      expect(goalInfo.scorer.team).toBe(2);
    });

    it('deve detectar assistencia corretamente', () => {
      const goalInfo = calculateGoalInfo(gameState, 1, mockRoom);

      expect(goalInfo.assister).toBeTruthy();
      expect(goalInfo.assister.name).toBe('Bagre');
    });

    it('nao deve contar assistencia do mesmo jogador', () => {
      gameState.secondLastKickerId = 1; // Mesmo jogador
      const goalInfo = calculateGoalInfo(gameState, 1, mockRoom);

      expect(goalInfo.assister).toBeNull();
    });

    it('nao deve contar assistencia de time diferente', () => {
      gameState.secondLastKickerTeam = 2; // Time diferente
      const goalInfo = calculateGoalInfo(gameState, 1, mockRoom);

      expect(goalInfo.assister).toBeNull();
    });

    it('deve retornar null para entrada invalida', () => {
      expect(calculateGoalInfo(null, 1, mockRoom)).toBeNull();
      expect(calculateGoalInfo(gameState, 1, null)).toBeNull();
    });
  });

  describe('handleGoal', () => {
    let mockRoom;
    let gameState;
    let announceMessages;

    beforeEach(() => {
      announceMessages = [];

      mockRoom = {
        getScores: jest.fn(() => ({
          time: 125,
          red: 1,
          blue: 0,
        })),
        sendAnnouncement: jest.fn((msg) => {
          announceMessages.push(msg);
        }),
        getPlayer: jest.fn((id) => {
          if (id === 1) return { id: 1, name: 'Lukra', team: 1 };
          if (id === 2) return { id: 2, name: 'Bagre', team: 1 };
          return null;
        }),
      };

      gameState = {
        lastKickerId: 1,
        lastKickerName: 'Lukra',
        lastKickerTeam: 1,
        secondLastKickerId: 2,
        secondLastKickerName: 'Bagre',
        secondLastKickerTeam: 1,
      };
    });

    it('deve processar gol e anunciar corretamente', () => {
      handleGoal(mockRoom, 1, gameState);

      expect(announceMessages.length).toBeGreaterThan(0);
      expect(announceMessages.some((m) => m.includes('GOLAÇO'))).toBe(true);
    });

    it('deve limpar estado apos processar gol', () => {
      handleGoal(mockRoom, 1, gameState);

      expect(gameState.lastKickerId).toBeUndefined();
      expect(gameState.lastKickerName).toBeUndefined();
      expect(gameState.lastKickerTeam).toBeUndefined();
    });

    it('deve chamar callback customizado se fornecido', () => {
      const onGoalCallback = jest.fn();

      handleGoal(mockRoom, 1, gameState, {
        onGoal: onGoalCallback,
      });

      expect(onGoalCallback).toHaveBeenCalled();
    });
  });
});

//   __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
