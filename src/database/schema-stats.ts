import { sql } from 'drizzle-orm';
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { playerAccounts, matches } from './schema-auth';

/**
 * Tabela de estatisticas avancadas de jogador por partida
 */
export const advancedStats = sqliteTable('advanced_stats', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  matchId: integer('match_id')
    .notNull()
    .references(() => matches.id),
  accountId: integer('account_id')
    .notNull()
    .references(() => playerAccounts.id),
  
  // Stats basicas (redundante mas otimiza queries)
  goals: integer('goals').default(0),
  assists: integer('assists').default(0),
  saves: integer('saves').default(0),
  ownGoals: integer('own_goals').default(0),
  touches: integer('touches').default(0),
  
  // Stats avancadas
  passes: integer('passes').default(0),
  passesCompleted: integer('passes_completed').default(0),
  interceptions: integer('interceptions').default(0),
  tackles: integer('tackles').default(0),
  possessionTime: real('possession_time').default(0), // segundos
  distanceCovered: real('distance_covered').default(0),
  topSpeed: real('top_speed').default(0),
  averageSpeed: real('average_speed').default(0),
  shotsOnGoal: integer('shots_on_goal').default(0),
  shotsOffGoal: integer('shots_off_goal').default(0),
  timesDispossessed: integer('times_dispossessed').default(0),
  
  // Metadata
  timeInGame: integer('time_in_game').default(0), // segundos
  team: text('team').notNull(), // red, blue, spectator
  won: integer('won', { mode: 'boolean' }).default(false).notNull(),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

/**
 * Tabela de rastreamento de posicoes (amostras)
 * Armazena posicoes em intervalos regulares
 */
export const playerPositions = sqliteTable('player_positions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  matchId: integer('match_id')
    .notNull()
    .references(() => matches.id),
  accountId: integer('account_id')
    .notNull()
    .references(() => playerAccounts.id),
  
  x: real('x').notNull(),
  y: real('y').notNull(),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
  
  // Index para queries eficientes
  // CREATE INDEX idx_positions_match_account ON player_positions(match_id, account_id);
});

/**
 * Tabela de heatmap pre-calculado
 * Armazena densidade de posicao em grid
 */
export const heatmapData = sqliteTable('heatmap_data', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  matchId: integer('match_id')
    .notNull()
    .references(() => matches.id),
  accountId: integer('account_id')
    .notNull()
    .references(() => playerAccounts.id),
  
  gridSize: integer('grid_size').notNull(), // ex: 20 (grid 20x20)
  densityMap: text('density_map').notNull(), // JSON: number[][]
  minX: real('min_x').notNull(),
  maxX: real('max_x').notNull(),
  minY: real('min_y').notNull(),
  maxY: real('max_y').notNull(),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

/**
 * Tabela de estatisticas agregadas por jogador
 * Pre-calculadas para consultas rapidas
 */
export const playerStatsAggregate = sqliteTable('player_stats_aggregate', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountId: integer('account_id')
    .notNull()
    .unique()
    .references(() => playerAccounts.id),
  
  totalMatches: integer('total_matches').default(0),
  totalWins: integer('total_wins').default(0),
  totalLosses: integer('total_losses').default(0),
  totalDraws: integer('total_draws').default(0),
  winRate: real('win_rate').default(0),
  
  // Stats basicas
  totalGoals: integer('total_goals').default(0),
  totalAssists: integer('total_assists').default(0),
  totalSaves: integer('total_saves').default(0),
  totalOwnGoals: integer('total_own_goals').default(0),
  
  // Medias
  avgGoalsPerMatch: real('avg_goals_per_match').default(0),
  avgAssistsPerMatch: real('avg_assists_per_match').default(0),
  avgSavesPerMatch: real('avg_saves_per_match').default(0),
  
  // Stats avancadas
  totalPasses: integer('total_passes').default(0),
  passAccuracy: real('pass_accuracy').default(0),
  totalInterceptions: integer('total_interceptions').default(0),
  totalDistanceCovered: real('total_distance_covered').default(0),
  avgSpeed: real('avg_speed').default(0),
  
  // Periodo
  firstMatchDate: integer('first_match_date', { mode: 'timestamp' }),
  lastMatchDate: integer('last_match_date', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

/**
 * Tabela de eventos de partida
 * Ja existe em schema-auth.ts mas extendemos aqui
 */
// Reexporta matchEvents de schema-auth.ts

//   __  ____ ____ _  _
// / _\/ ___) ___) )( \
//    \___ \___ ) \/ (
// \_/\_(____(____|____/
