import { Request, Response, Router } from 'express';
import { AuthService } from '../auth/AuthService';
import { StatsCalculator } from './StatsCalculator';
import { StatsService } from './StatsService';
import { StatsFilter } from './types';

/**
 * API REST para estatisticas
 * Endpoints para consultas e analises
 */
export class StatsAPI {
  private router: Router;
  private statsService: StatsService;
  private calculator: StatsCalculator;
  private _authService: AuthService;

  constructor(statsService: StatsService, calculator: StatsCalculator, authService: AuthService) {
    this.router = Router();
    this.statsService = statsService;
    this.calculator = calculator;
    this._authService = authService;

    this.setupRoutes();
  }

  /**
   * Retorna router Express configurado
   */
  getRouter(): Router {
    return this.router;
  }

  /**
   * Configura rotas da API
   */
  private setupRoutes(): void {
    // GET /stats/player/:accountId - Stats agregadas de jogador
    this.router.get('/player/:accountId', this.getPlayerStats.bind(this));

    // GET /stats/player/:accountId/matches - Historico de partidas
    this.router.get('/player/:accountId/matches', this.getPlayerMatches.bind(this));

    // GET /stats/player/:accountId/heatmap/:matchId - Heatmap de partida
    this.router.get('/player/:accountId/heatmap/:matchId', this.getPlayerHeatmap.bind(this));

    // GET /stats/match/:matchId - Stats de partida
    this.router.get('/match/:matchId', this.getMatchStats.bind(this));

    // GET /stats/top/:metric - Top jogadores
    this.router.get('/top/:metric', this.getTopPlayers.bind(this));

    // POST /stats/compare - Comparar jogadores
    this.router.post('/compare', this.comparePlayers.bind(this));

    // GET /stats/search - Busca com filtros
    this.router.get('/search', this.searchStats.bind(this));

    // GET /stats/player/:accountId/trend - Tendencia de performance
    this.router.get('/player/:accountId/trend', this.getPerformanceTrend.bind(this));
  }

  /**
   * GET /stats/player/:accountId
   * Retorna agregado de jogador
   */
  private async getPlayerStats(req: Request, res: Response): Promise<void> {
    try {
      const accountId = parseInt(req.params.accountId, 10);

      if (isNaN(accountId)) {
        res.status(400).json({ error: 'accountId invalido' });
        return;
      }

      const aggregate = await this.statsService.getPlayerAggregate(accountId);

      if (!aggregate) {
        res.status(404).json({ error: 'Jogador nao encontrado' });
        return;
      }

      res.json(aggregate);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar stats' });
    }
  }

  /**
   * GET /stats/player/:accountId/matches?limit=10&offset=0
   * Retorna historico de partidas
   */
  private async getPlayerMatches(req: Request, res: Response): Promise<void> {
    try {
      const accountId = parseInt(req.params.accountId, 10);
      const limit = parseInt((req.query.limit as string) || '10', 10);
      const offset = parseInt((req.query.offset as string) || '0', 10);

      if (isNaN(accountId)) {
        res.status(400).json({ error: 'accountId invalido' });
        return;
      }

      const matches = await this.statsService.getAdvancedStats({
        accountIds: [accountId],
        limit,
        offset,
      });

      res.json({ matches, total: matches.length });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar partidas' });
    }
  }

  /**
   * GET /stats/player/:accountId/heatmap/:matchId
   * Retorna heatmap de partida
   */
  private async getPlayerHeatmap(req: Request, res: Response): Promise<void> {
    try {
      const accountId = parseInt(req.params.accountId, 10);
      const matchId = parseInt(req.params.matchId, 10);

      if (isNaN(accountId) || isNaN(matchId)) {
        res.status(400).json({ error: 'Parametros invalidos' });
        return;
      }

      const heatmap = await this.statsService.getHeatmap(matchId, accountId);

      if (!heatmap) {
        res.status(404).json({ error: 'Heatmap nao encontrado' });
        return;
      }

      res.json(heatmap);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar heatmap' });
    }
  }

  /**
   * GET /stats/match/:matchId
   * Retorna stats de todos jogadores em partida
   */
  private async getMatchStats(req: Request, res: Response): Promise<void> {
    try {
      const matchId = parseInt(req.params.matchId, 10);

      if (isNaN(matchId)) {
        res.status(400).json({ error: 'matchId invalido' });
        return;
      }

      const stats = await this.statsService.getAdvancedStats({
        matchIds: [matchId],
      });

      res.json({ matchId, players: stats });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar stats da partida' });
    }
  }

