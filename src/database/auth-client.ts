import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { PlayerAccount } from '../auth/types';
import * as schema from './schema-auth';

let authDbClient: any = null;

/**
 * Inicializa o banco de dados de autenticacao
 */
export function initAuthDb(path = './haxball.sqlite') {
  if (authDbClient) return authDbClient;

  const sqlite = new Database(path);
  const drizzleClient = drizzle(sqlite, { schema: schema as unknown as any });

  const wrapper: any = {
    db: drizzleClient,
    sqlite,
  };

  /**
   * Cria tabelas de autenticacao
   */
  wrapper.createAuthTables = function () {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS player_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        discord_id TEXT UNIQUE,
        haxball_nick TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        points INTEGER DEFAULT 0 NOT NULL,
        ranking INTEGER DEFAULT 1000 NOT NULL,
        coins INTEGER DEFAULT 0 NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s','now')),
        updated_at INTEGER DEFAULT (strftime('%s','now')),
        last_login INTEGER,
        is_active INTEGER DEFAULT 1 NOT NULL
      );

      CREATE TABLE IF NOT EXISTS player_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER NOT NULL,
        token TEXT NOT NULL UNIQUE,
        login_time INTEGER DEFAULT (strftime('%s','now')),
        last_activity INTEGER DEFAULT (strftime('%s','now')),
        room_id INTEGER,
        is_active INTEGER DEFAULT 1 NOT NULL,
        FOREIGN KEY (account_id) REFERENCES player_accounts(id)
      );

      CREATE TABLE IF NOT EXISTS login_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        haxball_nick TEXT NOT NULL,
        timestamp INTEGER DEFAULT (strftime('%s','now')),
        success INTEGER NOT NULL,
        ip_address TEXT
      );

      CREATE TABLE IF NOT EXISTS points_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER NOT NULL,
        points_change INTEGER NOT NULL,
        reason TEXT NOT NULL,
        timestamp INTEGER DEFAULT (strftime('%s','now')),
        FOREIGN KEY (account_id) REFERENCES player_accounts(id)
      );

      CREATE TABLE IF NOT EXISTS ranking_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER NOT NULL,
        old_ranking INTEGER NOT NULL,
        new_ranking INTEGER NOT NULL,
        reason TEXT NOT NULL,
        timestamp INTEGER DEFAULT (strftime('%s','now')),
        FOREIGN KEY (account_id) REFERENCES player_accounts(id)
      );

      CREATE INDEX IF NOT EXISTS idx_player_accounts_discord ON player_accounts(discord_id);
      CREATE INDEX IF NOT EXISTS idx_player_accounts_nick ON player_accounts(haxball_nick);
      CREATE INDEX IF NOT EXISTS idx_player_sessions_token ON player_sessions(token);
      CREATE INDEX IF NOT EXISTS idx_login_attempts_nick ON login_attempts(haxball_nick);
    `);
  };

  /**
   * Cria tabelas relacionadas a estatisticas se nao existirem
   */
  wrapper.createStatsTables = function () {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_session_id INTEGER,
        started_at INTEGER DEFAULT (strftime('%s','now')),
        ended_at INTEGER,
        score_red INTEGER DEFAULT 0,
        score_blue INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        match_id INTEGER,
        account_id INTEGER,
        goals INTEGER DEFAULT 0,
        assists INTEGER DEFAULT 0,
        saves INTEGER DEFAULT 0,
        touches INTEGER DEFAULT 0,
        distance REAL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS match_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        match_id INTEGER,
        account_id INTEGER,
        type TEXT NOT NULL,
        payload TEXT,
        at INTEGER DEFAULT (strftime('%s','now'))
      );

      CREATE TABLE IF NOT EXISTS advanced_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        match_id INTEGER NOT NULL,
        account_id INTEGER NOT NULL,
        goals INTEGER DEFAULT 0,
        assists INTEGER DEFAULT 0,
        saves INTEGER DEFAULT 0,
        own_goals INTEGER DEFAULT 0,
        touches INTEGER DEFAULT 0,
        passes INTEGER DEFAULT 0,
        passes_completed INTEGER DEFAULT 0,
        interceptions INTEGER DEFAULT 0,
        tackles INTEGER DEFAULT 0,
        possession_time REAL DEFAULT 0,
        distance_covered REAL DEFAULT 0,
        top_speed REAL DEFAULT 0,
        average_speed REAL DEFAULT 0,
        shots_on_goal INTEGER DEFAULT 0,
        shots_off_goal INTEGER DEFAULT 0,
        times_dispossessed INTEGER DEFAULT 0,
        time_in_game INTEGER DEFAULT 0,
        team TEXT NOT NULL,
        won INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS player_positions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        match_id INTEGER NOT NULL,
        account_id INTEGER NOT NULL,
        x REAL NOT NULL,
        y REAL NOT NULL,
        timestamp INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS heatmap_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        match_id INTEGER NOT NULL,
        account_id INTEGER NOT NULL,
        grid_size INTEGER NOT NULL,
        density_map TEXT NOT NULL,
        min_x REAL NOT NULL,
        max_x REAL NOT NULL,
        min_y REAL NOT NULL,
        max_y REAL NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s','now'))
      );

      CREATE TABLE IF NOT EXISTS player_stats_aggregate (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER NOT NULL UNIQUE,
        total_matches INTEGER DEFAULT 0,
        total_wins INTEGER DEFAULT 0,
        total_losses INTEGER DEFAULT 0,
        total_draws INTEGER DEFAULT 0,
        win_rate REAL DEFAULT 0,
        total_goals INTEGER DEFAULT 0,
        total_assists INTEGER DEFAULT 0,
        total_saves INTEGER DEFAULT 0,
        total_own_goals INTEGER DEFAULT 0,
        avg_goals_per_match REAL DEFAULT 0,
        avg_assists_per_match REAL DEFAULT 0,
        avg_saves_per_match REAL DEFAULT 0,
        total_passes INTEGER DEFAULT 0,
        pass_accuracy REAL DEFAULT 0,
        total_interceptions INTEGER DEFAULT 0,
        total_distance_covered REAL DEFAULT 0,
        avg_speed REAL DEFAULT 0,
        first_match_date INTEGER,
        last_match_date INTEGER,
        updated_at INTEGER DEFAULT (strftime('%s','now'))
      );
    `);
  };

  /**
   * Migra esquemas antigos para colunas/nomes novos
   */
  wrapper.migrateStatsTables = function () {
    try {
      // Verifica colunas da tabela stats (compatibilidade user_id/account_id)
      const stmtInfo = sqlite.prepare("PRAGMA table_info('stats')");
      const cols = stmtInfo.all().map((c: any) => c.name);

      if (!cols.includes('account_id') && cols.includes('user_id')) {
        // Adiciona coluna account_id e copia de user_id
        sqlite.exec('ALTER TABLE stats ADD COLUMN account_id INTEGER');
        sqlite.exec('UPDATE stats SET account_id = user_id');
      }

      // Verifica se tabela stats possui colunas team/won e adiciona se ausentes
      if (!cols.includes('team')) {
        sqlite.exec("ALTER TABLE stats ADD COLUMN team TEXT DEFAULT 'spectator'");
      }
      if (!cols.includes('won')) {
        sqlite.exec('ALTER TABLE stats ADD COLUMN won INTEGER DEFAULT 0');
      }

      // Verifica colunas da tabela match_events (compatibilidade user_id -> account_id)
      const evtInfo = sqlite.prepare("PRAGMA table_info('match_events')");
      const evtCols = evtInfo.all().map((c: any) => c.name);

      if (!evtCols.includes('account_id') && evtCols.includes('user_id')) {
        // Adiciona coluna account_id e copia de user_id
        sqlite.exec('ALTER TABLE match_events ADD COLUMN account_id INTEGER');
        sqlite.exec('UPDATE match_events SET account_id = user_id');
      }

      // Verifica advanced_stats: adiciona created_at se ausente
      const advInfo = sqlite.prepare("PRAGMA table_info('advanced_stats')");
      const advCols = advInfo.all().map((c: any) => c.name);
      if (!advCols.includes('created_at')) {
        sqlite.exec(
          "ALTER TABLE advanced_stats ADD COLUMN created_at INTEGER DEFAULT (strftime('%s','now'))"
        );
      }

      // Verifica player_stats_aggregate: adiciona updated_at se ausente
      const aggInfo = sqlite.prepare("PRAGMA table_info('player_stats_aggregate')");
      const aggCols = aggInfo.all().map((c: any) => c.name);
      if (!aggCols.includes('updated_at')) {
        sqlite.exec(
          "ALTER TABLE player_stats_aggregate ADD COLUMN updated_at INTEGER DEFAULT (strftime('%s','now'))"
        );
      }
    } catch (err) {
      console.error('[DB] Erro ao migrar tabelas de stats:', err);
    }
  };

  /**
   * Cria nova conta
   */
  wrapper.createAccount = function (data: {
    haxballNick: string;
    passwordHash: string;
    salt: string;
    discordId: string | null;
  }): number {
    const insert = sqlite.prepare(`
      INSERT INTO player_accounts (haxball_nick, password_hash, salt, discord_id)
      VALUES (?, ?, ?, ?)
    `);
    const info = insert.run(data.haxballNick, data.passwordHash, data.salt, data.discordId);
    return info.lastInsertRowid as number;
  };

  /**
   * Busca conta por ID
   */
  wrapper.getAccountById = function (id: number): PlayerAccount | null {
    const stmt = sqlite.prepare('SELECT * FROM player_accounts WHERE id = ? LIMIT 1');
    const row = stmt.get(id) as any;
    if (!row) return null;
    return wrapper.mapRowToAccount(row);
  };

  /**
   * Busca conta por nick Haxball
   */
  wrapper.getAccountByNick = function (haxballNick: string): PlayerAccount | null {
    const stmt = sqlite.prepare('SELECT * FROM player_accounts WHERE haxball_nick = ? LIMIT 1');
    const row = stmt.get(haxballNick) as any;
    if (!row) return null;
    return wrapper.mapRowToAccount(row);
  };

  /**
   * Busca conta por Discord ID
   */
  wrapper.getAccountByDiscordId = function (discordId: string): PlayerAccount | null {
    const stmt = sqlite.prepare('SELECT * FROM player_accounts WHERE discord_id = ? LIMIT 1');
    const row = stmt.get(discordId) as any;
    if (!row) return null;
    return wrapper.mapRowToAccount(row);
  };

  /**
   * Mapeia row do banco para PlayerAccount
   */
  wrapper.mapRowToAccount = function (row: any): PlayerAccount {
    return {
      id: row.id,
      discordId: row.discord_id,
      haxballNick: row.haxball_nick,
      passwordHash: row.password_hash,
      salt: row.salt,
      points: row.points,
      ranking: row.ranking,
      coins: row.coins,
      createdAt: new Date(row.created_at * 1000),
      updatedAt: new Date(row.updated_at * 1000),
      lastLogin: row.last_login ? new Date(row.last_login * 1000) : null,
      isActive: Boolean(row.is_active),
    };
  };

  /**
   * Cria sessao de login
   */
  wrapper.createSession = function (data: { accountId: number; token: string }): number {
    const insert = sqlite.prepare(`
      INSERT INTO player_sessions (account_id, token)
      VALUES (?, ?)
    `);
    const info = insert.run(data.accountId, data.token);
    return info.lastInsertRowid as number;
  };

  /**
   * Busca sessao por token
   */
  wrapper.getSessionByToken = function (token: string): any | null {
    const stmt = sqlite.prepare(`
      SELECT s.*, a.haxball_nick
      FROM player_sessions s
      JOIN player_accounts a ON s.account_id = a.id
      WHERE s.token = ? AND s.is_active = 1
      LIMIT 1
    `);
    return stmt.get(token) as any;
  };

  /**
   * Desativa sessao
   */
  wrapper.deactivateSession = function (token: string): void {
    const update = sqlite.prepare('UPDATE player_sessions SET is_active = 0 WHERE token = ?');
    update.run(token);
  };

  /**
   * Atualiza last_login
   */
  wrapper.updateLastLogin = function (accountId: number): void {
    const update = sqlite.prepare(
      "UPDATE player_accounts SET last_login = strftime('%s','now') WHERE id = ?"
    );
    update.run(accountId);
  };

  /**
   * Registra tentativa de login
   */
  wrapper.recordLoginAttempt = function (
    haxballNick: string,
    success: boolean,
    ipAddress?: string
  ): void {
    const insert = sqlite.prepare(`
      INSERT INTO login_attempts (haxball_nick, success, ip_address)
      VALUES (?, ?, ?)
    `);
    insert.run(haxballNick, success ? 1 : 0, ipAddress || null);
  };

  /**
   * Busca tentativas de login recentes
   */
  wrapper.getRecentLoginAttempts = function (haxballNick: string, minutesAgo: number): number {
    const stmt = sqlite.prepare(`
      SELECT COUNT(*) as count
      FROM login_attempts
      WHERE haxball_nick = ?
        AND success = 0
        AND timestamp > strftime('%s','now') - (? * 60)
    `);
    const result = stmt.get(haxballNick, minutesAgo) as any;
    return result.count || 0;
  };

  /**
   * Vincula Discord ID a conta
   */
  wrapper.linkDiscordId = function (accountId: number, discordId: string): void {
    const update = sqlite.prepare('UPDATE player_accounts SET discord_id = ? WHERE id = ?');
    update.run(discordId, accountId);
  };

  /**
   * Atualiza pontos
   */
  wrapper.updatePoints = function (accountId: number, points: number, reason: string): void {
    const account = wrapper.getAccountById(accountId);
    if (!account) return;

    const pointsChange = points - account.points;

    const updateAccount = sqlite.prepare('UPDATE player_accounts SET points = ? WHERE id = ?');
    updateAccount.run(points, accountId);

    const insertHistory = sqlite.prepare(`
      INSERT INTO points_history (account_id, points_change, reason)
      VALUES (?, ?, ?)
    `);
    insertHistory.run(accountId, pointsChange, reason);
  };

  /**
   * Atualiza ranking
   */
  wrapper.updateRanking = function (accountId: number, ranking: number, reason: string): void {
    const account = wrapper.getAccountById(accountId);
    if (!account) return;

    const updateAccount = sqlite.prepare('UPDATE player_accounts SET ranking = ? WHERE id = ?');
    updateAccount.run(ranking, accountId);

    const insertHistory = sqlite.prepare(`
      INSERT INTO ranking_history (account_id, old_ranking, new_ranking, reason)
      VALUES (?, ?, ?, ?)
    `);
    insertHistory.run(accountId, account.ranking, ranking, reason);
  };

  /**
   * Limpa sessoes expiradas
   */
  wrapper.cleanupExpiredSessions = function (expiredTime: Date): number {
    const update = sqlite.prepare(`
      UPDATE player_sessions
      SET is_active = 0
      WHERE login_time < ?
    `);
    const info = update.run(Math.floor(expiredTime.getTime() / 1000));
    return info.changes;
  };

  /**
   * Lista top jogadores por ranking
   */
  wrapper.getTopPlayersByRanking = function (limit = 10): PlayerAccount[] {
    const stmt = sqlite.prepare(`
      SELECT * FROM player_accounts
      WHERE is_active = 1
      ORDER BY ranking DESC
      LIMIT ?
    `);
    const rows = stmt.all(limit) as any[];
    return rows.map(wrapper.mapRowToAccount);
  };

  /**
   * Lista top jogadores por pontos
   */
  wrapper.getTopPlayersByPoints = function (limit = 10): PlayerAccount[] {
    const stmt = sqlite.prepare(`
      SELECT * FROM player_accounts
      WHERE is_active = 1
      ORDER BY points DESC
      LIMIT ?
    `);
    const rows = stmt.all(limit) as any[];
    return rows.map(wrapper.mapRowToAccount);
  };

  // Inicializa tabelas
  wrapper.createAuthTables();
  // Cria e migra tabelas de stats
  wrapper.createStatsTables();
  wrapper.migrateStatsTables();
  authDbClient = wrapper;
  return authDbClient;
}

/**
 * Retorna cliente de banco de dados de autenticacao
 */
export function getAuthDb() {
  if (!authDbClient) throw new Error('Auth DB not initialized. Call initAuthDb() first');
  return authDbClient;
}

//   __  ____ ____ _  _
// / _\/ ___) ___) )( \
//    \___ \___ ) \/ (
// \_/\_(____(____|____/
