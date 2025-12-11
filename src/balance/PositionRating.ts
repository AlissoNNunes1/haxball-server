import { EloCalculator } from './EloCalculator';
import { EloRating, PerformanceData, Position, RecentPerformance } from './types';

/**
 * Gerenciador de ratings por posicao
 * Rastreia e atualiza ratings especificos de cada posicao
 * Considera especializacao e versatilidade do jogador
 */
export class PositionRating {
  private eloCalculator: EloCalculator;

  constructor(eloCalculator: EloCalculator) {
    this.eloCalculator = eloCalculator;
  }

  /**
   * Retorna rating do jogador para posicao especifica
   * @param rating Ratings completos do jogador
   * @param position Posicao desejada
   * @returns Rating da posicao
   */
  getRatingForPosition(rating: EloRating, position: Position): number {
    switch (position) {
      case Position.GK:
        return rating.gk;
      case Position.DEF:
        return rating.def;
      case Position.MID:
        return rating.mid;
      case Position.ATA:
        return rating.ata;
      default:
        return rating.overall;
    }
  }

  /**
   * Calcula melhor posicao para jogador
   * Retorna posicao com maior rating
   */
  getBestPosition(rating: EloRating): Position {
    const ratings = [
      { position: Position.GK, value: rating.gk },
      { position: Position.DEF, value: rating.def },
      { position: Position.MID, value: rating.mid },
      { position: Position.ATA, value: rating.ata },
    ];

    return ratings.reduce((best, current) => (current.value > best.value ? current : best))
      .position;
  }

  /**
   * Calcula versatilidade do jogador
   * Mede o quao uniforme sao os ratings entre posicoes
   * @returns Valor entre 0 (especialista) e 1 (versatil)
   */
  calculateVersatility(rating: EloRating): number {
    const ratings = [rating.gk, rating.def, rating.mid, rating.ata];
    const mean = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
    const variance = ratings.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / ratings.length;
    const stdDev = Math.sqrt(variance);

    // Normaliza: maior desvio = menor versatilidade
    // Assume desvio maximo de 500 pontos
    const versatility = Math.max(0, 1 - stdDev / 500);
    return Math.round(versatility * 100) / 100;
  }

  /**
   * Calcula fator de especializacao para posicao
   * Quanto maior o rating nessa posicao comparado as outras, maior o fator
   * @returns Valor entre 1.0 (nao especializado) e 1.5 (altamente especializado)
   */
  calculateSpecializationFactor(rating: EloRating, position: Position): number {
    const positionRating = this.getRatingForPosition(rating, position);
    const otherRatings = [rating.gk, rating.def, rating.mid, rating.ata].filter((r) => {
      return r !== positionRating;
    });

    const avgOthers = otherRatings.reduce((sum, r) => sum + r, 0) / otherRatings.length;

    if (avgOthers === 0) return 1.0;

    const ratio = positionRating / avgOthers;
    const factor = 1 + Math.min(0.5, Math.max(0, (ratio - 1) * 0.5));

    return Math.round(factor * 100) / 100;
  }

  /**
   * Sugere posicoes alternativas para jogador
   * Retorna posicoes ordenadas por rating (exceto a principal)
   */
  suggestAlternativePositions(rating: EloRating, currentPosition: Position): Position[] {
    const positions = [
      { position: Position.GK, value: rating.gk },
      { position: Position.DEF, value: rating.def },
      { position: Position.MID, value: rating.mid },
      { position: Position.ATA, value: rating.ata },
    ];

    return positions
      .filter((p) => p.position !== currentPosition)
      .sort((a, b) => b.value - a.value)
      .map((p) => p.position);
  }

  /**
   * Calcula confianca no rating de uma posicao
   * Baseia-se no numero de jogos e variancia recente
   * @param gamesPlayed Numero de jogos na posicao
   * @param recentPerformances Performances recentes
   * @returns Confianca entre 0 e 1
   */
  calculateRatingConfidence(gamesPlayed: number, recentPerformances?: PerformanceData[]): number {
    // Confianca base: aumenta com numero de jogos (assintota em 100 jogos)
    const gameConfidence = Math.min(1, gamesPlayed / 100);

    if (!recentPerformances || recentPerformances.length < 3) {
      return gameConfidence;
    }

    // Confianca por consistencia: menor variancia = maior confianca
    const performances = recentPerformances.slice(-10); // Ultimos 10 jogos
    const scores = performances.map((p) => p.performanceScore);
    const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
    const consistency = Math.max(0, 1 - variance * 2); // Variance esperada ~0.5

    // Combina confiancas
    const confidence = gameConfidence * 0.7 + consistency * 0.3;
    return Math.round(confidence * 100) / 100;
  }

  /**
   * Calcula penalty por jogar fora da melhor posicao
   * Reduz rating efetivo quando jogador nao esta na sua posicao ideal
   * @returns Fator multiplicador entre 0.8 e 1.0
   */
  calculateOffPositionPenalty(rating: EloRating, assignedPosition: Position): number {
    const bestPosition = this.getBestPosition(rating);
    if (assignedPosition === bestPosition) return 1.0;

    const bestRating = this.getRatingForPosition(rating, bestPosition);
    const assignedRating = this.getRatingForPosition(rating, assignedPosition);

    if (bestRating === 0) return 1.0;

    const ratingRatio = assignedRating / bestRating;
    const penalty = Math.max(0.8, ratingRatio); // Minimo 20% de penalty

    return Math.round(penalty * 100) / 100;
  }

  /**
   * Ajusta rating considerando posicao e contexto
   * Aplica fatores de especializacao, forma recente, etc
   */
  getEffectiveRating(
    rating: EloRating,
    position: Position,
    recentPerformance?: RecentPerformance
  ): number {
    let effectiveRating = this.getRatingForPosition(rating, position);

    // Aplica boost de especializacao
    const specializationFactor = this.calculateSpecializationFactor(rating, position);
    effectiveRating *= specializationFactor;

    // Aplica ajuste de forma recente
    if (recentPerformance && recentPerformance.trend !== 'stable') {
      const formAdjustment = recentPerformance.trend === 'improving' ? 1.05 : 0.95;
      effectiveRating *= formAdjustment;
    }

    // Aplica penalty se fora da melhor posicao
    const offPositionPenalty = this.calculateOffPositionPenalty(rating, position);
    effectiveRating *= offPositionPenalty;

    return Math.round(effectiveRating);
  }

  /**
   * Compara dois jogadores para mesma posicao
   * Retorna diferenca de rating considerando especializacao
   * @returns Numero positivo se playerA > playerB
   */
  comparePlayersForPosition(ratingA: EloRating, ratingB: EloRating, position: Position): number {
    const effectiveA = this.getEffectiveRating(ratingA, position);
    const effectiveB = this.getEffectiveRating(ratingB, position);

    return effectiveA - effectiveB;
  }
}

//   __  ____ ____ _  _
// / _\/ ___) ___) )( \
//    \___ \___ ) \/ (
// \_/\_(____(____|____/
