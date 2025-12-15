import { sql } from 'drizzle-orm';
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Tabela de contas de jogadores
 */
export const playerAccounts = sqliteTable('player_accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  discordId: text('discord_id').unique(),
  haxballNick: text('haxball_nick').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  salt: text('salt').notNull(),
  points: integer('points').default(0).notNull(),
  ranking: integer('ranking').default(1000).notNull(),
  coins: integer('coins').default(0).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  lastLogin: integer('last_login', { mode: 'timestamp' }),
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
});

/**
 * Tabela de sessoes de login
 */
export const playerSessions = sqliteTable('player_sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountId: integer('account_id')
    .notNull()
    .references(() => playerAccounts.id),
  token: text('token').notNull().unique(),
  loginTime: integer('login_time', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  lastActivity: integer('last_activity', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  roomId: integer('room_id'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
});

/**
 * Tabela de tentativas de login (prevencao de brute force)
 */
export const loginAttempts = sqliteTable('login_attempts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  haxballNick: text('haxball_nick').notNull(),
  timestamp: integer('timestamp', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  success: integer('success', { mode: 'boolean' }).notNull(),
  ipAddress: text('ip_address'),
});

/**
 * Tabela de historico de pontos (para auditoria)
 */
export const pointsHistory = sqliteTable('points_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountId: integer('account_id')
    .notNull()
    .references(() => playerAccounts.id),
  pointsChange: integer('points_change').notNull(),
  reason: text('reason').notNull(),
  timestamp: integer('timestamp', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

/**
 * Tabela de historico de ranking (para auditoria)
 */
export const rankingHistory = sqliteTable('ranking_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountId: integer('account_id')
    .notNull()
    .references(() => playerAccounts.id),
  oldRanking: integer('old_ranking').notNull(),
  newRanking: integer('new_ranking').notNull(),
  reason: text('reason').notNull(),
  timestamp: integer('timestamp', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

/**
 * Estende a tabela users existente para vincular com player_accounts
 */
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  discordId: text('discord_id').notNull(),
  name: text('name').notNull(),
  accountId: integer('account_id').references(() => playerAccounts.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

export const roomSessions = sqliteTable('room_sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  roomName: text('room_name').notNull(),
  startedAt: integer('started_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  endedAt: integer('ended_at', { mode: 'timestamp' }),
});

export const matches = sqliteTable('matches', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  roomSessionId: integer('room_session_id').references(() => roomSessions.id),
  startedAt: integer('started_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  endedAt: integer('ended_at', { mode: 'timestamp' }),
  scoreRed: integer('score_red').default(0),
  scoreBlue: integer('score_blue').default(0),
});

export const playerRatings = sqliteTable('player_ratings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountId: integer('account_id')
    .notNull()
    .references(() => playerAccounts.id),
  overall: real('overall').default(1000),
  gk: real('gk').default(1000),
  def: real('def').default(1000),
  mid: real('mid').default(1000),
  ata: real('ata').default(1000),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

export const stats = sqliteTable('stats', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  matchId: integer('match_id').references(() => matches.id),
  accountId: integer('account_id').references(() => playerAccounts.id),
  goals: integer('goals').default(0),
  assists: integer('assists').default(0),
  saves: integer('saves').default(0),
  touches: integer('touches').default(0),
  distance: real('distance').default(0),
  team: text('team').default('spectator'),
  won: integer('won', { mode: 'boolean' }).default(false).notNull(),
});

export const matchEvents = sqliteTable('match_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  matchId: integer('match_id').references(() => matches.id),
  accountId: integer('account_id').references(() => playerAccounts.id),
  type: text('type').notNull(),
  payload: text('payload'),
  at: integer('at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

export const logs = sqliteTable('logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  level: text('level').default('info'),
  message: text('message').notNull(),
  meta: text('meta'),
  at: integer('at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

//   __  ____ ____ _  _
// / _\/ ___) ___) )( \
//    \___ \___ ) \/ (
// \_/\_(____(____|____/
