import { EloCalculator } from '../../../src/balance/EloCalculator';
import { EloRating, MatchResult, Position } from '../../../src/balance/types';

describe('EloCalculator', () => {
  let calculator: EloCalculator;

  beforeEach(() => {
    calculator = new EloCalculator();
  });

  describe('calculateWinProbability', () => {
    it('deve calcular 50% para ratings iguais', () => {
      const prob = calculator.calculateWinProbability(1000, 1000);
      expect(prob).toBeCloseTo(0.5, 2);
    });

    it('deve calcular maior probabilidade para rating superior', () => {
      const prob = calculator.calculateWinProbability(1200, 1000);
      expect(prob).toBeGreaterThan(0.5);
    });

    it('deve calcular menor probabilidade para rating inferior', () => {
      const prob = calculator.calculateWinProbability(1000, 1200);
      expect(prob).toBeLessThan(0.5);
    });

    it('deve retornar ~76% para diferenca de 200 pontos', () => {
      const prob = calculator.calculateWinProbability(1200, 1000);
      expect(prob).toBeCloseTo(0.76, 1);
    });
  });

  describe('calculateKFactor', () => {
    it('deve retornar K alto para jogadores novos', () => {
      const k = calculator.calculateKFactor(5);
      expect(k).toBeGreaterThan(32);
    });

    it('deve retornar K base apos jogos provisionais', () => {
      const k = calculator.calculateKFactor(20);
      expect(k).toBe(32);
    });

    it('deve reduzir K gradualmente para veteranos', () => {
      const k50 = calculator.calculateKFactor(50);
      const k100 = calculator.calculateKFactor(100);
      expect(k100).toBeLessThan(k50);
    });

    it('deve respeitar K minimo', () => {
      const k = calculator.calculateKFactor(1000);
      expect(k).toBeGreaterThanOrEqual(16);
    });
  });

  describe('calculateNewRating', () => {
    it('deve aumentar rating apos vitoria', () => {
      const result: MatchResult = {
        teamRating: 1000,
        opponentRating: 1000,
        won: true,
        position: Position.MID,
        personalPerformance: 0.5,
      };

      const newRating = calculator.calculateNewRating(result, 1000, 10);
      expect(newRating).toBeGreaterThan(1000);
    });

    it('deve diminuir rating apos derrota', () => {
      const result: MatchResult = {
        teamRating: 1000,
        opponentRating: 1000,
        won: false,
        position: Position.MID,
        personalPerformance: 0.5,
      };

      const newRating = calculator.calculateNewRating(result, 1000, 10);
      expect(newRating).toBeLessThan(1000);
    });

    it('deve aplicar bonus por boa performance individual', () => {
      const goodPerf: MatchResult = {
        teamRating: 1000,
        opponentRating: 1000,
        won: true,
        position: Position.MID,
        personalPerformance: 0.9,
      };

      const avgPerf: MatchResult = {
        ...goodPerf,
        personalPerformance: 0.5,
      };

      const goodRating = calculator.calculateNewRating(goodPerf, 1000, 10);
      const avgRating = calculator.calculateNewRating(avgPerf, 1000, 10);

      expect(goodRating).toBeGreaterThan(avgRating);
    });

    it('deve respeitar rating minimo', () => {
      const result: MatchResult = {
        teamRating: 100,
        opponentRating: 2000,
        won: false,
        position: Position.MID,
        personalPerformance: 0.1,
      };

      const newRating = calculator.calculateNewRating(result, 100, 10);
      expect(newRating).toBeGreaterThanOrEqual(100);
    });

    it('deve respeitar rating maximo', () => {
      const result: MatchResult = {
        teamRating: 3000,
        opponentRating: 500,
        won: true,
        position: Position.MID,
        personalPerformance: 1.0,
      };

      const newRating = calculator.calculateNewRating(result, 3000, 10);
      expect(newRating).toBeLessThanOrEqual(3000);
    });
  });

  describe('updateRatings', () => {
    it('deve atualizar rating da posicao especifica', () => {
      const currentRating: EloRating = {
        overall: 1000,
        gk: 1000,
        def: 1000,
        mid: 1000,
        ata: 1000,
        lastUpdated: new Date(),
      };

      const result: MatchResult = {
        teamRating: 1000,
        opponentRating: 1000,
        won: true,
        position: Position.MID,
        personalPerformance: 0.5,
      };

      const gamesPlayed = {
        [Position.GK]: 10,
        [Position.DEF]: 10,
        [Position.MID]: 10,
        [Position.ATA]: 10,
      };

      const newRating = calculator.updateRatings(currentRating, result, gamesPlayed);

      expect(newRating.mid).toBeGreaterThan(currentRating.mid);
      expect(newRating.gk).toBe(currentRating.gk); // Outras posicoes inalteradas
    });

    it('deve atualizar overall como media', () => {
      const currentRating: EloRating = {
        overall: 1000,
        gk: 1000,
        def: 1000,
        mid: 1000,
        ata: 1000,
        lastUpdated: new Date(),
      };

      const result: MatchResult = {
        teamRating: 1000,
        opponentRating: 1000,
        won: true,
        position: Position.MID,
        personalPerformance: 0.5,
      };

      const gamesPlayed = {
        [Position.GK]: 10,
        [Position.DEF]: 10,
        [Position.MID]: 10,
        [Position.ATA]: 10,
      };

      const newRating = calculator.updateRatings(currentRating, result, gamesPlayed);
      const expectedOverall = Math.round(
        (newRating.gk + newRating.def + newRating.mid + newRating.ata) / 4
      );

      expect(newRating.overall).toBe(expectedOverall);
    });
  });

  describe('applyDecay', () => {
    const testRating: EloRating = {
      overall: 1500,
      gk: 1500,
      def: 1500,
      mid: 1500,
      ata: 1500,
      lastUpdated: new Date(),
    };

    it('nao deve aplicar decay se dentro do periodo', () => {
      const decayed = calculator.applyDecay(testRating, 20);
      expect(decayed.overall).toBe(testRating.overall);
    });

    it('deve aplicar decay apos periodo de inatividade', () => {
      const decayed = calculator.applyDecay(testRating, 60);
      expect(decayed.overall).toBeLessThan(testRating.overall);
    });

    it('deve aplicar decay proporcional ao tempo inativo', () => {
      const decay45 = calculator.applyDecay(testRating, 45);
      const decay90 = calculator.applyDecay(testRating, 90);
      expect(decay90.overall).toBeLessThan(decay45.overall);
    });

    it('deve respeitar rating minimo no decay', () => {
      const lowRating: EloRating = { ...testRating, overall: 150 };
      const decayed = calculator.applyDecay(lowRating, 365);
      expect(decayed.overall).toBeGreaterThanOrEqual(100);
    });
  });

  describe('createInitialRating', () => {
    it('deve criar rating inicial com valor padrao', () => {
      const rating = calculator.createInitialRating();
      expect(rating.overall).toBe(1000);
      expect(rating.gk).toBe(1000);
      expect(rating.def).toBe(1000);
      expect(rating.mid).toBe(1000);
      expect(rating.ata).toBe(1000);
    });

    it('deve definir lastUpdated como data atual', () => {
      const rating = calculator.createInitialRating();
      const now = new Date();
      const diff = Math.abs(now.getTime() - rating.lastUpdated.getTime());
      expect(diff).toBeLessThan(1000); // Menos de 1 segundo de diferenca
    });
  });

  describe('calculateTeamRating', () => {
    it('deve retornar rating inicial para time vazio', () => {
      const teamRating = calculator.calculateTeamRating([], Position.MID);
      expect(teamRating).toBe(1000);
    });

    it('deve calcular media dos ratings dos jogadores', () => {
      const players: EloRating[] = [
        { overall: 1200, gk: 1200, def: 1200, mid: 1200, ata: 1200, lastUpdated: new Date() },
        { overall: 1000, gk: 1000, def: 1000, mid: 1000, ata: 1000, lastUpdated: new Date() },
        { overall: 800, gk: 800, def: 800, mid: 800, ata: 800, lastUpdated: new Date() },
      ];

      const teamRating = calculator.calculateTeamRating(players, Position.MID);
      expect(teamRating).toBe(1000); // (1200 + 1000 + 800) / 3
    });
  });

  describe('config customizado', () => {
    it('deve aceitar configuracao customizada', () => {
      const customCalc = new EloCalculator({
        baseKFactor: 24,
        initialRating: 1500,
      });

      const k = customCalc.calculateKFactor(50);
      const initialRating = customCalc.createInitialRating();

      expect(k).toBeLessThanOrEqual(24);
      expect(initialRating.overall).toBe(1500);
    });
  });
});

//   __  ____ ____ _  _
// / _\/ ___) ___) )( \
//    \___ \___ ) \/ (
// \_/\_(____(____|____/
