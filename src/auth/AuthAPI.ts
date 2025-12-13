import express, { Request, Response } from 'express';
import { AuthService } from '../auth/AuthService';
import { initAuthDb } from '../database/auth-client';

/**
 * API REST para sistema de autenticacao e contas CIRS
 */
export class AuthAPI {
  private app: express.Application;
  private authService: AuthService;
  private db: any;
  private port: number;

  constructor(port = 3001) {
    this.port = port;
    this.app = express();
    this.db = initAuthDb();
    this.authService = new AuthService();

    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Configura middleware
   */
  private setupMiddleware() {
    this.app.use(express.json());

    // CORS
    this.app.use((_req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      next();
    });

    // Logger
    this.app.use((_req, _res, next) => {
      console.log(`[API] ${_req.method} ${_req.path}`);
      next();
    });
  }

  /**
   * Configura rotas
   */
  private setupRoutes() {
    // Health check
    this.app.get('/health', (_req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Rotas publicas
    this.app.get('/api/profile/:nick', this.getProfile.bind(this));
    this.app.get('/api/ranking/top', this.getTopRanking.bind(this));
    this.app.get('/api/stats/:nick', this.getStats.bind(this));

    // Rotas privadas (requerem token)
    this.app.post('/api/auth/login', this.login.bind(this));
    this.app.post('/api/auth/validate', this.validateToken.bind(this));
    this.app.post('/api/auth/logout', this.logout.bind(this));

    // 404
    this.app.use((_req, res) => {
      res.status(404).json({ error: 'Endpoint not found' });
    });

    // Error handler
    this.app.use((err: any, _req: Request, res: Response, _next: any) => {
      console.error('[API] Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
  }

  /**
   * GET /api/profile/:nick
   * Busca perfil publico
   */
  private async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const { nick } = req.params;

      if (!nick) {
        res.status(400).json({ error: 'Nick is required' });
        return;
      }

      const profile = await this.authService.getPublicProfile(nick, this.db);

      if (!profile) {
        res.status(404).json({ error: 'Profile not found' });
        return;
      }

      res.json({ success: true, profile });
    } catch (error) {
      console.error('Error getting profile:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /api/ranking/top?by=ranking&limit=10
   * Busca top jogadores
   */
  private async getTopRanking(req: Request, res: Response): Promise<void> {
    try {
      const by = req.query.by === 'pontos' ? 'pontos' : 'ranking';
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);

      const topPlayers =
        by === 'pontos'
          ? this.db.getTopPlayersByPoints(limit)
          : this.db.getTopPlayersByRanking(limit);

      const players = topPlayers.map((player: any) => ({
        haxballNick: player.haxballNick,
        points: player.points,
        ranking: player.ranking,
        coins: player.coins,
      }));

      res.json({ success: true, players });
    } catch (error) {
      console.error('Error getting top ranking:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /api/stats/:nick
   * Busca estatisticas do jogador
   */
  private async getStats(req: Request, res: Response): Promise<void> {
    try {
      const { nick } = req.params;

      if (!nick) {
        res.status(400).json({ error: 'Nick is required' });
        return;
      }

      const account = this.db.getAccountByNick(nick);

      if (!account) {
        res.status(404).json({ error: 'Account not found' });
        return;
      }

      // Busca ratings
      const ratings = this.db.sqlite
        .prepare('SELECT * FROM player_ratings WHERE account_id = ? LIMIT 1')
        .get(account.id) as any;

      // Busca stats gerais
      const stats = this.db.sqlite
        .prepare(
          'SELECT SUM(goals) as goals, SUM(assists) as assists, SUM(saves) as saves, SUM(touches) as touches, SUM(distance) as distance FROM stats WHERE account_id = ?'
        )
        .get(account.id) as any;

      // Conta partidas
      const matchesPlayed = this.db.sqlite
        .prepare('SELECT COUNT(DISTINCT match_id) as count FROM stats WHERE account_id = ?')
        .get(account.id) as any;

      res.json({
        success: true,
        stats: {
          haxballNick: account.haxballNick,
          ratings: ratings
            ? {
                overall: ratings.overall,
                gk: ratings.gk,
                def: ratings.def,
                mid: ratings.mid,
                ata: ratings.ata,
              }
            : null,
          general: {
            goals: stats?.goals || 0,
            assists: stats?.assists || 0,
            saves: stats?.saves || 0,
            touches: stats?.touches || 0,
            distance: stats?.distance || 0,
            matchesPlayed: matchesPlayed?.count || 0,
          },
        },
      });
    } catch (error) {
      console.error('Error getting stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * POST /api/auth/login
   * Autentica jogador e retorna token
   */
  private async login(req: Request, res: Response): Promise<void> {
    try {
      const { haxballNick, password } = req.body;

      if (!haxballNick || !password) {
        res.status(400).json({ error: 'Nick and password are required' });
        return;
      }

      const result = await this.authService.login({ haxballNick, password }, this.db);

      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          token: result.token,
          account: {
            id: result.account?.id,
            haxballNick: result.account?.haxballNick,
            points: result.account?.points,
            ranking: result.account?.ranking,
            coins: result.account?.coins,
          },
        });
      } else {
        res.status(401).json({ success: false, message: result.message });
      }
    } catch (error) {
      console.error('Error logging in:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * POST /api/auth/validate
   * Valida token de sessao
   */
  private async validateToken(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;

      if (!token) {
        res.status(400).json({ error: 'Token is required' });
        return;
      }

      const session = await this.authService.validateToken(token, this.db);

      if (session) {
        res.json({
          success: true,
          session: {
            accountId: session.accountId,
            haxballNick: session.haxballNick,
            loginTime: session.loginTime,
          },
        });
      } else {
        res.status(401).json({ success: false, message: 'Invalid or expired token' });
      }
    } catch (error) {
      console.error('Error validating token:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * POST /api/auth/logout
   * Invalida token de sessao
   */
  private async logout(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;

      if (!token) {
        res.status(400).json({ error: 'Token is required' });
        return;
      }

      await this.authService.logout(token, this.db);

      res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      console.error('Error logging out:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Inicia servidor
   */
  start() {
    this.app.listen(this.port, () => {
      console.log(`[API] Auth API listening on port ${this.port}`);
    });
  }
}

//   __  ____ ____ _  _
// / _\/ ___) ___) )( \
//    \___ \___ ) \/ (
// \_/\_(____(____|____/
