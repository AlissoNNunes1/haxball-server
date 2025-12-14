import {
  AdvancedMatchStats,
  BasicMatchStats,
  HeatmapData,
  PlayerStatsAggregate,
  Position2D,
} from './types';

/**
 * Calculadora de estatisticas derivadas e agregadas
 * Processa dados brutos para gerar insights
 */
export class StatsCalculator {
  /**
   * Calcula win rate
   */
  calculateWinRate(wins: number, totalMatches: number): number {
    if (totalMatches === 0) return 0;
    return Math.round((wins / totalMatches) * 10000) / 100; // 2 decimais
  }

  /**
   * Calcula pass accuracy
   */
  calculatePassAccuracy(completed: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((completed / total) * 10000) / 100;
  }

  /**
   * Calcula media de gols por partida
   */
  calculateAverage(total: number, matches: number): number {
    if (matches === 0) return 0;
    return Math.round((total / matches) * 100) / 100;
  }

  /**
   * Calcula estatisticas agregadas de jogador
   */
  calculatePlayerAggregate(
    basicStats: BasicMatchStats[],
    advancedStats?: AdvancedMatchStats[]
  ): PlayerStatsAggregate {
    if (basicStats.length === 0) {
      throw new Error('Sem dados para agregar');
    }

    const accountId = basicStats[0].accountId;
    const totalMatches = basicStats.length;

    // Conta wins/losses/draws
    let totalWins = 0;
    let totalLosses = 0;
    let totalDraws = 0;

    for (const stat of basicStats) {
      if (stat.won) {
        totalWins++;
      } else {
        // TODO: detectar draws (requer score da partida)
        totalLosses++;
      }
    }

    // Soma stats basicas
    const totalGoals = basicStats.reduce((sum, s) => sum + s.goals, 0);
    const totalAssists = basicStats.reduce((sum, s) => sum + s.assists, 0);
    const totalSaves = basicStats.reduce((sum, s) => sum + s.saves, 0);
    const totalOwnGoals = basicStats.reduce((sum, s) => sum + s.ownGoals, 0);

    // Datas
    const dates = basicStats.map((_s) => new Date()).sort((a, b) => a.getTime() - b.getTime());
    const firstMatchDate = dates[0];
    const lastMatchDate = dates[dates.length - 1];

    // Monta agregado basico
    const aggregate: PlayerStatsAggregate = {
      accountId,
      totalMatches,
      totalWins,
      totalLosses,
      totalDraws,
      winRate: this.calculateWinRate(totalWins, totalMatches),
      totalGoals,
      totalAssists,
      totalSaves,
      totalOwnGoals,
      avgGoalsPerMatch: this.calculateAverage(totalGoals, totalMatches),
      avgAssistsPerMatch: this.calculateAverage(totalAssists, totalMatches),
      avgSavesPerMatch: this.calculateAverage(totalSaves, totalMatches),
      firstMatchDate,
      lastMatchDate,
      updatedAt: new Date(),
    };

    // Adiciona stats avancadas se disponiveis
    if (advancedStats && advancedStats.length > 0) {
      const totalPasses = advancedStats.reduce((sum, s) => sum + s.passes, 0);
      const totalPassesCompleted = advancedStats.reduce((sum, s) => sum + s.passesCompleted, 0);
      const totalInterceptions = advancedStats.reduce((sum, s) => sum + s.interceptions, 0);
      const totalDistanceCovered = advancedStats.reduce((sum, s) => sum + s.distanceCovered, 0);

      // Calcula media de velocidade
      const speeds = advancedStats.map((s) => s.averageSpeed).filter((s) => s > 0);
      const avgSpeed =
        speeds.length > 0 ? speeds.reduce((sum, s) => sum + s, 0) / speeds.length : 0;

      aggregate.totalPasses = totalPasses;
      aggregate.passAccuracy = this.calculatePassAccuracy(totalPassesCompleted, totalPasses);
      aggregate.totalInterceptions = totalInterceptions;
      aggregate.totalDistanceCovered = Math.round(totalDistanceCovered);
      aggregate.avgSpeed = Math.round(avgSpeed * 100) / 100;
    }

    return aggregate;
  }

