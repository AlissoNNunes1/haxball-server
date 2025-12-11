import {
  BasicMatchStats,
  AdvancedMatchStats,
  Position2D,
  MatchEvent,
  EventType,
  StatsCollectionConfig,
} from './types';

/**
 * Coletor de estatisticas em tempo real durante partidas
 * Rastreia eventos, posicoes e acoes dos jogadores
 */
export class StatsCollector {
  private config: StatsCollectionConfig;
  private basicStats: Map<number, BasicMatchStats>; // accountId -> stats
  private advancedStats: Map<number, AdvancedMatchStats>; // accountId -> stats
  private positions: Map<number, Position2D[]>; // accountId -> positions
  private events: MatchEvent[];
  private matchId: number;
  private collectionStartTime: Date;
  private positionSamplingInterval?: NodeJS.Timeout;

  constructor(matchId: number, config?: Partial<StatsCollectionConfig>) {
    this.matchId = matchId;
    this.config = {
      enableBasicStats: true,
      enableAdvancedStats: true,
      enablePositionTracking: false,
      enableHeatmap: false,
      positionSamplingRate: 10, // 10Hz
      heatmapGridSize: 20,
      autosaveInterval: 30000, // 30s
      ...config,
    };

    this.basicStats = new Map();
    this.advancedStats = new Map();
    this.positions = new Map();
    this.events = [];
    this.collectionStartTime = new Date();
  }

  /**
   * Inicializa jogador no sistema de stats
   */
  initializePlayer(
    accountId: number,
    team: 'red' | 'blue' | 'spectator'
  ): void {
    const basicStats: BasicMatchStats = {
      accountId,
      matchId: this.matchId,
      goals: 0,
      assists: 0,
      saves: 0,
      ownGoals: 0,
      touches: 0,
      timeInGame: 0,
      team,
      won: false,
    };

    this.basicStats.set(accountId, basicStats);

    if (this.config.enableAdvancedStats) {
      const advancedStats: AdvancedMatchStats = {
        ...basicStats,
        passes: 0,
        passesCompleted: 0,
        interceptions: 0,
        tackles: 0,
        possessionTime: 0,
        distanceCovered: 0,
        topSpeed: 0,
        averageSpeed: 0,
        shotsOnGoal: 0,
        shotsOffGoal: 0,
        timesDispossessed: 0,
      };

      this.advancedStats.set(accountId, advancedStats);
    }

    if (this.config.enablePositionTracking) {
      this.positions.set(accountId, []);
    }
  }

  /**
   * Registra gol
   */
  recordGoal(accountId: number, position?: Position2D): void {
    const stats = this.basicStats.get(accountId);
    if (stats) {
      stats.goals++;
      this.basicStats.set(accountId, stats);
    }

    this.recordEvent({
      matchId: this.matchId,
      accountId,
      eventType: EventType.GOAL,
      timestamp: new Date(),
      position,
    });
  }

  /**
   * Registra assistencia
   */
  recordAssist(accountId: number, position?: Position2D): void {
    const stats = this.basicStats.get(accountId);
    if (stats) {
      stats.assists++;
      this.basicStats.set(accountId, stats);
    }

    this.recordEvent({
      matchId: this.matchId,
      accountId,
      eventType: EventType.ASSIST,
      timestamp: new Date(),
      position,
    });
  }

  /**
   * Registra defesa
   */
  recordSave(accountId: number, position?: Position2D): void {
    const stats = this.basicStats.get(accountId);
    if (stats) {
      stats.saves++;
      this.basicStats.set(accountId, stats);
    }

    this.recordEvent({
      matchId: this.matchId,
      accountId,
      eventType: EventType.SAVE,
      timestamp: new Date(),
      position,
    });
  }

  /**
   * Registra gol contra
   */
  recordOwnGoal(accountId: number, position?: Position2D): void {
    const stats = this.basicStats.get(accountId);
    if (stats) {
      stats.ownGoals++;
      this.basicStats.set(accountId, stats);
    }

    this.recordEvent({
      matchId: this.matchId,
      accountId,
      eventType: EventType.OWN_GOAL,
      timestamp: new Date(),
      position,
    });
  }

  /**
   * Registra toque na bola
   */
  recordTouch(accountId: number): void {
    const stats = this.basicStats.get(accountId);
    if (stats) {
      stats.touches++;
      this.basicStats.set(accountId, stats);
    }
  }

  /**
   * Registra passe (stats avancadas)
   */
  recordPass(accountId: number, completed: boolean, position?: Position2D): void {
    if (!this.config.enableAdvancedStats) return;

    const stats = this.advancedStats.get(accountId);
    if (stats) {
      stats.passes++;
      if (completed) stats.passesCompleted++;
      this.advancedStats.set(accountId, stats);
    }

    this.recordEvent({
      matchId: this.matchId,
      accountId,
      eventType: EventType.PASS,
      timestamp: new Date(),
      position,
      metadata: { completed },
    });
  }

  /**
   * Registra interceptacao
   */
  recordInterception(accountId: number, position?: Position2D): void {
    if (!this.config.enableAdvancedStats) return;

    const stats = this.advancedStats.get(accountId);
    if (stats) {
      stats.interceptions++;
      this.advancedStats.set(accountId, stats);
    }

    this.recordEvent({
      matchId: this.matchId,
      accountId,
      eventType: EventType.INTERCEPTION,
      timestamp: new Date(),
      position,
    });
  }