  /**
   * GET /stats/top/:metric?limit=10
   * Retorna top jogadores por metrica
   */
  private async getTopPlayers(req: Request, res: Response): Promise<void> {
    try {
      const metric = req.params.metric as keyof import('./types').PlayerStatsAggregate;
      const limit = parseInt((req.query.limit as string) || '10', 10);

      const validMetrics: string[] = [
        'totalGoals',
        'totalAssists',
        'totalSaves',
        'winRate',
        'totalMatches',
        'passAccuracy',
        'avgSpeed',
      ];

      if (!validMetrics.includes(metric)) {
        res.status(400).json({ error: 'Metrica invalida', validMetrics });
        return;
      }

      const topPlayers = await this.statsService.getTopPlayers(metric, limit);

      res.json({ metric, limit, players: topPlayers });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar top jogadores' });
    }
  }

  /**
   * POST /stats/compare
   * Compara dois jogadores
   * Body: { accountId1: number, accountId2: number }
   */
  private async comparePlayers(req: Request, res: Response): Promise<void> {
    try {
      const { accountId1, accountId2 } = req.body;

      if (!accountId1 || !accountId2) {
        res.status(400).json({ error: 'accountId1 e accountId2 sao obrigatorios' });
        return;
      }

      const agg1 = await this.statsService.getPlayerAggregate(accountId1);
      const agg2 = await this.statsService.getPlayerAggregate(accountId2);

      if (!agg1 || !agg2) {
        res.status(404).json({ error: 'Jogador(es) nao encontrado(s)' });
        return;
      }

      const comparison = this.calculator.comparePlayer(agg1, agg2);

      res.json({
        player1: agg1,
        player2: agg2,
        difference: comparison,
      });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao comparar jogadores' });
    }
  }

  /**
   * GET /stats/search?accountIds=1,2&matchIds=10,20&minGoals=5&team=red&won=true&limit=50&offset=0
   * Busca com filtros avancados
   */
  private async searchStats(req: Request, res: Response): Promise<void> {
    try {
      const filter: StatsFilter = {};

      if (req.query.accountIds) {
        filter.accountIds = (req.query.accountIds as string)
          .split(',')
          .map((id) => parseInt(id, 10));
      }

      if (req.query.matchIds) {
        filter.matchIds = (req.query.matchIds as string).split(',').map((id) => parseInt(id, 10));
      }

      if (req.query.minGoals) {
        filter.minGoals = parseInt(req.query.minGoals as string, 10);
      }

      if (req.query.minAssists) {
        filter.minAssists = parseInt(req.query.minAssists as string, 10);
      }

      if (req.query.team) {
        const team = String(req.query.team);
        if (team === 'red' || team === 'blue') {
          filter.team = team as 'red' | 'blue';
        }
      }

      if (req.query.won !== undefined) {
        filter.won = req.query.won === 'true';
      }

      filter.limit = parseInt((req.query.limit as string) || '50', 10);
      filter.offset = parseInt((req.query.offset as string) || '0', 10);

      const results = await this.statsService.getAdvancedStats(filter);

      res.json({ filter, results, count: results.length });
    } catch (error) {
      res.status(500).json({ error: 'Erro na busca' });
    }
  }

  /**
   * GET /stats/player/:accountId/trend?lastMatches=20
   * Calcula tendencia de performance
   */
  private async getPerformanceTrend(req: Request, res: Response): Promise<void> {
    try {
      const accountId = parseInt(req.params.accountId, 10);
      const lastMatches = parseInt((req.query.lastMatches as string) || '20', 10);

      if (isNaN(accountId)) {
        res.status(400).json({ error: 'accountId invalido' });
        return;
      }

      // Busca stats recentes
      const recentStats = await this.statsService.getAdvancedStats({
        accountIds: [accountId],
        limit: lastMatches,
      });

      if (recentStats.length < 3) {
        res.status(400).json({ error: 'Dados insuficientes (minimo 3 partidas)' });
        return;
      }

      // Calcula ratings
      const ratings = recentStats.map((stat) => this.calculator.calculatePerformanceRating(stat));

      // Calcula tendencia
      const trend = this.calculator.calculatePerformanceTrend(ratings);

      // Calcula media recente vs media geral
      const aggregate = await this.statsService.getPlayerAggregate(accountId);
      const recentAvg = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;

      res.json({
        accountId,
        lastMatches: recentStats.length,
        trend,
        recentAverage: parseFloat(recentAvg.toFixed(2)),
        ratings,
        aggregate: aggregate ? aggregate : null,
      });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao calcular tendencia' });
    }
  }
}

//   __  ____ ____ _  _
// / _\/ ___) ___) )( \
//    \___ \___ ) \/ (
// \_/\_(____(____|____/
