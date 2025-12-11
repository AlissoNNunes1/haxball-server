import { StatsCacheEntry, PlayerStatsAggregate, HeatmapData } from './types';

/**
 * Sistema de cache em memoria para estatisticas
 * Reduz carga no banco para consultas frequentes
 */
export class StatsCacheService {
  private aggregateCache: Map<number, StatsCacheEntry<PlayerStatsAggregate>>;
  private heatmapCache: Map<string, StatsCacheEntry<HeatmapData>>;
  private defaultTTL: number;

  constructor(defaultTTL: number = 300000) {
    // 5 minutos default
    this.aggregateCache = new Map();
    this.heatmapCache = new Map();
    this.defaultTTL = defaultTTL;

    // Limpa cache periodicamente
    this.startCleanupInterval();
  }

  /**
   * Busca agregado no cache
   */
  getAggregate(accountId: number): PlayerStatsAggregate | null {
    const entry = this.aggregateCache.get(accountId);

    if (!entry) return null;

    // Verifica expiracao
    if (Date.now() > entry.expiresAt) {
      this.aggregateCache.delete(accountId);
      return null;
    }

    return entry.value;
  }

  /**
   * Armazena agregado no cache
   */
  setAggregate(accountId: number, aggregate: PlayerStatsAggregate, ttl?: number): void {
    const expiresAt = Date.now() + (ttl || this.defaultTTL);

    this.aggregateCache.set(accountId, {
      value: aggregate,
      cachedAt: new Date(),
      expiresAt,
    });
  }

  /**
   * Remove agregado do cache
   */
  invalidateAggregate(accountId: number): void {
    this.aggregateCache.delete(accountId);
  }

  /**
   * Busca heatmap no cache
   */
  getHeatmap(matchId: number, accountId: number): HeatmapData | null {
    const key = this.makeHeatmapKey(matchId, accountId);
    const entry = this.heatmapCache.get(key);

    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.heatmapCache.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Armazena heatmap no cache
   */
  setHeatmap(
    matchId: number,
    accountId: number,
    heatmap: HeatmapData,
    ttl?: number
  ): void {
    const key = this.makeHeatmapKey(matchId, accountId);
    const expiresAt = Date.now() + (ttl || this.defaultTTL);

    this.heatmapCache.set(key, {
      value: heatmap,
      cachedAt: new Date(),
      expiresAt,
    });
  }

  /**
   * Remove heatmap do cache
   */
  invalidateHeatmap(matchId: number, accountId: number): void {
    const key = this.makeHeatmapKey(matchId, accountId);
    this.heatmapCache.delete(key);
  }

  /**
   * Gera chave de heatmap
   */
  private makeHeatmapKey(matchId: number, accountId: number): string {
    return `${matchId}:${accountId}`;
  }

  /**
   * Limpa cache expirado
   */
  private cleanup(): void {
    const now = Date.now();

    // Limpa agregados expirados
    for (const [accountId, entry] of this.aggregateCache) {
      if (now > entry.expiresAt) {
        this.aggregateCache.delete(accountId);
      }
    }

    // Limpa heatmaps expirados
    for (const [key, entry] of this.heatmapCache) {
      if (now > entry.expiresAt) {
        this.heatmapCache.delete(key);
      }
    }
  }

  /**
   * Inicia intervalo de limpeza automatica
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanup();
    }, 60000); // Limpa a cada minuto
  }

  /**
   * Limpa todo o cache
   */
  clear(): void {
    this.aggregateCache.clear();
    this.heatmapCache.clear();
  }

  /**
   * Retorna estatisticas do cache
   */
  getStats(): {
    aggregates: number;
    heatmaps: number;
    totalEntries: number;
  } {
    return {
      aggregates: this.aggregateCache.size,
      heatmaps: this.heatmapCache.size,
      totalEntries: this.aggregateCache.size + this.heatmapCache.size,
    };
  }

  /**
   * Invalida todos os caches de um jogador
   */
  invalidatePlayer(accountId: number): void {
    this.invalidateAggregate(accountId);

    // Invalida todos os heatmaps do jogador
    const keysToDelete: string[] = [];

    for (const key of this.heatmapCache.keys()) {
      if (key.endsWith(`:${accountId}`)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.heatmapCache.delete(key);
    }
  }

  /**
   * Invalida cache de partida (todos jogadores)
   */
  invalidateMatch(matchId: number): void {
    const keysToDelete: string[] = [];

    for (const key of this.heatmapCache.keys()) {
      if (key.startsWith(`${matchId}:`)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.heatmapCache.delete(key);
    }
  }
}

//   __  ____ ____ _  _
// / _\/ ___) ___) )( \
//    \___ \___ ) \/ (
// \_/\_(____(____|____/
