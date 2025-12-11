import { Database } from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import {
  playerAccounts,
  playerRatings,
  matches,
  stats,
  matchEvents,
} from '../database/schema-auth';
import { eq, desc, sql } from 'drizzle-orm';
import {
  PlayerForBalance,
  PerformanceData,
  EloRating,
  Position,
  MatchResult,
  EloChange,
} from './types';
import { EloCalculator } from './EloCalculator';
import { PositionRating } from './PositionRating';
import { PerformanceTracker } from './PerformanceTracker';

/**
 * Servico de integracao entre sistema de balance e banco de dados
 * Gerencia persistencia de ratings, historico de partidas e estatisticas
 */
export class BalanceService {
  private db;
  private eloCalculator: EloCalculator;
  private positionRating: PositionRating;
  private performanceTracker: PerformanceTracker;

  constructor(
    database: Database,
    eloCalculator: EloCalculator,
    positionRating: PositionRating,
    performanceTracker: PerformanceTracker
  ) {
    this.db = drizzle(database);
    this.eloCalculator = eloCalculator;
    this.positionRating = positionRating;
    this.performanceTracker = performanceTracker;
  }

  /**
   * Busca rating do jogador no banco
   * Cria rating inicial se nao existir
   */
  async getPlayerRating(accountId: number): Promise<EloRating> {
    const result = await this.db
      .select()
      .from(playerRatings)
      .where(eq(playerRatings.accountId, accountId))
      .limit(1);

    if (result.length === 0) {
      // Cria rating inicial
      const initialRating = this.eloCalculator.createInitialRating();
      await this.createPlayerRating(accountId, initialRating);
      return initialRating;
    }

    const rating = result[0];
    return {
      overall: rating.overall || 1000,
      gk: rating.gk || 1000,
      def: rating.def || 1000,
      mid: rating.mid || 1000,
      ata: rating.ata || 1000,
      lastUpdated: rating.updatedAt ? new Date(rating.updatedAt) : new Date(),
    };
  }

  /**
   * Cria registro inicial de rating para jogador
   */
  private async createPlayerRating(accountId: number, rating: EloRating): Promise<void> {
    await this.db.insert(playerRatings).values({
      accountId,
      overall: rating.overall,
      gk: rating.gk,
      def: rating.def,
      mid: rating.mid,
      ata: rating.ata,
      updatedAt: new Date(),
    });
  }

  /**
   * Atualiza rating do jogador no banco
   */
  async updatePlayerRating(accountId: number, rating: EloRating): Promise<void> {
    await this.db
      .update(playerRatings)
      .set({
        overall: rating.overall,
        gk: rating.gk,
        def: rating.def,
        mid: rating.mid,
        ata: rating.ata,
        updatedAt: new Date(),
      })
      .where(eq(playerRatings.accountId, accountId));
  }

  /**
   * Busca performances recentes do jogador
   * @param accountId ID da conta
   * @param limit Numero de partidas a buscar (padrao 10)
   */
  async getRecentPerformances(
    accountId: number,
    limit: number = 10
  ): Promise<PerformanceData[]> {
    const result = await this.db
      .select({
        matchId: stats.matchId,
        goals: stats.goals,
        assists: stats.assists,
        saves: stats.saves,
        touches: stats.touches,
        scoreRed: matches.scoreRed,
        scoreBlue: matches.scoreBlue,
        endedAt: matches.endedAt,
      })
      .from(stats)
      .innerJoin(matches, eq(stats.matchId, matches.id))
      .where(eq(stats.accountId, accountId))
      .orderBy(desc(matches.endedAt))
      .limit(limit);

    return result.map((row) => {
      // Determina se foi vitoria (assume time azul)
      const won = (row.scoreBlue || 0) > (row.scoreRed || 0);
      const possession = this.estimatePossession(row.touches || 0);
      const cleanSheet = (row.scoreRed || 0) === 0;

      return {
        matchId: row.matchId || 0,
        goals: row.goals || 0,
        assists: row.assists || 0,
        saves: row.saves || 0,
        won,
        cleanSheet,
        possession,
        performanceScore: 0, // Calculado posteriormente
        matchDate: row.endedAt ? new Date(row.endedAt) : new Date(),
      };
    });
  }

  /**
   * Estima posse de bola baseado em toques
   * Simplificado: normaliza toques entre 0-100%
   */
  private estimatePossession(touches: number): number {
    // Assume maximo de 200 toques por jogo
    return Math.min(100, Math.round((touches / 200) * 100));
  }

  /**
   * Busca jogador completo para balanceamento
   * Inclui rating, performance recente e estatisticas
   */
  async getPlayerForBalance(accountId: number): Promise<PlayerForBalance | null> {
    const account = await this.db
      .select()
      .from(playerAccounts)
      .where(eq(playerAccounts.id, accountId))
      .limit(1);

    if (account.length === 0) return null;

    const rating = await this.getPlayerRating(accountId);
    const performances = await this.getRecentPerformances(accountId, 10);

    // Determina melhor posicao e calcula performance recente
    const bestPosition = this.positionRating.getBestPosition(rating);
    const recentPerformance = this.performanceTracker.analyzeRecentForm(
      performances,
      bestPosition
    );

    return {
      id: accountId,
      nick: account[0].haxballNick,
      rating,
      preferredPosition: bestPosition,
      recentPerformance,
    };
  }

