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
  accountId: number;
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
  matchId: number;
  position: Position;
  goals: number;
  assists: number;
  saves: number;
  ownGoals: number;
  touches: number;
  distance: number;
  timePlayedMs: number;
  teamScore: number;
  opponentScore: number;
}

/**
 * Performance recente agregada
 */
export interface RecentPerformance {
  accountId: number;
  position: Position;
  avgRating: number; // Rating medio
  winRate: number; // Taxa de vitoria (0-1)
  matchesPlayed: number;
  lastMatchDate: Date;
  form: number; // Forma atual (0-1, baseado em ultimos N jogos)
}

/**
 * Jogador para balanceamento
 */
export interface PlayerForBalance {
  accountId: number;
  haxballNick: string;
  playerId: number; // ID na sala Haxball
  preferredPosition?: Position;
  currentRating: EloRating;
  recentPerformance?: RecentPerformance;
  decayApplied: boolean; // Se decay foi aplicado
}

/**
 * Time balanceado
 */
export interface BalancedTeam {
  players: PlayerForBalance[];
  avgRating: number;
  totalRating: number;
  positionCoverage: Partial<Record<Position, number>>; // Quantos por posicao
}

/**
 * Resultado do balanceamento
 */
export interface BalanceResult {
  redTeam: BalancedTeam;
  blueTeam: BalancedTeam;
  ratingDifference: number;
  fairnessScore: number; // 0-1, quanto mais proximo de 1, mais justo
  method: string; // Metodo usado (greedy, genetic, etc)
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
  maxRatingDifference: number; // Diferenca maxima aceitavel entre times (ex: 50)
  preferredPositions: boolean; // Considerar posicoes preferidas
  recentFormWeight: number; // Peso da forma recente (0-1)
  iterations: number; // Iteracoes do algoritmo genetico (ex: 1000)
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
}

//   __  ____ ____ _  _
// / _\/ ___) ___) )( \
//    \___ \___ ) \/ (
// \_/\_(____(____|____/
