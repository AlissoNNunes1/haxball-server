import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

let dbClient: any = null;

export function initDb(path = './haxball.sqlite') {
  if (dbClient) return dbClient;
  const sqlite = new Database(path);
  const drizzleClient = drizzle(sqlite, { schema: schema as unknown as any });

  // wrapper que expoe o cliente drizzle e funcoes auxiliares
  const wrapper: any = {
    db: drizzleClient,
    sqlite,
  };

  wrapper.ensureUserByName = async function (name: string, discordId?: string) {
    const stmt = sqlite.prepare('SELECT id FROM users WHERE name = ? LIMIT 1');
    const existing = stmt.get(name) as any;
    if (existing && existing.id) return existing.id as number;
    const insert = sqlite.prepare('INSERT INTO users (discord_id, name) VALUES (?, ?)');
    const info = insert.run(discordId ?? 'unknown', name);
    return info.lastInsertRowid as number;
  };

  wrapper.createRoomSession = async function (roomName: string) {
    const insert = sqlite.prepare('INSERT INTO room_sessions (room_name) VALUES (?)');
    const info = insert.run(roomName);
    return info.lastInsertRowid as number;
  };

  wrapper.createMatch = async function (roomSessionId: number) {
    const insert = sqlite.prepare('INSERT INTO matches (room_session_id) VALUES (?)');
    const info = insert.run(roomSessionId);
    return info.lastInsertRowid as number;
  };

  wrapper.insertMatchEvent = async function (
    matchId: number,
    userId: number | null,
    type: string,
    payload: any,
    at = Date.now()
  ) {
    const insert = sqlite.prepare(
      'INSERT INTO match_events (match_id, user_id, type, payload, at) VALUES (?, ?, ?, ?, ?)'
    );
    insert.run(matchId, userId, type, JSON.stringify(payload), at);
  };

  wrapper.incrementStatCount = async function (
    matchId: number,
    userId: number,
    field: StatField,
    value = 1
  ) {
    const select = sqlite.prepare(
      'SELECT id, goals, assists, saves, touches, distance FROM stats WHERE match_id = ? AND user_id = ? LIMIT 1'
    );
    const existing = select.get(matchId, userId) as any;
    if (!existing) {
      const insert = sqlite.prepare(
        `INSERT INTO stats (match_id, user_id, ${field}) VALUES (?, ?, ?)`
      );
      insert.run(matchId, userId, value);
    } else {
      const update = sqlite.prepare(`UPDATE stats SET ${field} = ? WHERE id = ?`);
      update.run((existing as any)[field] + value, existing.id);
    }
  };

  wrapper.logEvent = async function (level = 'info', message = '', meta?: any) {
    const insert = sqlite.prepare('INSERT INTO logs (level, message, meta) VALUES (?, ?, ?)');
    insert.run(level, message, meta ? JSON.stringify(meta) : null);
  };

  dbClient = wrapper;
  // Garantir que o schema exista (migracoes basicas)
  try {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        discord_id TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s','now'))
      );

      CREATE TABLE IF NOT EXISTS room_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_name TEXT NOT NULL,
        started_at INTEGER DEFAULT (strftime('%s','now')),
        ended_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_session_id INTEGER,
        started_at INTEGER DEFAULT (strftime('%s','now')),
        ended_at INTEGER,
        score_red INTEGER DEFAULT 0,
        score_blue INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS player_ratings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        overall REAL DEFAULT 1000,
        gk REAL DEFAULT 1000,
        def REAL DEFAULT 1000,
        mid REAL DEFAULT 1000,
        ata REAL DEFAULT 1000,
        updated_at INTEGER DEFAULT (strftime('%s','now'))
      );

      CREATE TABLE IF NOT EXISTS stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        match_id INTEGER,
        user_id INTEGER,
        goals INTEGER DEFAULT 0,
        assists INTEGER DEFAULT 0,
        saves INTEGER DEFAULT 0,
        touches INTEGER DEFAULT 0,
        distance REAL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS match_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        match_id INTEGER,
        user_id INTEGER,
        type TEXT NOT NULL,
        payload TEXT,
        at INTEGER DEFAULT (strftime('%s','now'))
      );

      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        level TEXT DEFAULT 'info',
        message TEXT NOT NULL,
        meta TEXT,
        at INTEGER DEFAULT (strftime('%s','now'))
      );
    `);
  } catch (e) {
    // ignore schema creation errors
  }
  return dbClient;
}

export function getDb() {
  if (!dbClient) throw new Error('DB not initialized. Call initDb() first');
  return dbClient;
}

export async function ensureUserByName(name: string, discordId?: string) {
  const db = getDb();
  return db.ensureUserByName(name, discordId);
}

export async function createRoomSession(roomName: string) {
  const db = getDb();
  return db.createRoomSession(roomName);
}

export async function createMatch(roomSessionId: number) {
  const db = getDb();
  return db.createMatch(roomSessionId);
}

export async function insertMatchEvent(
  matchId: number,
  userId: number | null,
  type: string,
  payload: any,
  at = Date.now()
) {
  const db = getDb();
  return db.insertMatchEvent(matchId, userId, type, payload, at);
}

type StatField = 'goals' | 'assists' | 'saves' | 'touches' | 'distance';
export async function incrementStatCount(
  matchId: number,
  userId: number,
  field: StatField,
  value = 1
) {
  const db = getDb();
  return db.incrementStatCount(matchId, userId, field, value);
}

export async function logEvent(level = 'info', message = '', meta?: any) {
  const db = getDb();
  return db.logEvent(level, message, meta);
}

//    __  ____ ____ _  _
//  / _\\/ ___) ___) )( \
// /    \\___ \\___ ) \/ (
// \_/\\_(____(____|____/