  /**
   * Busca multiplos jogadores para balanceamento
   */
  async getPlayersForBalance(accountIds: number[]): Promise<PlayerForBalance[]> {
    const players: PlayerForBalance[] = [];

    for (const accountId of accountIds) {
      const player = await this.getPlayerForBalance(accountId);
      if (player) players.push(player);
    }

    return players;
  }

  /**
   * Registra resultado de partida e atualiza ratings
   */
  async recordMatchResult(
    accountId: number,
    matchResult: MatchResult,
    performance: PerformanceData
  ): Promise<EloChange> {
    // Busca rating atual
    const currentRating = await this.getPlayerRating(accountId);

    // Busca numero de jogos por posicao
    const gamesPlayed = await this.getGamesPlayedByPosition(accountId);

    // Calcula novo rating
    const newRating = this.eloCalculator.updateRatings(
      currentRating,
      matchResult,
      gamesPlayed
    );

    // Salva novo rating
    await this.updatePlayerRating(accountId, newRating);

    // Calcula mudancas
    const changes: Record<Position, number> = {
      [Position.GK]: newRating.gk - currentRating.gk,
      [Position.DEF]: newRating.def - currentRating.def,
      [Position.MID]: newRating.mid - currentRating.mid,
      [Position.ATA]: newRating.ata - currentRating.ata,
    };

    return {
      accountId,
      matchId: matchResult.matchId,
      position: matchResult.position,
      oldRating: currentRating[matchResult.position.toLowerCase() as keyof EloRating] as number,
      newRating: newRating[matchResult.position.toLowerCase() as keyof EloRating] as number,
      change: changes[matchResult.position],
      reason: matchResult.won ? 'victory' : 'defeat',
      timestamp: new Date(),
    };
  }

  /**
   * Busca numero de jogos por posicao
   * Usa eventos de partida para determinar posicao jogada
   */
  private async getGamesPlayedByPosition(accountId: number): Promise<Record<Position, number>> {
    // Query simplificada: conta partidas totais e distribui uniformemente
    // Em producao, deve rastrear posicoes reais via matchEvents
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(stats)
      .where(eq(stats.accountId, accountId));

    const totalGames = result[0]?.count || 0;
    const gamesPerPosition = Math.floor(totalGames / 4);

    return {
      [Position.GK]: gamesPerPosition,
      [Position.DEF]: gamesPerPosition,
      [Position.MID]: gamesPerPosition,
      [Position.ATA]: gamesPerPosition,
    };
  }

  /**
   * Aplica decay temporal em ratings de jogadores inativos
   */
  async applyDecayToInactivePlayers(inactiveDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);

    // Busca jogadores inativos
    const inactivePlayers = await this.db
      .select({
        accountId: playerRatings.accountId,
        updatedAt: playerRatings.updatedAt,
      })
      .from(playerRatings)
      .where(sql`${playerRatings.updatedAt} < ${cutoffDate.getTime()}`);

    let decayedCount = 0;

    for (const player of inactivePlayers) {
      const rating = await this.getPlayerRating(player.accountId);
      const daysSinceUpdate = Math.floor(
        (Date.now() - (player.updatedAt?.getTime() || Date.now())) / (1000 * 60 * 60 * 24)
      );

      const decayedRating = this.eloCalculator.applyDecay(rating, daysSinceUpdate);

      if (decayedRating.overall !== rating.overall) {
        await this.updatePlayerRating(player.accountId, decayedRating);
        decayedCount++;
      }
    }

    return decayedCount;
  }

  /**
   * Busca top jogadores por rating em uma posicao
   */
  async getTopPlayersByPosition(position: Position, limit: number = 10): Promise<
    Array<{
      accountId: number;
      nick: string;
      rating: number;
      gamesPlayed: number;
    }>
  > {
    const positionColumn = position.toLowerCase() as 'gk' | 'def' | 'mid' | 'ata';

    const result = await this.db
      .select({
        accountId: playerRatings.accountId,
        nick: playerAccounts.haxballNick,
        rating: playerRatings[positionColumn],
      })
      .from(playerRatings)
      .innerJoin(playerAccounts, eq(playerRatings.accountId, playerAccounts.id))
      .orderBy(desc(playerRatings[positionColumn]))
      .limit(limit);

    // Busca numero de jogos para cada jogador
    const playersWithGames = await Promise.all(
      result.map(async (player) => {
        const gamesPlayed = await this.getGamesPlayedByPosition(player.accountId);
        return {
          accountId: player.accountId,
          nick: player.nick,
          rating: player.rating || 1000,
          gamesPlayed: gamesPlayed[position],
        };
      })
    );

    return playersWithGames;
  }

  /**
   * Calcula estatisticas globais do sistema de rating
   */
  async getGlobalRatingStats(): Promise<{
    totalPlayers: number;
    averageRating: number;
    medianRating: number;
    topRating: number;
    bottomRating: number;
  }> {
    const allRatings = await this.db.select({ overall: playerRatings.overall }).from(playerRatings);

    const ratings = allRatings.map((r) => r.overall || 1000).sort((a, b) => a - b);

    const totalPlayers = ratings.length;
    const averageRating = ratings.reduce((sum, r) => sum + r, 0) / totalPlayers;
    const medianRating = ratings[Math.floor(totalPlayers / 2)];
    const topRating = ratings[ratings.length - 1];
    const bottomRating = ratings[0];

    return {
      totalPlayers,
      averageRating: Math.round(averageRating),
      medianRating,
      topRating,
      bottomRating,
    };
  }
}

//   __  ____ ____ _  _
// / _\/ ___) ___) )( \
//    \___ \___ ) \/ (
// \_/\_(____(____|____/
