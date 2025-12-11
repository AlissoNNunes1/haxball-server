import { BalanceAlgorithm } from '../../src/balance/BalanceAlgorithm';
import { EloCalculator } from '../../src/balance/EloCalculator';
import { PerformanceTracker } from '../../src/balance/PerformanceTracker';
import { PositionRating } from '../../src/balance/PositionRating';
import { PlayerForBalance, Position } from '../../src/balance/types';

describe('BalanceAlgorithm', () => {
  let algorithm: BalanceAlgorithm;
  let positionRating: PositionRating;
  let performanceTracker: PerformanceTracker;
  let eloCalculator: EloCalculator;

  beforeEach(() => {
    eloCalculator = new EloCalculator();
    positionRating = new PositionRating(eloCalculator);
    performanceTracker = new PerformanceTracker();
    algorithm = new BalanceAlgorithm(positionRating, performanceTracker);
  });

  const createPlayer = (id: number, overallRating: number): PlayerForBalance => ({
    id,
    nick: `Player${id}`,
    rating: {
      overall: overallRating,
      gk: overallRating,
      def: overallRating,
      mid: overallRating,
      ata: overallRating,
      lastUpdated: new Date(),
    },
    preferredPosition: Position.MID,
  });

  describe('balanceTeams', () => {
    it('deve lancar erro com menos de 2 jogadores', () => {
      expect(() => algorithm.balanceTeams([createPlayer(1, 1000)])).toThrow(
        'Minimo 2 jogadores necessarios'
      );
    });

    it('deve balancear 2 jogadores', () => {
      const players = [createPlayer(1, 1200), createPlayer(2, 1000)];

      const result = algorithm.balanceTeams(players);

      expect(result.team1.players).toHaveLength(1);
      expect(result.team2.players).toHaveLength(1);
    });

    it('deve criar times com ratings proximos', () => {
      const players = [
        createPlayer(1, 1200),
        createPlayer(2, 1100),
        createPlayer(3, 1000),
        createPlayer(4, 900),
      ];

      const result = algorithm.balanceTeams(players);

      expect(result.ratingDifference).toBeLessThan(100);
    });

    it('deve atribuir posicoes aos jogadores', () => {
      const players = [
        createPlayer(1, 1200),
        createPlayer(2, 1100),
        createPlayer(3, 1000),
        createPlayer(4, 900),
      ];

      const result = algorithm.balanceTeams(players);

      result.team1.players.forEach((player) => {
        expect(player.assignedPosition).toBeDefined();
      });

      result.team2.players.forEach((player) => {
        expect(player.assignedPosition).toBeDefined();
      });
    });

    it('deve calcular fairness score', () => {
      const players = [createPlayer(1, 1200), createPlayer(2, 1000)];

      const result = algorithm.balanceTeams(players);

      expect(result.fairnessScore).toBeGreaterThan(0);
      expect(result.fairnessScore).toBeLessThanOrEqual(100);
    });

    it('deve usar estrategia greedy por padrao', () => {
      const players = [createPlayer(1, 1200), createPlayer(2, 1000)];

      const result = algorithm.balanceTeams(players);

      expect(result.strategy).toBe('greedy');
    });
  });

  describe('estrategia greedy', () => {
    it('deve distribuir jogadores alternadamente por rating', () => {
      const players = [
        createPlayer(1, 1500),
        createPlayer(2, 1400),
        createPlayer(3, 1300),
        createPlayer(4, 1200),
      ];

      const result = algorithm.balanceTeams(players);

      // Melhor jogador vai para time com menor rating
      const team1Ratings = result.team1.players.map((p) => p.rating.overall);
      const team2Ratings = result.team2.players.map((p) => p.rating.overall);

      expect(
        Math.abs(team1Ratings.reduce((a, b) => a + b, 0) - team2Ratings.reduce((a, b) => a + b, 0))
      ).toBeLessThan(300);
    });
  });

  describe('estrategia genetica', () => {
    it('deve usar algoritmo genetico', () => {
      const players = [
        createPlayer(1, 1500),
        createPlayer(2, 1400),
        createPlayer(3, 1300),
        createPlayer(4, 1200),
        createPlayer(5, 1100),
        createPlayer(6, 1000),
      ];

      const geneticAlgorithm = new BalanceAlgorithm(positionRating, performanceTracker, {
        strategy: 'genetic',
      });

      const result = geneticAlgorithm.balanceTeams(players);

      expect(result.strategy).toBe('genetic');
      expect(result.team1.players.length).toBeGreaterThan(0);
      expect(result.team2.players.length).toBeGreaterThan(0);
    });
  });

  describe('rebalanceWithSwap', () => {
    it('deve trocar jogadores entre times', () => {
      const players = [
        createPlayer(1, 1200),
        createPlayer(2, 1100),
        createPlayer(3, 1000),
        createPlayer(4, 900),
      ];

      const result = algorithm.balanceTeams(players);

      // Pega um jogador de cada time
      const player1 = result.team1.players[0];
      const player2 = result.team2.players[0];

      const rebalanced = algorithm.rebalanceWithSwap(result, player1.id, player2.id);

      // Verifica se jogadores trocaram de time
      expect(rebalanced.team1.players.find((p) => p.id === player2.id)).toBeDefined();
      expect(rebalanced.team2.players.find((p) => p.id === player1.id)).toBeDefined();
    });

    it('deve recalcular metricas apos troca', () => {
      const players = [
        createPlayer(1, 1500),
        createPlayer(2, 1000),
        createPlayer(3, 1000),
        createPlayer(4, 500),
      ];

      const result = algorithm.balanceTeams(players);
      const player1 = result.team1.players[0];
      const player2 = result.team2.players[0];

      const rebalanced = algorithm.rebalanceWithSwap(result, player1.id, player2.id);

      expect(rebalanced.ratingDifference).toBeDefined();
      expect(rebalanced.fairnessScore).toBeDefined();
    });

    it('deve lancar erro se jogadores nao encontrados', () => {
      const players = [createPlayer(1, 1200), createPlayer(2, 1000)];

      const result = algorithm.balanceTeams(players);

      expect(() => algorithm.rebalanceWithSwap(result, 999, 888)).toThrow(
        'Jogadores nao encontrados'
      );
    });
  });

  describe('atribuicao de posicoes', () => {
    it('deve atribuir posicoes diversas', () => {
      const player1: PlayerForBalance = {
        id: 1,
        nick: 'GK Specialist',
        rating: {
          overall: 1200,
          gk: 1500,
          def: 1000,
          mid: 1000,
          ata: 1000,
          lastUpdated: new Date(),
        },
        preferredPosition: Position.GK,
      };

      const player2: PlayerForBalance = {
        id: 2,
        nick: 'ATA Specialist',
        rating: {
          overall: 1200,
          gk: 1000,
          def: 1000,
          mid: 1000,
          ata: 1500,
          lastUpdated: new Date(),
        },
        preferredPosition: Position.ATA,
      };

      const players = [player1, player2];
      const result = algorithm.balanceTeams(players);

      const allPlayers = [...result.team1.players, ...result.team2.players];

      // Verifica se especialistas receberam suas posicoes
      const gkPlayer = allPlayers.find((p) => p.id === 1);
      const ataPlayer = allPlayers.find((p) => p.id === 2);

      expect(gkPlayer?.assignedPosition).toBe(Position.GK);
      expect(ataPlayer?.assignedPosition).toBe(Position.ATA);
    });
  });

  describe('consideracao de forma recente', () => {
    it('deve ajustar rating baseado em forma quando habilitado', () => {
      const player: PlayerForBalance = {
        id: 1,
        nick: 'Player',
        rating: {
          overall: 1000,
          gk: 1000,
          def: 1000,
          mid: 1000,
          ata: 1000,
          lastUpdated: new Date(),
        },
        preferredPosition: Position.MID,
        recentPerformance: {
          averageScore: 0.9,
          trend: 'improving',
          consistency: 0.8,
          gamesAnalyzed: 10,
          lastMatchDate: new Date(),
        },
      };

      const algorithmWithForm = new BalanceAlgorithm(positionRating, performanceTracker, {
        considerRecentForm: true,
      });

      const algorithmWithoutForm = new BalanceAlgorithm(positionRating, performanceTracker, {
        considerRecentForm: false,
      });

      const players = [player, createPlayer(2, 1000)];

      const resultWith = algorithmWithForm.balanceTeams(players);
      const resultWithout = algorithmWithoutForm.balanceTeams(players);

      // Rating efetivo pode ser diferente com forma habilitada
      expect(resultWith).toBeDefined();
      expect(resultWithout).toBeDefined();
    });
  });

  describe('qualidade do balanceamento', () => {
    it('deve produzir fairness score alto para times equilibrados', () => {
      const players = [
        createPlayer(1, 1100),
        createPlayer(2, 1050),
        createPlayer(3, 1000),
        createPlayer(4, 950),
      ];

      const result = algorithm.balanceTeams(players);

      expect(result.fairnessScore).toBeGreaterThan(80);
    });

    it('deve penalizar diferenca grande de rating', () => {
      const players = [
        createPlayer(1, 2000),
        createPlayer(2, 1000),
        createPlayer(3, 500),
        createPlayer(4, 500),
      ];

      const result = algorithm.balanceTeams(players);

      expect(result.ratingDifference).toBeGreaterThan(0);
    });
  });
});

//   __  ____ ____ _  _
// / _\/ ___) ___) )( \
//    \___ \___ ) \/ (
// \_/\_(____(____|____/