  /**
   * Calcula heatmap a partir de posicoes
   */
  calculateHeatmap(
    accountId: number,
    matchId: number,
    positions: Position2D[],
    gridSize: number = 20
  ): HeatmapData {
    if (positions.length === 0) {
      throw new Error('Sem posicoes para gerar heatmap');
    }

    // Encontra limites do campo
    const xValues = positions.map((p) => p.x);
    const yValues = positions.map((p) => p.y);

    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    const minY = Math.min(...yValues);
    const maxY = Math.max(...yValues);

    // Inicializa grid
    const densityMap: number[][] = Array(gridSize)
      .fill(0)
      .map(() => Array(gridSize).fill(0));

    // Calcula tamanho de cada celula
    const cellWidth = (maxX - minX) / gridSize;
    const cellHeight = (maxY - minY) / gridSize;

    // Mapeia posicoes para grid
    for (const pos of positions) {
      const gridX = Math.min(Math.floor((pos.x - minX) / cellWidth), gridSize - 1);
      const gridY = Math.min(Math.floor((pos.y - minY) / cellHeight), gridSize - 1);

      if (gridX >= 0 && gridX < gridSize && gridY >= 0 && gridY < gridSize) {
        densityMap[gridY][gridX]++;
      }
    }

    // Normaliza valores (0-1)
    const maxDensity = Math.max(...densityMap.flat());
    if (maxDensity > 0) {
      for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
          densityMap[i][j] = densityMap[i][j] / maxDensity;
        }
      }
    }

    return {
      accountId,
      matchId,
      gridSize,
      densityMap,
      minX,
      maxX,
      minY,
      maxY,
    };
  }

  /**
   * Calcula distancia percorrida a partir de posicoes
   */
  calculateDistanceCovered(positions: Position2D[]): number {
    if (positions.length < 2) return 0;

    let totalDistance = 0;

    for (let i = 1; i < positions.length; i++) {
      const prev = positions[i - 1];
      const curr = positions[i];

      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      totalDistance += distance;
    }

    return Math.round(totalDistance * 100) / 100;
  }

  /**
   * Calcula velocidade media a partir de posicoes
   */
  calculateAverageSpeed(positions: Position2D[]): number {
    if (positions.length < 2) return 0;

    let totalSpeed = 0;
    let samples = 0;

    for (let i = 1; i < positions.length; i++) {
      const prev = positions[i - 1];
      const curr = positions[i];

      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const timeDiff = (curr.timestamp.getTime() - prev.timestamp.getTime()) / 1000; // segundos

      if (timeDiff > 0) {
        const speed = distance / timeDiff;
        totalSpeed += speed;
        samples++;
      }
    }

    return samples > 0 ? Math.round((totalSpeed / samples) * 100) / 100 : 0;
  }

  /**
   * Calcula velocidade maxima a partir de posicoes
   */
  calculateTopSpeed(positions: Position2D[]): number {
    if (positions.length < 2) return 0;

    let maxSpeed = 0;

    for (let i = 1; i < positions.length; i++) {
      const prev = positions[i - 1];
      const curr = positions[i];

      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const timeDiff = (curr.timestamp.getTime() - prev.timestamp.getTime()) / 1000;

      if (timeDiff > 0) {
        const speed = distance / timeDiff;
        if (speed > maxSpeed) {
          maxSpeed = speed;
        }
      }
    }

    return Math.round(maxSpeed * 100) / 100;
  }

  /**
   * Calcula tempo de posse de bola (estimativa)
   * Baseado em toques e tempo em jogo
   */
  calculatePossessionTime(touches: number, timeInGame: number): number {
    // Estimativa: cada toque = ~1 segundo de posse
    const estimatedPossession = touches * 1.0;

    // Limita ao tempo em jogo
    return Math.min(estimatedPossession, timeInGame);
  }

  /**
   * Calcula rating de performance (0-10)
   * Combinacao ponderada de varias metricas
   */
  calculatePerformanceRating(stats: AdvancedMatchStats): number {
    let rating = 5.0; // Base

    // Gols: +0.5 por gol
    rating += stats.goals * 0.5;

    // Assistencias: +0.3 por assistencia
    rating += stats.assists * 0.3;

    // Defesas: +0.2 por defesa
    rating += stats.saves * 0.2;

    // Pass accuracy bonus
    if (stats.passes > 5) {
      const accuracy = stats.passesCompleted / stats.passes;
      rating += accuracy * 1.0; // Max +1.0
    }

    // Interceptacoes: +0.15 por interceptacao
    rating += stats.interceptions * 0.15;

    // Shots on goal: +0.1 por chute no gol
    rating += stats.shotsOnGoal * 0.1;

    // Penalidades
    rating -= stats.ownGoals * 1.0; // -1.0 por gol contra
    rating -= stats.timesDispossessed * 0.05; // -0.05 por perda de bola

    // Limita entre 0 e 10
    rating = Math.max(0, Math.min(10, rating));

    return Math.round(rating * 10) / 10; // 1 decimal
  }

  /**
   * Compara dois jogadores
   */
  comparePlayer(
    player1: PlayerStatsAggregate,
    player2: PlayerStatsAggregate
  ): {
    winRate: number;
    avgGoals: number;
    avgAssists: number;
    avgSaves: number;
    passAccuracy: number;
  } {
    return {
      winRate: player1.winRate - player2.winRate,
      avgGoals: player1.avgGoalsPerMatch - player2.avgGoalsPerMatch,
      avgAssists: player1.avgAssistsPerMatch - player2.avgAssistsPerMatch,
      avgSaves: player1.avgSavesPerMatch - player2.avgSavesPerMatch,
      passAccuracy: (player1.passAccuracy || 0) - (player2.passAccuracy || 0),
    };
  }

  /**
   * Calcula tendencia de performance ao longo do tempo
   * Retorna coeficiente angular da linha de tendencia
   */
  calculatePerformanceTrend(ratings: number[]): 'improving' | 'stable' | 'declining' {
    if (ratings.length < 3) return 'stable';

    // Regressao linear simples
    const n = ratings.length;
    const xMean = (n - 1) / 2;
    const yMean = ratings.reduce((sum, r) => sum + r, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (ratings[i] - yMean);
      denominator += (i - xMean) ** 2;
    }

    const slope = numerator / denominator;

    // Classifica tendencia
    if (slope > 0.1) return 'improving';
    if (slope < -0.1) return 'declining';
    return 'stable';
  }
}

//   __  ____ ____ _  _
// / _\/ ___) ___) )( \
//    \___ \___ ) \/ (
// \_/\_(____(____|____/
