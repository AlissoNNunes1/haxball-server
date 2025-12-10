import { sql } from 'drizzle-orm';
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Schema inicial Drizzle para SQLite
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  discordId: text('discord_id').notNull(),
  name: text('name').notNull(),
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
  userId: integer('user_id').references(() => users.id),
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
  userId: integer('user_id').references(() => users.id),
  goals: integer('goals').default(0),
  assists: integer('assists').default(0),
  saves: integer('saves').default(0),
  touches: integer('touches').default(0),
  distance: real('distance').default(0),
});

export const matchEvents = sqliteTable('match_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  matchId: integer('match_id').references(() => matches.id),
  userId: integer('user_id').references(() => users.id),
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

//    __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
