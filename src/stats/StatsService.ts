import { Database } from 'better-sqlite3';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { BalanceService } from '../balance/BalanceService';
import { matchEvents, stats } from '../database/schema-auth';
import {
  advancedStats,
  heatmapData,
  playerPositions,
  playerStatsAggregate,
} from '../database/schema-stats';
import { StatsCalculator } from './StatsCalculator';
import {
  AdvancedMatchStats,
  BasicMatchStats,
  HeatmapData,
  MatchEvent,
  PlayerStatsAggregate,
  Position2D,
  StatsFilter,
} from './types';

/**
 * Servico de estatisticas com integracao a banco e outros sistemas
 * Gerencia persistencia, consultas e integracao com auth/balance
 */
export class StatsService {
  private db;
  private sqlite?: Database;
  private calculator: StatsCalculator;
  private balanceService?: BalanceService;

  constructor(database: Database, calculator: StatsCalculator, balanceService?: BalanceService) {
    this.sqlite = database;
    this.db = drizzle(database);
    this.calculator = calculator;
    this.balanceService = balanceService;
  }

  /**
   * Salva stats basicas no banco
   */
  async saveBasicStats(matchStats: BasicMatchStats): Promise<void> {
    await this.db.insert(stats).values({
      matchId: matchStats.matchId,
      accountId: matchStats.accountId,
      goals: matchStats.goals,
      assists: matchStats.assists,
      saves: matchStats.saves,
      touches: matchStats.touches,
      distance: 0, // Calculado depois com advanced stats
    });
  }

  /**
   * Salva stats avancadas no banco
   */
  async saveAdvancedStats(matchStats: AdvancedMatchStats): Promise<void> {
    await this.db.insert(advancedStats).values({
      matchId: matchStats.matchId,
      accountId: matchStats.accountId,
      goals: matchStats.goals,
      assists: matchStats.assists,
      saves: matchStats.saves,
      ownGoals: matchStats.ownGoals,
      touches: matchStats.touches,
      passes: matchStats.passes,
      passesCompleted: matchStats.passesCompleted,
      interceptions: matchStats.interceptions,
      tackles: matchStats.tackles,
      possessionTime: matchStats.possessionTime,
      distanceCovered: matchStats.distanceCovered,
      topSpeed: matchStats.topSpeed,
      averageSpeed: matchStats.averageSpeed,
      shotsOnGoal: matchStats.shotsOnGoal,
      shotsOffGoal: matchStats.shotsOffGoal,
      timesDispossessed: matchStats.timesDispossessed,
      timeInGame: matchStats.timeInGame,
      team: matchStats.team,
      won: matchStats.won,
    });
  }

  /**
   * Salva posicoes rastreadas no banco
   */
  async savePositions(matchId: number, accountId: number, positions: Position2D[]): Promise<void> {
    const values = positions.map((pos) => ({
      matchId,
      accountId,
      x: pos.x,
      y: pos.y,
      timestamp: pos.timestamp,
    }));

    if (values.length > 0) {
      // Insert em batch para eficiencia
      await this.db.insert(playerPositions).values(values);
    }
  }

  /**
   * Salva heatmap no banco
   */
  async saveHeatmap(heatmap: HeatmapData): Promise<void> {
    await this.db.insert(heatmapData).values({
      matchId: heatmap.matchId,
      accountId: heatmap.accountId,
      gridSize: heatmap.gridSize,
      densityMap: JSON.stringify(heatmap.densityMap),
      minX: heatmap.minX,
      maxX: heatmap.maxX,
      minY: heatmap.minY,
      maxY: heatmap.maxY,
    });
  }

  /**
   * Salva evento de partida
   */
  async saveEvent(event: MatchEvent): Promise<void> {
    await this.db.insert(matchEvents).values({
      matchId: event.matchId,
      accountId: event.accountId,
      type: event.eventType,
      payload: JSON.stringify({
        position: event.position,
        metadata: event.metadata,
      }),
      at: event.timestamp,
    });
  }

