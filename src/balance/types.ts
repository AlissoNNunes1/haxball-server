/**
 * Sistema de Balanceamento Hibrido - Tipos e Interfaces
 * Elo por posicao + Performance recente + Decay temporal
 */

/**
 * Posicoes do jogador
 */
export enum Position {
  GK = 'GK', // Goleiro
  DEF = 'DEF', // Defesa
  MID = 'MID', // Meio-campo
  ATA = 'ATA', // Ataque
}

/**
 * Rating Elo de jogador
 */
export interface EloRating {
  overall: number; // Elo geral
  gk: number; // Elo como goleiro
  def: number; // Elo como defesa
  mid: number; // Elo como meio
  ata: number; // Elo como ataque
  lastUpdated: Date;
}

/**
 * Resultado de partida para calculo de Elo
 */
export interface MatchResult {
  matchId?: number;
  accountId?: number;
  position: Position;
  won: boolean; // Time venceu?
  teamRating: number; // Rating medio do time
  opponentRating: number; // Rating medio do oponente
  personalPerformance: number; // Score de performance individual (0-1)
}

/**
 * Dados de performance de jogador em partida
 */
export interface PerformanceData {
  accountId: number;
  matchId?: number;
  position?: Position;
  goals: number;
  assists: number;
  saves?: number;
  ownGoals?: number;
  touches?: number;
  distance?: number;
  timePlayedMs?: number;
  teamScore?: number;
  opponentScore?: number;
  cleanSheet?: boolean;
  possession?: number; // percent
  won?: boolean;
  matchDate?: Date;
  performanceScore?: number; // Score ja calculado (0-1), opcional
}

/**
 * Performance recente agregada
 */
export interface RecentPerformance {
  accountId?: number;
  position?: Position;
  averageScore: number; // Score medio normalizado (0-1)
  trend: 'improving' | 'declining' | 'stable';
  consistency: number; // 0-1
  gamesAnalyzed: number;
  lastMatchDate: Date | null;
}

/**
 * Jogador para balanceamento
 */
export interface PlayerForBalance {
  id: number; // ID unico do jogador no contexto do balance
  nick: string;
  preferredPosition?: Position;
  rating: EloRating; // Rating para balanceamento
  recentPerformance?: RecentPerformance;
  decayApplied?: boolean;
  assignedPosition?: Position;
}

/**
 * Time balanceado
 */
export interface BalancedTeam {
  players: PlayerForBalance[];
  averageRating: number;
  totalRating?: number;
  positionCoverage?: Partial<Record<Position, number>>;
}

/**
 * Resultado do balanceamento
 */
export interface BalanceResult {
  team1: BalancedTeam;
  team2: BalancedTeam;
  ratingDifference: number;
  fairnessScore: number; // 0-100
  strategy: string; // Metodo usado (greedy, genetic, manual)
}

/**
 * Configuracao do sistema de Elo
 */
export interface EloConfig {
  baseKFactor: number; // K-factor padrao (ex: 32)
  maxKFactor: number; // K maximo para novatos (ex: 64)
  minKFactor: number; // K minimo para veteranos (ex: 16)
  provisionalGames: number; // Jogos ate considerar rating estavel (ex: 20)
  performanceWeight: number; // Peso da performance individual (0-1)
  decayDays: number; // Dias ate comecar decay (ex: 30)
  decayRate: number; // Taxa de decay por dia apos periodo (ex: 0.995)
  minRating: number; // Rating minimo (ex: 100)
  maxRating: number; // Rating maximo (ex: 3000)
  initialRating: number; // Rating inicial (ex: 1000)
}

/**
 * Configuracao do balanceamento
 */
export interface BalanceConfig {
  strategy?: 'greedy' | 'genetic' | 'manual';
  maxRatingDifference?: number;
  preferPositionSpecialists?: boolean;
  considerRecentForm?: boolean;
  formWeight?: number;
  positionPreferenceWeight?: number;
  iterations?: number;
  considerGameState?: boolean; // Considerar placar e nivel atual dos times
  gameStateWeight?: number; // Peso do estado do jogo no balanceamento (0-1)
}

/**
 * Estado atual do jogo para balanceamento dinamico
 */
export interface GameState {
  redScore: number;
  blueScore: number;
  redTeamAverageRating?: number;
  blueTeamAverageRating?: number;
  timeElapsedMs?: number;
  totalTimeMs?: number;
}

/**
 * Historico de mudanca de Elo
 */
export interface EloChange {
  accountId: number;
  matchId: number;
  position: Position;
  oldRating: number;
  newRating: number;
  change: number;
  timestamp: Date;
  reason?: string;
}

//   __  ____ ____ _  _
// / _\/ ___) ___) )( \
//    \___ \___ ) \/ (
// \_/\_(____(____|____/
