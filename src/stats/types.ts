/**
 * Tipos e interfaces para sistema de estatisticas
 * Suporta stats simples e avancadas com estrutura expansivel
 */

/**
 * Posicao 2D no campo
 */
export interface Position2D {
  x: number;
  y: number;
  timestamp: Date;
}

/**
 * Estatisticas basicas de jogador em uma partida
 */
export interface BasicMatchStats {
  accountId: number;
  matchId: number;
  goals: number;
  assists: number;
  saves: number;
  ownGoals: number;
  touches: number;
  timeInGame: number; // segundos
  team: 'red' | 'blue' | 'spectator';
  won: boolean;
}

/**
 * Estatisticas avancadas de jogador em uma partida
 */
export interface AdvancedMatchStats extends BasicMatchStats {
  passes: number;
  passesCompleted: number;
  interceptions: number;
  tackles: number;
  possessionTime: number; // segundos com bola
  distanceCovered: number; // unidades do Haxball
  topSpeed: number;
  averageSpeed: number;
  shotsOnGoal: number;
  shotsOffGoal: number;
  timesDispossessed: number;
}

/**
 * Dados de heatmap (densidade de posicao)
 */
export interface HeatmapData {
  accountId: number;
  matchId: number;
  gridSize: number; // tamanho da grid (ex: 20x20)
  densityMap: number[][]; // matriz de densidade
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * Rastreamento de posicao ao longo do tempo
 */
export interface PositionTracking {
  accountId: number;
  matchId: number;
  positions: Position2D[];
  samplingRate: number; // Hz (ex: 10 = 10 samples/segundo)
}

/**
 * Evento de partida (gol, assistencia, etc)
 */
export interface MatchEvent {
  id?: number;
  matchId: number;
  accountId: number | null;
  eventType: EventType;
  timestamp: Date;
  position?: Position2D;
  metadata?: Record<string, any>;
}

/**
 * Tipos de eventos rastreados
 */
export enum EventType {
  GOAL = 'goal',
  ASSIST = 'assist',
  SAVE = 'save',
  OWN_GOAL = 'own_goal',
  SHOT_ON_GOAL = 'shot_on_goal',
  SHOT_OFF_GOAL = 'shot_off_goal',
  PASS = 'pass',
  INTERCEPTION = 'interception',
  TACKLE = 'tackle',
  PLAYER_JOIN = 'player_join',
  PLAYER_LEAVE = 'player_leave',
  TEAM_CHANGE = 'team_change',
  KICK_OFF = 'kick_off',
  MATCH_START = 'match_start',
  MATCH_END = 'match_end',
}

/**
 * Agregacao de estatisticas de jogador (todas as partidas)
 */
export interface PlayerStatsAggregate {
  accountId: number;
  totalMatches: number;
  totalWins: number;
  totalLosses: number;
  totalDraws: number;
  winRate: number;
  
  // Stats basicas
  totalGoals: number;
  totalAssists: number;
  totalSaves: number;
  totalOwnGoals: number;
  
  // Medias
  avgGoalsPerMatch: number;
  avgAssistsPerMatch: number;
  avgSavesPerMatch: number;
  
  // Stats avancadas (opcionais)
  totalPasses?: number;
  passAccuracy?: number;
  totalInterceptions?: number;
  totalDistanceCovered?: number;
  avgSpeed?: number;
  
  // Periodo
  firstMatchDate: Date;
  lastMatchDate: Date;
  updatedAt: Date;
}

/**
 * Comparacao entre dois jogadores
 */
export interface PlayerComparison {
  player1: PlayerStatsAggregate;
  player2: PlayerStatsAggregate;
  differences: {
    winRate: number;
    avgGoals: number;
    avgAssists: number;
    avgSaves: number;
    passAccuracy?: number;
  };
}

/**
 * Configuracao de coleta de stats
 */
export interface StatsCollectionConfig {
  enableBasicStats: boolean;
  enableAdvancedStats: boolean;
  enablePositionTracking: boolean;
  enableHeatmap: boolean;
  positionSamplingRate: number; // Hz
  heatmapGridSize: number;
  autosaveInterval: number; // ms
}

/**
 * Resultado de consulta de stats
 */
export interface StatsQueryResult {
  stats: BasicMatchStats[] | AdvancedMatchStats[];
  aggregate?: PlayerStatsAggregate;
  heatmap?: HeatmapData;
  totalRecords: number;
  page: number;
  pageSize: number;
}

/**
 * Filtros para consulta de stats
 */
export interface StatsFilter {
  accountIds?: number[];
  matchIds?: number[];
  startDate?: Date;
  endDate?: Date;
  team?: 'red' | 'blue';
  won?: boolean;
  minGoals?: number;
  minAssists?: number;
  limit?: number;
  offset?: number;
}

/**
 * Dados de cache de stats
 */
export interface StatsCacheEntry<T> {
  data: T;
  timestamp: Date;
  ttl: number; // segundos
}

/**
 * Metricas de performance do sistema de stats
 */
export interface StatsSystemMetrics {
  totalStatsRecords: number;
  totalAdvancedStatsRecords: number;
  totalHeatmaps: number;
  cacheHitRate: number;
  avgQueryTime: number; // ms
  storageSize: number; // bytes
  lastCollectionTime: Date;
}

//   __  ____ ____ _  _
// / _\/ ___) ___) )( \
//    \___ \___ ) \/ (
// \_/\_(____(____|____/