  /**
   * Busca stats basicas por filtro
   */
  async getBasicStats(filter: StatsFilter): Promise<BasicMatchStats[]> {
    const conditions = this.buildFilterConditions(filter);

    const result = await this.db
      .select()
      .from(stats)
      .where(and(...conditions))
      .orderBy(desc(stats.matchId))
      .limit(filter.limit || 100)
      .offset(filter.offset || 0);
    // Fallback: if drizzle returned no rows, check raw sqlite table in case modules used different wrappers
    if ((!result || result.length === 0) && this.sqlite) {
      try {
        const stmt = this.sqlite.prepare('SELECT * FROM stats' +
          (conditions.length > 0 ? ' WHERE ' + filter.accountIds?.map(() => 'account_id = ?').join(' OR ') : '') +
          ' ORDER BY match_id DESC LIMIT ? OFFSET ?');
        const params: any[] = [];
        if (filter.accountIds && filter.accountIds.length > 0) {
          params.push(...filter.accountIds);
        }
        params.push(filter.limit || 100, filter.offset || 0);
        const rows = stmt.all(...params);
        return rows.map((row: any) => ({
          accountId: row.account_id || 0,
          matchId: row.match_id || 0,
          goals: row.goals || 0,
          assists: row.assists || 0,
          saves: row.saves || 0,
          ownGoals: 0,
          touches: row.touches || 0,
          timeInGame: 0,
          team: 'spectator',
          won: false,
        }));
      } catch (err) {
        // ignore fallback errors
      }
    }
    return result.map((row) => ({
      accountId: row.accountId || 0,
      matchId: row.matchId || 0,
      goals: row.goals || 0,
      assists: row.assists || 0,
      saves: row.saves || 0,
      ownGoals: 0, // Nao disponivel em stats basicas
      touches: row.touches || 0,
      timeInGame: 0,
      team: 'spectator',
      won: false,
    }));
  }

  /**
   * Busca stats avancadas por filtro
   */
  async getAdvancedStats(filter: StatsFilter): Promise<AdvancedMatchStats[]> {
    const conditions = this.buildAdvancedFilterConditions(filter);

    const result = await this.db
      .select()
      .from(advancedStats)
      .where(and(...conditions))
      .orderBy(desc(advancedStats.matchId))
      .limit(filter.limit || 100)
      .offset(filter.offset || 0);

    // Fallback: check raw sqlite table
    if ((!result || result.length === 0) && this.sqlite) {
      try {
        const stmt = this.sqlite.prepare('SELECT * FROM advanced_stats' +
          (filter.accountIds && filter.accountIds.length > 0 ? ' WHERE account_id = ?' : '') +
          ' ORDER BY match_id DESC LIMIT ? OFFSET ?');
        const params: any[] = [];
        if (filter.accountIds && filter.accountIds.length > 0) params.push(filter.accountIds[0]);
        params.push(filter.limit || 100, filter.offset || 0);
        const rows = stmt.all(...params);
        return rows.map((row: any) => ({
          accountId: row.account_id,
          matchId: row.match_id,
          goals: row.goals || 0,
          assists: row.assists || 0,
          saves: row.saves || 0,
          ownGoals: row.own_goals || 0,
          touches: row.touches || 0,
          passes: row.passes || 0,
          passesCompleted: row.passes_completed || 0,
          interceptions: row.interceptions || 0,
          tackles: row.tackles || 0,
          possessionTime: row.possession_time || 0,
          distanceCovered: row.distance_covered || 0,
          topSpeed: row.top_speed || 0,
          averageSpeed: row.average_speed || 0,
          shotsOnGoal: row.shots_on_goal || 0,
          shotsOffGoal: row.shots_off_goal || 0,
          timesDispossessed: row.times_dispossessed || 0,
          timeInGame: row.time_in_game || 0,
          team: (row.team as 'red' | 'blue' | 'spectator') || 'spectator',
          won: Boolean(row.won),
        }));
      } catch (err) {
        // ignore fallback errors
      }
    }

    return result.map((row) => ({
      accountId: row.accountId,
      matchId: row.matchId,
      goals: row.goals || 0,
      assists: row.assists || 0,
      saves: row.saves || 0,
      ownGoals: row.ownGoals || 0,
      touches: row.touches || 0,
      passes: row.passes || 0,
      passesCompleted: row.passesCompleted || 0,
      interceptions: row.interceptions || 0,
      tackles: row.tackles || 0,
      possessionTime: row.possessionTime || 0,
      distanceCovered: row.distanceCovered || 0,
      topSpeed: row.topSpeed || 0,
      averageSpeed: row.averageSpeed || 0,
      shotsOnGoal: row.shotsOnGoal || 0,
      shotsOffGoal: row.shotsOffGoal || 0,
      timesDispossessed: row.timesDispossessed || 0,
      timeInGame: row.timeInGame || 0,
      team: (row.team as 'red' | 'blue' | 'spectator') || 'spectator',
      won: row.won || false,
    }));
  }

