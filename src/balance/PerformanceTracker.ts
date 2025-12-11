import { PerformanceData, Position, RecentPerformance } from './types';

/**
 * Rastreador de performance e forma recente
 * Analisa historico de partidas para determinar tendencia
 * e calcular forma atual do jogador
 */
export class PerformanceTracker {
  private readonly RECENT_GAMES_WINDOW = 10;
  private readonly TREND_THRESHOLD = 0.15;

  /**
   * Calcula score de performance baseado em estatisticas da partida
   * Normaliza valores entre 0 e 1
   * @param performance Dados de performance da partida
   * @param position Posicao jogada
   * @returns Score entre 0 e 1
   */
  calculatePerformanceScore(performance: PerformanceData, position: Position): number {
    // Pesos por posicao
    const weights = this.getPositionWeights(position);

    // Normaliza valores (dividindo por valores maximos esperados)
    const normalizedGoals = Math.min(1, performance.goals / 3);
    const normalizedAssists = Math.min(1, performance.assists / 3);
    const normalizedCS = performance.cleanSheet ? 1 : 0;
    const normalizedPossession = Math.min(1, performance.possession / 70);

    // Calcula score ponderado
    const score =
      normalizedGoals * weights.goals +
      normalizedAssists * weights.assists +
      normalizedCS * weights.cleanSheet +
      normalizedPossession * weights.possession;

    return Math.round(score * 100) / 100;
  }

  /**
   * Retorna pesos de metricas por posicao
   * Cada posicao valoriza diferentes aspectos do jogo
   */
  private getPositionWeights(position: Position) {
    switch (position) {
      case Position.GK:
        return {
          goals: 0.1,
          assists: 0.1,
          cleanSheet: 0.6,
          possession: 0.2,
        };
      case Position.DEF:
        return {
          goals: 0.15,
          assists: 0.2,
          cleanSheet: 0.45,
          possession: 0.2,
        };
      case Position.MID:
        return {
          goals: 0.25,
          assists: 0.35,
          cleanSheet: 0.15,
          possession: 0.25,
        };
      case Position.ATA:
        return {
          goals: 0.5,
          assists: 0.3,
          cleanSheet: 0.05,
          possession: 0.15,
        };
      default:
        return {
          goals: 0.3,
          assists: 0.3,
          cleanSheet: 0.2,
          possession: 0.2,
        };
    }
  }

  /**
   * Analisa performances recentes e calcula forma atual
   * @param performances Array de performances (ordenado por data, mais recente primeiro)
   * @param position Posicao considerada
   * @returns Analise de forma recente
   */
  analyzeRecentForm(performances: PerformanceData[], position: Position): RecentPerformance {
    if (performances.length === 0) {
      return {
        averageScore: 0,
        trend: 'stable',
        consistency: 0,
        gamesAnalyzed: 0,
        lastMatchDate: null,
      };
    }

    const recentGames = performances.slice(0, this.RECENT_GAMES_WINDOW);

    // Calcula scores de cada partida
    const scores = recentGames.map((perf) => this.calculatePerformanceScore(perf, position));

    // Media de performance
    const averageScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;

    // Analisa tendencia (compara primeira metade com segunda metade)
    const trend = this.calculateTrend(scores);

    // Calcula consistencia (inverso do desvio padrao normalizado)
    const consistency = this.calculateConsistency(scores);

    return {
      averageScore: Math.round(averageScore * 100) / 100,
      trend,
      consistency: Math.round(consistency * 100) / 100,
      gamesAnalyzed: recentGames.length,
      lastMatchDate: recentGames[0]?.matchDate || null,
    };
  }

  /**
   * Calcula tendencia de performance
   * Compara primeira metade com segunda metade dos jogos recentes
   */
  private calculateTrend(scores: number[]): 'improving' | 'declining' | 'stable' {
    if (scores.length < 4) return 'stable';

    const midpoint = Math.floor(scores.length / 2);
    const recentHalf = scores.slice(0, midpoint);
    const olderHalf = scores.slice(midpoint);

    const recentAvg = recentHalf.reduce((sum, s) => sum + s, 0) / recentHalf.length;
    const olderAvg = olderHalf.reduce((sum, s) => sum + s, 0) / olderHalf.length;

    const difference = recentAvg - olderAvg;

    if (difference > this.TREND_THRESHOLD) return 'improving';
    if (difference < -this.TREND_THRESHOLD) return 'declining';
    return 'stable';
  }

