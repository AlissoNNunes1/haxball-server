import express, { Request, Response } from 'express';
import { BalanceAlgorithm } from './BalanceAlgorithm';
import { BalanceService } from './BalanceService';
import { Position } from './types';

/**
 * REST API para sistema de balanceamento
 * Expoe endpoints para consulta de ratings e balanceamento via HTTP
 */
export class BalanceAPI {
  private app: express.Application;
  private balanceService: BalanceService;
  private balanceAlgorithm: BalanceAlgorithm;

  constructor(
    app: express.Application,
    balanceService: BalanceService,
    balanceAlgorithm: BalanceAlgorithm
  ) {
    this.app = app;
    this.balanceService = balanceService;
    this.balanceAlgorithm = balanceAlgorithm;

    this.registerRoutes();
  }

  /**
   * Registra rotas da API
   */
  private registerRoutes(): void {
    // Health check
    this.app.get('/api/balance/health', this.handleHealth.bind(this));

    // Consulta de rating
    this.app.get('/api/balance/rating/:accountId', this.handleGetRating.bind(this));

    // Top jogadores por posicao
    this.app.get('/api/balance/top/:position', this.handleTopPlayers.bind(this));

    // Estatisticas globais
    this.app.get('/api/balance/stats', this.handleGlobalStats.bind(this));

    // Balanceamento de times
    this.app.post('/api/balance/teams', this.handleBalanceTeams.bind(this));

    // Performance recente
    this.app.get('/api/balance/performance/:accountId', this.handleRecentPerformance.bind(this));

    // Aplica decay (admin only)
    this.app.post('/api/balance/decay', this.handleApplyDecay.bind(this));
  }

  /**
   * GET /api/balance/health
   * Health check da API
   */
  private handleHealth(req: Request, res: Response): void {
    res.json({
      status: 'ok',
      service: 'balance-api',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * GET /api/balance/rating/:accountId
   * Retorna rating completo do jogador
   */
  private async handleGetRating(req: Request, res: Response): Promise<void> {
    try {
      const accountId = parseInt(req.params.accountId);

      if (isNaN(accountId)) {
        res.status(400).json({ error: 'Account ID invalido' });
        return;
      }

      const rating = await this.balanceService.getPlayerRating(accountId);

      res.json({
        accountId,
        rating,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erro ao buscar rating',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  /**
   * GET /api/balance/top/:position?limit=10
   * Retorna top jogadores por posicao
   */
  private async handleTopPlayers(req: Request, res: Response): Promise<void> {
    try {
      const position = req.params.position.toUpperCase() as Position;
      const limit = parseInt(req.query.limit as string) || 10;

      if (!Object.values(Position).includes(position)) {
        res.status(400).json({ error: 'Posicao invalida. Use: GK, DEF, MID, ATA' });
        return;
      }

      if (limit < 1 || limit > 100) {
        res.status(400).json({ error: 'Limite deve estar entre 1 e 100' });
        return;
      }

      const topPlayers = await this.balanceService.getTopPlayersByPosition(position, limit);

      res.json({
        position,
        limit,
        players: topPlayers,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erro ao buscar top jogadores',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  /**
   * GET /api/balance/stats
   * Retorna estatisticas globais do sistema
   */
  private async handleGlobalStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.balanceService.getGlobalRatingStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({
        error: 'Erro ao buscar estatisticas',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  /**
   * POST /api/balance/teams
   * Body: { accountIds: number[], strategy?: 'greedy' | 'genetic' }
   * Balanceia jogadores em dois times
   */
  private async handleBalanceTeams(req: Request, res: Response): Promise<void> {
    try {
      const { accountIds, strategy = 'greedy' } = req.body;

      if (!Array.isArray(accountIds) || accountIds.length < 2) {
        res.status(400).json({ error: 'Array de accountIds com minimo 2 jogadores requerido' });
        return;
      }

      if (strategy !== 'greedy' && strategy !== 'genetic') {
        res.status(400).json({ error: 'Estrategia deve ser greedy ou genetic' });
        return;
      }

      // Busca jogadores
      const players = await this.balanceService.getPlayersForBalance(accountIds);

      if (players.length < 2) {
        res.status(400).json({ error: 'Minimo 2 jogadores validos necessarios' });
        return;
      }

      // Configura estrategia
      this.balanceAlgorithm['config'].strategy = strategy;

      // Balanceia
      const result = this.balanceAlgorithm.balanceTeams(players);

      res.json({
        team1: {
          players: result.team1.players.map((p) => ({
            id: p.id,
            nick: p.nick,
            position: p.assignedPosition,
            rating: this.getRatingForPosition(p),
          })),
          averageRating: result.team1.averageRating,
        },
        team2: {
          players: result.team2.players.map((p) => ({
            id: p.id,
            nick: p.nick,
            position: p.assignedPosition,
            rating: this.getRatingForPosition(p),
          })),
          averageRating: result.team2.averageRating,
        },
        ratingDifference: result.ratingDifference,
        fairnessScore: result.fairnessScore,
        strategy: result.strategy,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erro ao balancear times',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  /**
   * Helper: retorna rating da posicao atribuida
   */
  private getRatingForPosition(player: any): number {
    if (!player.assignedPosition) return player.rating.overall;

    const pos = player.assignedPosition.toLowerCase();
    return player.rating[pos] || player.rating.overall;
  }

  /**
   * GET /api/balance/performance/:accountId?limit=10
   * Retorna performances recentes do jogador
   */
  private async handleRecentPerformance(req: Request, res: Response): Promise<void> {
    try {
      const accountId = parseInt(req.params.accountId);
      const limit = parseInt(req.query.limit as string) || 10;

      if (isNaN(accountId)) {
        res.status(400).json({ error: 'Account ID invalido' });
        return;
      }

      if (limit < 1 || limit > 50) {
        res.status(400).json({ error: 'Limite deve estar entre 1 e 50' });
        return;
      }

      const performances = await this.balanceService.getRecentPerformances(accountId, limit);

      res.json({
        accountId,
        performances,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erro ao buscar performances',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }

  /**
   * POST /api/balance/decay
   * Body: { days?: number, adminToken: string }
   * Aplica decay em jogadores inativos (requer autenticacao admin)
   */
  private async handleApplyDecay(req: Request, res: Response): Promise<void> {
    try {
      const { days = 30, adminToken } = req.body;

      // TODO: Validar adminToken

      if (days < 7 || days > 365) {
        res.status(400).json({ error: 'Dias deve estar entre 7 e 365' });
        return;
      }

      const decayedCount = await this.balanceService.applyDecayToInactivePlayers(days);

      res.json({
        success: true,
        decayedPlayers: decayedCount,
        days,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erro ao aplicar decay',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  }
}

//   __  ____ ____ _  _
// / _\/ ___) ___) )( \
//    \___ \___ ) \/ (
// \_/\_(____(____|____/