  /**
   * Constroi condicoes de filtro para query
   */
  private buildFilterConditions(filter: StatsFilter): any[] {
    const conditions: any[] = [];
    if (filter.accountIds && filter.accountIds.length > 0) {
      if (filter.accountIds.length === 1) {
        conditions.push(eq(stats.accountId, filter.accountIds[0]));
      } else {
        conditions.push(sql`${stats.accountId} IN (${sql.join(filter.accountIds, sql`, `)})`);
      }
    }

    if (filter.matchIds && filter.matchIds.length > 0) {
      conditions.push(sql`${stats.matchId} IN (${sql.join(filter.matchIds, sql`, `)})`);
    }

    if (filter.minGoals !== undefined) {
      conditions.push(gte(stats.goals, filter.minGoals));
    }

    if (filter.minAssists !== undefined) {
      conditions.push(gte(stats.assists, filter.minAssists));
    }

    return conditions.length > 0 ? conditions : [sql`1=1`];
  }

  /**
   * Constroi condicoes de filtro para advanced stats
   */
  private buildAdvancedFilterConditions(filter: StatsFilter): any[] {
    const conditions: any[] = [];

    if (filter.accountIds && filter.accountIds.length > 0) {
      if (filter.accountIds.length === 1) {
        conditions.push(eq(advancedStats.accountId, filter.accountIds[0]));
      } else {
        conditions.push(sql`${advancedStats.accountId} IN (${sql.join(filter.accountIds, sql`, `)})`);
      }
    }

    if (filter.matchIds && filter.matchIds.length > 0) {
      conditions.push(sql`${advancedStats.matchId} IN (${sql.join(filter.matchIds, sql`, `)})`);
    }

    if (filter.team) {
      conditions.push(eq(advancedStats.team, filter.team));
    }

    if (filter.won !== undefined) {
      conditions.push(eq(advancedStats.won, filter.won));
    }

    return conditions.length > 0 ? conditions : [sql`1=1`];
  }

  /**
   * Busca agregado de jogador (pre-calculado)
   */
  async getPlayerAggregate(accountId: number): Promise<PlayerStatsAggregate | null> {
    const result = await this.db
      .select()
      .from(playerStatsAggregate)
      .where(eq(playerStatsAggregate.accountId, accountId))
      .limit(1);

    if (result.length === 0) return null;

    const row = result[0];

    return {
      accountId: row.accountId,
      totalMatches: row.totalMatches || 0,
      totalWins: row.totalWins || 0,
      totalLosses: row.totalLosses || 0,
      totalDraws: row.totalDraws || 0,
      winRate: row.winRate || 0,
      totalGoals: row.totalGoals || 0,
      totalAssists: row.totalAssists || 0,
      totalSaves: row.totalSaves || 0,
      totalOwnGoals: row.totalOwnGoals || 0,
      avgGoalsPerMatch: row.avgGoalsPerMatch || 0,
      avgAssistsPerMatch: row.avgAssistsPerMatch || 0,
      avgSavesPerMatch: row.avgSavesPerMatch || 0,
      totalPasses: row.totalPasses || undefined,
      passAccuracy: row.passAccuracy || undefined,
      totalInterceptions: row.totalInterceptions || undefined,
      totalDistanceCovered: row.totalDistanceCovered || undefined,
      avgSpeed: row.avgSpeed || undefined,
      firstMatchDate: row.firstMatchDate || new Date(),
      lastMatchDate: row.lastMatchDate || new Date(),
      updatedAt: row.updatedAt || new Date(),
    };
  }

