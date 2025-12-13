import { HeatmapData, PlayerStatsAggregate, StatsCacheEntry } from './types';

/**
 * Sistema de cache em memoria para estatisticas
 * Reduz carga no banco para consultas frequentes
 */
export class StatsCacheService {
  private aggregateCache: Map<number, StatsCacheEntry<PlayerStatsAggregate>>;
  private heatmapCache: Map<string, StatsCacheEntry<HeatmapData>>;
  private defaultTTLMs: number;

  constructor(defaultTTLMs: number = 300000) {
    this.aggregateCache = new Map();
    this.heatmapCache = new Map();
    this.defaultTTLMs = defaultTTLMs;
    this.startCleanupInterval();
  }

  getAggregate(accountId: number): PlayerStatsAggregate | null {
    const entry = this.aggregateCache.get(accountId);
    if (!entry) return null;
    const expiresAt = entry.timestamp.getTime() + entry.ttl * 1000;
    if (Date.now() > expiresAt) {
      this.aggregateCache.delete(accountId);
      return null;
    }
    return entry.data;
  }

  setAggregate(accountId: number, aggregate: PlayerStatsAggregate, ttlMs?: number): void {
    const ttlSeconds = Math.floor((ttlMs || this.defaultTTLMs) / 1000);
    const entry: StatsCacheEntry<PlayerStatsAggregate> = {
      data: aggregate,
      timestamp: new Date(),
      ttl: ttlSeconds,
    };
    this.aggregateCache.set(accountId, entry);
  }

  invalidateAggregate(accountId: number): void {
    this.aggregateCache.delete(accountId);
  }

  getHeatmap(matchId: number, accountId: number): HeatmapData | null {
    const key = this.makeHeatmapKey(matchId, accountId);
    const entry = this.heatmapCache.get(key);
    if (!entry) return null;
    const expiresAt = entry.timestamp.getTime() + entry.ttl * 1000;
    if (Date.now() > expiresAt) {
      this.heatmapCache.delete(key);
      return null;
    }
    return entry.data;
  }

  setHeatmap(matchId: number, accountId: number, heatmap: HeatmapData, ttlMs?: number): void {
    const key = this.makeHeatmapKey(matchId, accountId);
    const ttlSeconds = Math.floor((ttlMs || this.defaultTTLMs) / 1000);
    const entry: StatsCacheEntry<HeatmapData> = {
      data: heatmap,
      timestamp: new Date(),
      ttl: ttlSeconds,
    };
    this.heatmapCache.set(key, entry);
  }

  invalidateHeatmap(matchId: number, accountId: number): void {
    const key = this.makeHeatmapKey(matchId, accountId);
    this.heatmapCache.delete(key);
  }

  private makeHeatmapKey(matchId: number, accountId: number): string {
    return `${matchId}:${accountId}`;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [accountId, entry] of this.aggregateCache) {
      if (now > entry.timestamp.getTime() + entry.ttl * 1000) {
        this.aggregateCache.delete(accountId);
      }
    }
    for (const [key, entry] of this.heatmapCache) {
      if (now > entry.timestamp.getTime() + entry.ttl * 1000) {
        this.heatmapCache.delete(key);
      }
    }
  }

  private startCleanupInterval(): void {
    setInterval(() => this.cleanup(), 60000);
  }

  clear(): void {
    this.aggregateCache.clear();
    this.heatmapCache.clear();
  }

  getStats(): { aggregates: number; heatmaps: number; totalEntries: number } {
    return {
      aggregates: this.aggregateCache.size,
      heatmaps: this.heatmapCache.size,
      totalEntries: this.aggregateCache.size + this.heatmapCache.size,
    };
  }

  invalidatePlayer(accountId: number): void {
    this.invalidateAggregate(accountId);
    const keysToDelete: string[] = [];
    for (const key of this.heatmapCache.keys()) {
      if (key.endsWith(`:${accountId}`)) keysToDelete.push(key);
    }
    for (const key of keysToDelete) this.heatmapCache.delete(key);
  }

  invalidateMatch(matchId: number): void {
    const keysToDelete: string[] = [];
    for (const key of this.heatmapCache.keys()) {
      if (key.startsWith(`${matchId}:`)) keysToDelete.push(key);
    }
    for (const key of keysToDelete) this.heatmapCache.delete(key);
  }
}