  /**
   * Registra chute
   */
  recordShot(accountId: number, onGoal: boolean, position?: Position2D): void {
    if (!this.config.enableAdvancedStats) return;

    const stats = this.advancedStats.get(accountId);
    if (stats) {
      if (onGoal) {
        stats.shotsOnGoal++;
      } else {
        stats.shotsOffGoal++;
      }
      this.advancedStats.set(accountId, stats);
    }

    this.recordEvent({
      matchId: this.matchId,
      accountId,
      eventType: onGoal ? EventType.SHOT_ON_GOAL : EventType.SHOT_OFF_GOAL,
      timestamp: new Date(),
      position,
    });
  }

  /**
   * Registra posicao do jogador
   */
  recordPosition(accountId: number, x: number, y: number): void {
    if (!this.config.enablePositionTracking) return;

    const playerPositions = this.positions.get(accountId);
    if (playerPositions) {
      playerPositions.push({
        x,
        y,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Atualiza tempo em jogo
   */
  updateTimeInGame(accountId: number, seconds: number): void {
    const stats = this.basicStats.get(accountId);
    if (stats) {
      stats.timeInGame = seconds;
      this.basicStats.set(accountId, stats);
    }
  }

  /**
   * Atualiza distancia percorrida
   */
  updateDistanceCovered(accountId: number, distance: number): void {
    if (!this.config.enableAdvancedStats) return;

    const stats = this.advancedStats.get(accountId);
    if (stats) {
      stats.distanceCovered = distance;
      this.advancedStats.set(accountId, stats);
    }
  }

  /**
   * Atualiza velocidade
   */
  updateSpeed(accountId: number, currentSpeed: number): void {
    if (!this.config.enableAdvancedStats) return;

    const stats = this.advancedStats.get(accountId);
    if (stats) {
      if (currentSpeed > stats.topSpeed) {
        stats.topSpeed = currentSpeed;
      }
      
      // Calcula media movel de velocidade
      const samples = stats.touches || 1;
      stats.averageSpeed = (stats.averageSpeed * samples + currentSpeed) / (samples + 1);
      
      this.advancedStats.set(accountId, stats);
    }
  }

  /**
   * Marca resultado da partida
   */
  setMatchResult(winningTeam: 'red' | 'blue' | 'draw'): void {
    for (const [accountId, stats] of this.basicStats) {
      if (winningTeam === 'draw') {
        stats.won = false;
      } else {
        stats.won = stats.team === winningTeam;
      }
      this.basicStats.set(accountId, stats);
    }

    // Atualiza advanced stats tambem
    for (const [accountId, stats] of this.advancedStats) {
      const basicStats = this.basicStats.get(accountId);
      if (basicStats) {
        stats.won = basicStats.won;
        this.advancedStats.set(accountId, stats);
      }
    }
  }

  /**
   * Registra evento generico
   */
  private recordEvent(event: MatchEvent): void {
    this.events.push(event);
  }

  /**
   * Retorna stats basicas
   */
  getBasicStats(): BasicMatchStats[] {
    return Array.from(this.basicStats.values());
  }

  /**
   * Retorna stats avancadas
   */
  getAdvancedStats(): AdvancedMatchStats[] {
    return Array.from(this.advancedStats.values());
  }

  /**
   * Retorna eventos da partida
   */
  getEvents(): MatchEvent[] {
    return [...this.events];
  }

  /**
   * Retorna posicoes rastreadas
   */
  getPositions(accountId: number): Position2D[] {
    return this.positions.get(accountId) || [];
  }

  /**
   * Retorna todas as posicoes
   */
  getAllPositions(): Map<number, Position2D[]> {
    return new Map(this.positions);
  }

  /**
   * Inicia amostragem automatica de posicoes
   * Deve ser chamada com funcao que retorna posicoes atuais
   */
  startPositionSampling(
    getPositions: () => Map<number, { x: number; y: number }>
  ): void {
    if (!this.config.enablePositionTracking) return;

    const intervalMs = 1000 / this.config.positionSamplingRate;

    this.positionSamplingInterval = setInterval(() => {
      const currentPositions = getPositions();
      for (const [accountId, pos] of currentPositions) {
        this.recordPosition(accountId, pos.x, pos.y);
      }
    }, intervalMs);
  }

  /**
   * Para amostragem de posicoes
   */
  stopPositionSampling(): void {
    if (this.positionSamplingInterval) {
      clearInterval(this.positionSamplingInterval);
      this.positionSamplingInterval = undefined;
    }
  }

  /**
   * Finaliza coleta e retorna resumo
   */
  finalize(): {
    basicStats: BasicMatchStats[];
    advancedStats: AdvancedMatchStats[];
    events: MatchEvent[];
    positions: Map<number, Position2D[]>;
    collectionDuration: number; // ms
  } {
    this.stopPositionSampling();

    const duration = Date.now() - this.collectionStartTime.getTime();

    return {
      basicStats: this.getBasicStats(),
      advancedStats: this.getAdvancedStats(),
      events: this.getEvents(),
      positions: this.getAllPositions(),
      collectionDuration: duration,
    };
  }

  /**
   * Limpa dados da coleta
   */
  clear(): void {
    this.basicStats.clear();
    this.advancedStats.clear();
    this.positions.clear();
    this.events = [];
    this.stopPositionSampling();
  }
}

//   __  ____ ____ _  _
// / _\/ ___) ___) )( \
//    \___ \___ ) \/ (
// \_/\_(____(____|____/