  /**
   * Atualiza agregado de jogador
   * Recalcula a partir de todas as stats
   */
  async updatePlayerAggregate(accountId: number): Promise<void> {
    // Busca todas as stats do jogador
    const basicStats = await this.getBasicStats({ accountIds: [accountId], limit: 10000 });
    const advancedStatsData = await this.getAdvancedStats({
      accountIds: [accountId],
      limit: 10000,
    });

    if (basicStats.length === 0) return;

    // Calcula agregado
    const aggregate = this.calculator.calculatePlayerAggregate(
      basicStats,
      advancedStatsData.length > 0 ? advancedStatsData : undefined
    );

    // Verifica se ja existe
    const existing = await this.getPlayerAggregate(accountId);

    if (existing) {
      // Update
      await this.db
        .update(playerStatsAggregate)
        .set({
          totalMatches: aggregate.totalMatches,
          totalWins: aggregate.totalWins,
          totalLosses: aggregate.totalLosses,
          totalDraws: aggregate.totalDraws,
          winRate: aggregate.winRate,
          totalGoals: aggregate.totalGoals,
          totalAssists: aggregate.totalAssists,
          totalSaves: aggregate.totalSaves,
          totalOwnGoals: aggregate.totalOwnGoals,
          avgGoalsPerMatch: aggregate.avgGoalsPerMatch,
          avgAssistsPerMatch: aggregate.avgAssistsPerMatch,
          avgSavesPerMatch: aggregate.avgSavesPerMatch,
          totalPasses: aggregate.totalPasses,
          passAccuracy: aggregate.passAccuracy,
          totalInterceptions: aggregate.totalInterceptions,
          totalDistanceCovered: aggregate.totalDistanceCovered,
          avgSpeed: aggregate.avgSpeed,
          lastMatchDate: aggregate.lastMatchDate,
          updatedAt: new Date(),
        })
        .where(eq(playerStatsAggregate.accountId, accountId));
    } else {
      // Insert
      await this.db.insert(playerStatsAggregate).values({
        accountId: aggregate.accountId,
        totalMatches: aggregate.totalMatches,
        totalWins: aggregate.totalWins,
        totalLosses: aggregate.totalLosses,
        totalDraws: aggregate.totalDraws,
        winRate: aggregate.winRate,
        totalGoals: aggregate.totalGoals,
        totalAssists: aggregate.totalAssists,
        totalSaves: aggregate.totalSaves,
        totalOwnGoals: aggregate.totalOwnGoals,
        avgGoalsPerMatch: aggregate.avgGoalsPerMatch,
        avgAssistsPerMatch: aggregate.avgAssistsPerMatch,
        avgSavesPerMatch: aggregate.avgSavesPerMatch,
        totalPasses: aggregate.totalPasses,
        passAccuracy: aggregate.passAccuracy,
        totalInterceptions: aggregate.totalInterceptions,
        totalDistanceCovered: aggregate.totalDistanceCovered,
        avgSpeed: aggregate.avgSpeed,
        firstMatchDate: aggregate.firstMatchDate,
        lastMatchDate: aggregate.lastMatchDate,
        updatedAt: new Date(),
      });
    }
  }

  /**
   * Busca heatmap de jogador em partida
   */
  async getHeatmap(matchId: number, accountId: number): Promise<HeatmapData | null> {
    const result = await this.db
      .select()
      .from(heatmapData)
      .where(and(eq(heatmapData.matchId, matchId), eq(heatmapData.accountId, accountId)))
      .limit(1);

    if (result.length === 0) return null;

    const row = result[0];

    return {
      accountId: row.accountId,
      matchId: row.matchId,
      gridSize: row.gridSize,
      densityMap: JSON.parse(row.densityMap),
      minX: row.minX,
      maxX: row.maxX,
      minY: row.minY,
      maxY: row.maxY,
    };
  }

