/**
 * Sistema de Autenticacao e Contas CHA
 * Tipos e interfaces para gerenciamento de contas de jogadores
 */

/**
 * Dados de conta de jogador CHA
 */
export interface PlayerAccount {
  id: number;
  discordId: string | null;
  haxballNick: string;
  passwordHash: string;
  salt: string;
  points: number;
  ranking: number;
  coins: number;
  createdAt: Date;
  updatedAt: Date;
  lastLogin: Date | null;
  isActive: boolean;
}

/**
 * Dados para registro de nova conta
 */
export interface RegisterData {
  haxballNick: string;
  password: string;
  discordId?: string;
}

/**
 * Dados para login
 */
export interface LoginData {
  haxballNick: string;
  password: string;
}

/**
 * Resultado de autenticacao
 */
export interface AuthResult {
  success: boolean;
  message: string;
  account?: PlayerAccount;
  token?: string;
}

/**
 * Sessao de jogador autenticado
 */
export interface PlayerSession {
  accountId: number;
  haxballNick: string;
  token: string;
  loginTime: Date;
  lastActivity: Date;
  roomId?: number;
}

/**
 * Dados publicos do jogador (sem informacoes sensiveis)
 */
export interface PublicPlayerProfile {
  id: number;
  haxballNick: string;
  points: number;
  ranking: number;
  coins: number;
  createdAt: Date;
  lastLogin: Date | null;
}

/**
 * Configuracoes de autenticacao
 */
export interface AuthConfig {
  saltRounds: number;
  tokenExpirationHours: number;
  maxLoginAttempts: number;
  lockoutDurationMinutes: number;
  passwordMinLength: number;
  passwordMaxLength: number;
}

/**
 * Tentativa de login (para prevencao de brute force)
 */
export interface LoginAttempt {
  haxballNick: string;
  timestamp: Date;
  success: boolean;
  ipAddress?: string;
}

//   __  ____ ____ _  _
// / _\/ ___) ___) )( \
//    \___ \___ ) \/ (
// \_/\_(____(____|____/
