import { EloConfig, EloRating, MatchResult, Position } from './types';

/**
 * Calculadora de Elo com K-factor dinamico
 * Implementa sistema Elo adaptado para Haxball com:
 * - K-factor dinamico baseado em numero de jogos
 * - Peso de performance individual
 * - Limites min/max de rating
 */
export class EloCalculator {
  private config: EloConfig;

  constructor(config?: Partial<EloConfig>) {
    this.config = {
      baseKFactor: 32,
      maxKFactor: 64,
      minKFactor: 16,
      provisionalGames: 20,
      performanceWeight: 0.3,
      decayDays: 30,
      decayRate: 0.995,
      minRating: 100,
      maxRating: 3000,
      initialRating: 1000,
      ...config,
    };
  }

  /**
   * Calcula probabilidade de vitoria usando formula Elo
   * @param ratingA Rating do jogador/time A
   * @param ratingB Rating do jogador/time B
   * @returns Probabilidade de A vencer (0-1)
   */
  calculateWinProbability(ratingA: number, ratingB: number): number {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  }

  /**
   * Calcula K-factor dinamico baseado em numero de jogos
   * Jogadores novos tem K maior (aprendem mais rapido)
   * Veteranos tem K menor (rating mais estavel)
   */
  calculateKFactor(gamesPlayed: number): number {
    if (gamesPlayed < this.config.provisionalGames) {
      // Fase provisional: K-factor alto
      const progress = gamesPlayed / this.config.provisionalGames;
      return this.config.maxKFactor - (this.config.maxKFactor - this.config.baseKFactor) * progress;
    }

    // Apos provisional: K diminui gradualmente
    const veteranGames = gamesPlayed - this.config.provisionalGames;
    const reduction = Math.min(veteranGames / 100, 0.5); // Max 50% de reducao
    return Math.max(this.config.minKFactor, this.config.baseKFactor * (1 - reduction));
  }

  /**
   * Calcula nova rating apos partida
   * @param result Resultado da partida
   * @param currentRating Rating atual do jogador
   * @param gamesPlayed Numero de jogos ja disputados
   * @returns Novo rating
   */
  calculateNewRating(result: MatchResult, currentRating: number, gamesPlayed: number): number {
    // Calcula probabilidade esperada de vitoria
    const expectedScore = this.calculateWinProbability(result.teamRating, result.opponentRating);

    // Score real (1 = vitoria, 0 = derrota)
    const actualScore = result.won ? 1 : 0;

    // Ajuste por performance individual
    const performanceAdjustment =
      (result.personalPerformance - 0.5) * this.config.performanceWeight;

    // K-factor dinamico
    const kFactor = this.calculateKFactor(gamesPlayed);

    // Calcula mudanca de rating
    const ratingChange = kFactor * (actualScore - expectedScore + performanceAdjustment);

    // Aplica mudanca e garante limites
    let newRating = currentRating + ratingChange;
    newRating = Math.max(this.config.minRating, Math.min(this.config.maxRating, newRating));

    return Math.round(newRating);
  }

  /**
   * Atualiza ratings de jogador apos partida
   * @param currentRating Ratings atuais
   * @param result Resultado da partida
   * @param gamesPlayed Jogos por posicao
   * @returns Ratings atualizados
   */
  updateRatings(
    currentRating: EloRating,
    result: MatchResult,
    gamesPlayed: Record<Position, number>
  ): EloRating {
    const newRating = { ...currentRating };

    // Atualiza rating da posicao especifica
    const positionGames = gamesPlayed[result.position] || 0;
    const positionKey = result.position.toLowerCase() as 'gk' | 'def' | 'mid' | 'ata';

    if (typeof newRating[positionKey] === 'number') {
      newRating[positionKey] = this.calculateNewRating(
        result,
        newRating[positionKey] as number,
        positionGames
      );
    }

    // Atualiza rating overall (media ponderada)
    newRating.overall = this.calculateOverallRating(newRating);
    newRating.lastUpdated = new Date();

    return newRating;
  }

  /**
   * Calcula rating overall como media ponderada das posicoes
   * Pondera mais as posicoes com mais jogos
   */
  calculateOverallRating(rating: EloRating): number {
    // Simples: media das 4 posicoes
    const sum = rating.gk + rating.def + rating.mid + rating.ata;
    return Math.round(sum / 4);
  }

  /**
   * Aplica decay temporal em rating
   * Jogadores inativos perdem rating gradualmente
   * @param rating Rating atual
   * @param daysSinceLastMatch Dias desde ultima partida
   * @returns Rating com decay aplicado
   */
  applyDecay(rating: EloRating, daysSinceLastMatch: number): EloRating {
    if (daysSinceLastMatch <= this.config.decayDays) {
      return rating; // Sem decay
    }

    const daysOverLimit = daysSinceLastMatch - this.config.decayDays;
    const decayFactor = Math.pow(this.config.decayRate, daysOverLimit);

    const decayedRating: EloRating = {
      overall: Math.round(rating.overall * decayFactor),
      gk: Math.round(rating.gk * decayFactor),
      def: Math.round(rating.def * decayFactor),
      mid: Math.round(rating.mid * decayFactor),
      ata: Math.round(rating.ata * decayFactor),
      lastUpdated: new Date(),
    };

    // Garante rating minimo
    decayedRating.overall = Math.max(this.config.minRating, decayedRating.overall);
    decayedRating.gk = Math.max(this.config.minRating, decayedRating.gk);
    decayedRating.def = Math.max(this.config.minRating, decayedRating.def);
    decayedRating.mid = Math.max(this.config.minRating, decayedRating.mid);
    decayedRating.ata = Math.max(this.config.minRating, decayedRating.ata);

    return decayedRating;
  }

  /**
   * Cria rating inicial para novo jogador
   */
  createInitialRating(): EloRating {
    return {
      overall: this.config.initialRating,
      gk: this.config.initialRating,
      def: this.config.initialRating,
      mid: this.config.initialRating,
      ata: this.config.initialRating,
      lastUpdated: new Date(),
    };
  }

  /**
   * Calcula rating de time baseado em jogadores
   * @param playerRatings Ratings dos jogadores do time
   * @param position Posicao considerada
   * @returns Rating medio do time
   */
  calculateTeamRating(playerRatings: EloRating[], position: Position): number {
    if (playerRatings.length === 0) return this.config.initialRating;

    const positionKey = position.toLowerCase() as keyof EloRating;
    const sum = playerRatings.reduce((acc, rating) => {
      return (
        acc +
        (typeof rating[positionKey] === 'number'
          ? (rating[positionKey] as number)
          : this.config.initialRating)
      );
    }, 0);

    return Math.round(sum / playerRatings.length);
  }
}

//   __  ____ ____ _  _
// / _\/ ___) ___) )( \
//    \___ \___ ) \/ (
// \_/\_(____(____|____/