  /**
   * Busca posicoes de jogador em partida
   */
  async getPositions(matchId: number, accountId: number): Promise<Position2D[]> {
    const result = await this.db
      .select()
      .from(playerPositions)
      .where(and(eq(playerPositions.matchId, matchId), eq(playerPositions.accountId, accountId)))
      .orderBy(playerPositions.timestamp);

    return result.map((row) => ({
      x: row.x,
      y: row.y,
      timestamp: row.timestamp || new Date(),
    }));
  }

  /**
   * Integracao: Atualiza rating Elo apos partida
   * Usa BalanceService se disponivel
   */
  async updateRatingAfterMatch(_matchStats: AdvancedMatchStats): Promise<void> {
    if (!this.balanceService) return;

    // TODO: Implementar integracao com BalanceService
    // Requer informacoes adicionais como teamRating, opponentRating
    // Por ora, apenas placeholder
  }

  /**
   * Busca top jogadores por metrica
   */
  async getTopPlayers(
    metric: keyof PlayerStatsAggregate,
    limit: number = 10
  ): Promise<PlayerStatsAggregate[]> {
    const result = await this.db
      .select()
      .from(playerStatsAggregate)
      .orderBy(desc(playerStatsAggregate[metric]))
      .limit(limit);

    return result.map((row) => ({
      accountId: row.accountId,
      totalMatches: row.totalMatches || 0,
      totalWins: row.totalWins || 0,
      totalLosses: row.totalLosses || 0,
      totalDraws: row.totalDraws || 0,
      winRate: row.winRate || 0,
      totalGoals: row.totalGoals || 0,
      totalAssists: row.totalAssists || 0,
      totalSaves: row.totalSaves || 0,
      totalOwnGoals: row.totalOwnGoals || 0,
      avgGoalsPerMatch: row.avgGoalsPerMatch || 0,
      avgAssistsPerMatch: row.avgAssistsPerMatch || 0,
      avgSavesPerMatch: row.avgSavesPerMatch || 0,
      totalPasses: row.totalPasses || undefined,
      passAccuracy: row.passAccuracy || undefined,
      totalInterceptions: row.totalInterceptions || undefined,
      totalDistanceCovered: row.totalDistanceCovered || undefined,
      avgSpeed: row.avgSpeed || undefined,
      firstMatchDate: row.firstMatchDate || new Date(),
      lastMatchDate: row.lastMatchDate || new Date(),
      updatedAt: row.updatedAt || new Date(),
    }));
  }

  /**
   * Processa partida completa e salva todas as stats
   */
  async processCompleteMatch(
    basicStats: BasicMatchStats[],
    advancedStats: AdvancedMatchStats[],
    positions: Map<number, Position2D[]>,
    events: MatchEvent[]
  ): Promise<void> {
    // Salva basic stats
    for (const stat of basicStats) {
      await this.saveBasicStats(stat);
    }

    // Salva advanced stats
    for (const stat of advancedStats) {
      await this.saveAdvancedStats(stat);
    }

    // Salva posicoes e gera heatmaps
    for (const [accountId, pos] of positions) {
      if (pos.length > 0) {
        await this.savePositions(basicStats[0].matchId, accountId, pos);

        // Gera e salva heatmap
        const heatmap = this.calculator.calculateHeatmap(accountId, basicStats[0].matchId, pos, 20);
        await this.saveHeatmap(heatmap);
      }
    }

    // Salva eventos
    for (const event of events) {
      await this.saveEvent(event);
    }

    // Atualiza agregados dos jogadores
    const uniqueAccountIds = [...new Set(basicStats.map((s) => s.accountId))];
    for (const accountId of uniqueAccountIds) {
      await this.updatePlayerAggregate(accountId);
    }
  }
}

//   __  ____ ____ _  _
// / _\/ ___) ___) )( \
//    \___ \___ ) \/ (
// \_/\_(____(____|____/