  /**
   * Calcula consistencia (0 = inconsistente, 1 = muito consistente)
   * Baseado no desvio padrao normalizado
   */
  private calculateConsistency(scores: number[]): number {
    if (scores.length < 2) return 1;

    const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    // Normaliza: desvio de 0.25 ou menos = altamente consistente
    const consistency = Math.max(0, 1 - stdDev / 0.25);
    return consistency;
  }

  /**
   * Calcula fator de ajuste de rating baseado na forma
   * Jogador em boa forma recebe boost, em ma forma recebe penalty
   * @returns Multiplicador entre 0.9 e 1.1
   */
  getFormAdjustmentFactor(recentPerformance: RecentPerformance): number {
    if (recentPerformance.gamesAnalyzed < 3) return 1.0;

    let adjustment = 1.0;

    // Ajuste por media de performance
    // Score acima de 0.7 = bonus, abaixo de 0.3 = penalty
    if (recentPerformance.averageScore > 0.7) {
      adjustment += 0.05;
    } else if (recentPerformance.averageScore < 0.3) {
      adjustment -= 0.05;
    }

    // Ajuste por tendencia
    if (recentPerformance.trend === 'improving') {
      adjustment += 0.03;
    } else if (recentPerformance.trend === 'declining') {
      adjustment -= 0.03;
    }

    // Ajuste por consistencia (jogadores consistentes sao mais confiaveis)
    if (recentPerformance.consistency > 0.8) {
      adjustment += 0.02;
    }

    // Limita entre 0.9 e 1.1
    return Math.max(0.9, Math.min(1.1, Math.round(adjustment * 100) / 100));
  }

  /**
   * Determina se jogador esta em sequencia positiva (streak)
   * Considera sequencia de vitorias ou boas performances
   */
  detectStreak(
    performances: PerformanceData[],
    position: Position
  ): {
    hasStreak: boolean;
    streakLength: number;
    type: 'win' | 'performance' | 'none';
  } {
    if (performances.length < 3) {
      return { hasStreak: false, streakLength: 0, type: 'none' };
    }

    const recentGames = performances.slice(0, this.RECENT_GAMES_WINDOW);

    // Detecta sequencia de vitorias
    const winStreak = this.countConsecutive(recentGames, (perf) => perf.won);

    // Detecta sequencia de boas performances (score > 0.7)
    const performanceStreak = this.countConsecutive(recentGames, (perf) => {
      const score = this.calculatePerformanceScore(perf, position);
      return score > 0.7;
    });

    if (winStreak >= 3) {
      return { hasStreak: true, streakLength: winStreak, type: 'win' };
    }

    if (performanceStreak >= 4) {
      return { hasStreak: true, streakLength: performanceStreak, type: 'performance' };
    }

    return { hasStreak: false, streakLength: 0, type: 'none' };
  }

  /**
   * Conta elementos consecutivos que satisfazem condicao
   */
  private countConsecutive<T>(array: T[], predicate: (item: T) => boolean): number {
    let count = 0;
    for (const item of array) {
      if (predicate(item)) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }

  /**
   * Calcula "momentum" do jogador
   * Combina forma recente, tendencia e streaks
   * @returns Valor entre -1 (momento negativo) e 1 (momento positivo)
   */
  calculateMomentum(
    recentPerformance: RecentPerformance,
    performances: PerformanceData[],
    position: Position
  ): number {
    if (recentPerformance.gamesAnalyzed < 3) return 0;

    let momentum = 0;

    // Componente 1: Score medio
    momentum += (recentPerformance.averageScore - 0.5) * 0.4;

    // Componente 2: Tendencia
    if (recentPerformance.trend === 'improving') momentum += 0.3;
    if (recentPerformance.trend === 'declining') momentum -= 0.3;

    // Componente 3: Streak
    const streak = this.detectStreak(performances, position);
    if (streak.hasStreak) {
      const streakBonus = Math.min(0.3, streak.streakLength * 0.05);
      momentum += streakBonus;
    }

    // Limita entre -1 e 1
    return Math.max(-1, Math.min(1, Math.round(momentum * 100) / 100));
  }
}

//   __  ____ ____ _  _
// / _\/ ___) ___) )( \
//    \___ \___ ) \/ (
// \_/\_(____(____|____/
