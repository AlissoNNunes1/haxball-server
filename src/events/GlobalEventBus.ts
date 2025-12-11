import { EventEmitter } from 'events';

/**
 * Sistema de eventos centralizado
 * Permite comunicacao desacoplada entre modulos
 */
export class GlobalEventBus extends EventEmitter {
  private static instance: GlobalEventBus;

  private constructor() {
    super();
    this.setMaxListeners(100);
  }

  /**
   * Obtem instancia singleton
   */
  static getInstance(): GlobalEventBus {
    if (!GlobalEventBus.instance) {
      GlobalEventBus.instance = new GlobalEventBus();
    }
    return GlobalEventBus.instance;
  }

  /**
   * Emite evento de sala aberta
   */
  emitRoomOpen(room: RoomEventData): void {
    this.emit('room:open', room);
  }

  /**
   * Emite evento de sala fechada
   */
  emitRoomClose(room: RoomEventData): void {
    this.emit('room:close', room);
  }

  /**
   * Emite evento de jogador entrou
   */
  emitPlayerJoin(player: PlayerEventData, room: RoomEventData): void {
    this.emit('player:join', player, room);
  }

  /**
   * Emite evento de jogador saiu
   */
  emitPlayerLeave(player: PlayerEventData, room: RoomEventData): void {
    this.emit('player:leave', player, room);
  }

  /**
   * Emite evento de gol marcado
   */
  emitTeamGoal(team: number, room: RoomEventData): void {
    this.emit('team:goal', team, room);
  }

  /**
   * Emite evento de comando Discord
   */
  emitCommand(command: string, args: string[], context: any): void {
    this.emit('command', command, args, context);
  }

  /**
   * Emite evento de sistema iniciando
   */
  emitSystemStart(): void {
    this.emit('system:start');
  }

  /**
   * Emite evento de sistema parando
   */
  emitSystemStop(): void {
    this.emit('system:stop');
  }

  /**
   * Emite metrica do sistema
   */
  emitMetric(metric: SystemMetric): void {
    this.emit('system:metric', metric);
  }

  /**
   * Emite erro do sistema
   */
  emitError(error: Error, context?: string): void {
    this.emit('system:error', error, context);
  }

  /**
   * Emite evento de autenticacao
   */
  emitAuth(event: AuthEvent): void {
    this.emit('auth:event', event);
  }

  /**
   * Emite evento de balanceamento
   */
  emitBalance(event: BalanceEvent): void {
    this.emit('balance:event', event);
  }

  /**
   * Emite evento de estatisticas
   */
  emitStats(event: StatsEvent): void {
    this.emit('stats:event', event);
  }
}

/**
 * Dados de evento de sala
 */
export interface RoomEventData {
  pid: number;
  botName: string;
  token: string;
  playerCount: number;
  maxPlayers: number;
  openedAt: Date;
}

/**
 * Dados de evento de jogador
 */
export interface PlayerEventData {
  id: number;
  name: string;
  auth: string;
  conn: string;
  team: number;
  admin: boolean;
}

/**
 * Metrica do sistema
 */
export interface SystemMetric {
  type: 'cpu' | 'memory' | 'rooms' | 'players' | 'custom';
  value: number;
  unit: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Evento de autenticacao
 */
export interface AuthEvent {
  type: 'register' | 'login' | 'logout' | 'session:created' | 'session:expired';
  accountId?: number;
  playerId?: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Evento de balanceamento
 */
export interface BalanceEvent {
  type: 'teams:balanced' | 'rating:updated' | 'match:result';
  accountIds?: number[];
  algorithm?: 'greedy' | 'genetic';
  ratingChanges?: Record<number, number>;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Evento de estatisticas
 */
export interface StatsEvent {
  type: 'match:completed' | 'stats:updated' | 'aggregate:calculated';
  matchId?: number;
  accountIds?: number[];
  timestamp: Date;
  metadata?: Record<string, any>;
}

//   __  ____ ____ _  _
// / _\/ ___) ___) )( \
//    \___ \___ ) \/ (
// \_/\_(____(____|____/
