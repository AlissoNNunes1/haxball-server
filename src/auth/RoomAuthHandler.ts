import { getAuthDb } from '../database/auth-client';
import { StatsCalculator } from '../stats/StatsCalculator';
import { StatsService } from '../stats/StatsService';
import { AuthService } from './AuthService';

/**
 * Gerencia autenticacao e comandos dentro das salas Haxball
 */
export class RoomAuthHandler {
  private authService: AuthService;
  private db: any;
  private authenticatedPlayers = new Map<number, number>(); // playerId -> accountId
  private statsService?: StatsService;

  constructor() {
    this.db = getAuthDb();
    this.authService = new AuthService();
    try {
      const calculator = new StatsCalculator();
      const sqliteDb = this.db && this.db.sqlite ? this.db.sqlite : this.db;
      this.statsService = new StatsService(sqliteDb, calculator);
    } catch (err) {
      console.error('[AUTH] Nao foi possivel inicializar StatsService no RoomAuthHandler:', err);
      this.statsService = undefined;
    }
  }

  /**
   * Registra handlers de autenticacao na sala
   */
  registerHandlers(room: any) {
    // Handler de entrada: verifica se nick esta cadastrado
    const originalOnPlayerJoin = room.onPlayerJoin;
    room.onPlayerJoin = (player: any) => {
      // Chama handler original se existir
      if (originalOnPlayerJoin) {
        originalOnPlayerJoin(player);
      }

      // Verifica se nick esta cadastrado
      const account = this.db.getAccountByNick(player.name);

      if (account) {
        // Nick cadastrado - solicita login
        room.sendAnnouncement(
          `Bem-vindo de volta, ${player.name}!`,
          player.id,
          0x00ff00,
          'bold',
          2
        );
        room.sendAnnouncement(
          'Sua conta foi encontrada! Use "!login <senha> para autenticar.',
          player.id,
          0xffaa00,
          'normal',
          1
        );
        room.sendAnnouncement(
          `Ranking atual: ${account.ranking} | Pontos: ${account.points}`,
          player.id,
          0xaaaaaa,
          'small',
          1
        );
      } else {
        // Nick nao cadastrado - sugestao de registro
        room.sendAnnouncement(`Ola, ${player.name}!`, player.id, 0xffaa00, 'bold', 2);
        room.sendAnnouncement(
          'Voce ainda nao tem uma conta CHA. Registre-se no Discord com !register',
          player.id,
          0xaaaaaa,
          'normal',
          1
        );
      }
    };

    room.onPlayerChat = (player: any, message: string) => {
      // Processa comandos de autenticacao
      if (message.startsWith('/login ')) {
        this.handleLogin(room, player, message);
        return false; // Nao mostra mensagem no chat
      }

      if (message.startsWith('/logout')) {
        this.handleLogout(room, player);
        return false;
      }

      if (message.startsWith('/profile')) {
        this.handleProfile(room, player, message);
        return false;
      }

      if (message.startsWith('/stats')) {
        this.handleStats(room, player);
        return false;
      }

      // Comando nao processado, permite que outros handlers o tratem
      return true;
    };

    room.onPlayerLeave = (player: any) => {
      // Remove autenticacao ao sair
      this.authenticatedPlayers.delete(player.id);
    };
  }

  /**
   * Comando: /login <senha>
   */
  private async handleLogin(room: any, player: any, message: string) {
    const args = message.split(' ');
    if (args.length < 2) {
      room.sendAnnouncement('[AUTH] Uso: /login <senha>', player.id, 0xff9900, 'bold', 2);
      return;
    }

    const password = args.slice(1).join(' ');
    const haxballNick = player.name;

    // Verifica se nick esta cadastrado primeiro
    const account = this.db.getAccountByNick(haxballNick);
    if (!account) {
      room.sendAnnouncement(
        '❌ Nick nao cadastrado! Registre-se no Discord com !register',
        player.id,
        0xff0000,
        'bold',
        2
      );
      return;
    }

    try {
      const result = await this.authService.login({ haxballNick, password }, this.db);

      if (result.success && result.account) {
        this.authenticatedPlayers.set(player.id, result.account.id);

        // Mensagem de sucesso
        room.sendAnnouncement(
          '✓ SENHA CORRETA! Login realizado com sucesso!',
          player.id,
          0x00ff00,
          'bold',
          2
        );

        room.sendAnnouncement(
          `Bem-vindo, ${result.account.haxballNick}!`,
          player.id,
          0x00ff00,
          'bold',
          1
        );

        room.sendAnnouncement(
          `Pontos: ${result.account.points} | Ranking: ${result.account.ranking} | Moedas: ${result.account.coins}`,
          player.id,
          0x55ff55,
          'normal',
          1
        );

        // Atualiza tag do jogador com Elo
        const eloTag = `[${result.account.ranking}]`;
        room.setPlayerAdmin(player.id, false); // Remove admin se tiver

        // Envia mensagem global sobre o login
        room.sendAnnouncement(
          `${eloTag} ${player.name} autenticou-se com sucesso!`,
          null,
          0xaaffaa,
          'normal',
          1
        );
      } else {
        // Senha incorreta
        room.sendAnnouncement(
          '❌ SENHA INCORRETA! Tente novamente.',
          player.id,
          0xff0000,
          'bold',
          2
        );

        // Mensagem adicional com dica
        if (result.message?.includes('bloqueada')) {
          room.sendAnnouncement(result.message, player.id, 0xff5555, 'normal', 1);
        } else {
          room.sendAnnouncement(
            'Verifique sua senha e tente novamente. Esqueceu? Contate um admin no Discord.',
            player.id,
            0xff9900,
            'small',
            1
          );
        }
      }
    } catch (error) {
      console.error('Erro ao fazer login na sala:', error);
      room.sendAnnouncement(
        '❌ Erro interno ao fazer login. Tente novamente.',
        player.id,
        0xff0000,
        'bold',
        2
      );
    }
  }

  /**
   * Comando: /logout
   */
  private handleLogout(room: any, player: any) {
    const accountId = this.authenticatedPlayers.get(player.id);

    if (!accountId) {
      room.sendAnnouncement('[AUTH] Voce nao esta autenticado.', player.id, 0xff9900, 'normal', 1);
      return;
    }

    this.authenticatedPlayers.delete(player.id);
    room.sendAnnouncement('[AUTH] Logout realizado com sucesso.', player.id, 0x00ff00, 'normal', 1);
  }

  /**
   * Comando: /profile [nick]
   */
  private async handleProfile(room: any, player: any, message: string) {
    const args = message.split(' ');
    let targetNick: string;

    if (args.length < 2) {
      // Mostra perfil proprio
      const accountId = this.authenticatedPlayers.get(player.id);
      if (!accountId) {
        room.sendAnnouncement(
          '[AUTH] Voce precisa fazer login primeiro. Use: /login <senha>',
          player.id,
          0xff9900,
          'normal',
          1
        );
        return;
      }
      targetNick = player.name;
    } else {
      targetNick = args[1];
    }

    try {
      const profile = await this.authService.getPublicProfile(targetNick, this.db);

      if (!profile) {
        room.sendAnnouncement(
          `[AUTH] Perfil nao encontrado para: ${targetNick}`,
          player.id,
          0xff9900,
          'normal',
          1
        );
        return;
      }

      const memberSince = new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(profile.createdAt);

      room.sendAnnouncement(`[PERFIL] ${profile.haxballNick}`, player.id, 0x00aaff, 'bold', 2);
      room.sendAnnouncement(
        `Pontos: ${profile.points} | Ranking: ${profile.ranking} | Moedas: ${profile.coins}`,
        player.id,
        0x00aaff,
        'normal',
        1
      );
      room.sendAnnouncement(`Membro desde: ${memberSince}`, player.id, 0x00aaff, 'normal', 1);
    } catch (error) {
      console.error('Erro ao buscar perfil na sala:', error);
      room.sendAnnouncement('[AUTH] Erro ao buscar perfil.', player.id, 0xff0000, 'normal', 1);
    }
  }

  /**
   * Comando: /stats
   */
  private async handleStats(room: any, player: any) {
    const accountId = this.authenticatedPlayers.get(player.id);

    if (!accountId) {
      room.sendAnnouncement(
        '[AUTH] Voce precisa fazer login primeiro. Use: /login <senha>',
        player.id,
        0xff9900,
        'normal',
        1
      );
      return;
    }

    try {
      const account = this.db.getAccountById(accountId);
      if (!account) return;

      // Busca ratings por posicao
      const ratings = this.db.sqlite
        .prepare('SELECT * FROM player_ratings WHERE account_id = ? LIMIT 1')
        .get(accountId) as any;

      room.sendAnnouncement(`[STATS] ${account.haxballNick}`, player.id, 0x00aaff, 'bold', 2);

      if (ratings) {
        room.sendAnnouncement(
          `Elo Geral: ${ratings.overall.toFixed(0)}`,
          player.id,
          0x00aaff,
          'normal',
          1
        );
        room.sendAnnouncement(
          `GK: ${ratings.gk.toFixed(0)} | DEF: ${ratings.def.toFixed(
            0
          )} | MID: ${ratings.mid.toFixed(0)} | ATA: ${ratings.ata.toFixed(0)}`,
          player.id,
          0x00aaff,
          'normal',
          1
        );
      } else {
        room.sendAnnouncement(
          'Sem dados de rating ainda. Jogue mais partidas!',
          player.id,
          0xff9900,
          'normal',
          1
        );
      }

      // Busca stats gerais
      // Preferir agregado pre-calculado para exibicao
      const agg = this.db.sqlite
        .prepare(
          'SELECT total_matches, total_wins, total_losses, total_draws, total_goals, total_assists, total_saves, win_rate FROM player_stats_aggregate WHERE account_id = ?'
        )
        .get(accountId) as any;

      if (agg) {
        room.sendAnnouncement(
          `Partidas: ${agg.total_matches} | Vitorias: ${agg.total_wins} | Derrotas: ${agg.total_losses} | Empates: ${agg.total_draws}`,
          player.id,
          0x00aaff,
          'normal',
          1
        );

        room.sendAnnouncement(
          `Gols: ${agg.total_goals} | Assistencias: ${agg.total_assists} | Defesas: ${
            agg.total_saves
          } | WinRate: ${agg.win_rate.toFixed(2)}%`,
          player.id,
          0x00aaff,
          'normal',
          1
        );
      } else {
        const stats = this.db.sqlite
          .prepare(
            'SELECT SUM(goals) as goals, SUM(assists) as assists, SUM(saves) as saves, COUNT(DISTINCT match_id) as matches, SUM(CASE WHEN won=1 THEN 1 ELSE 0 END) as wins FROM stats WHERE account_id = ?'
          )
          .get(accountId) as any;

        if (stats && stats.goals !== null) {
          room.sendAnnouncement(
            `Partidas: ${stats.matches} | Vitorias: ${stats.wins} | Gols: ${stats.goals} | Assistencias: ${stats.assists} | Defesas: ${stats.saves}`,
            player.id,
            0x00aaff,
            'normal',
            1
          );
        }
      }

      // Mostra delta Elo do ultimo jogo, se houver
      try {
        const lastRank = this.db.sqlite
          .prepare(
            'SELECT old_ranking, new_ranking FROM ranking_history WHERE account_id = ? ORDER BY timestamp DESC LIMIT 1'
          )
          .get(accountId) as any;
        if (
          lastRank &&
          typeof lastRank.old_ranking === 'number' &&
          typeof lastRank.new_ranking === 'number'
        ) {
          const delta = lastRank.new_ranking - lastRank.old_ranking;
          room.sendAnnouncement(
            `Delta Elo (ultimo jogo): ${delta >= 0 ? '+' + delta : delta}`,
            player.id,
            0x00aaff,
            'normal',
            1
          );
        }
      } catch (err) {
        // ignore
      }
    } catch (error) {
      console.error('Erro ao buscar stats na sala:', error);
      room.sendAnnouncement(
        '[AUTH] Erro ao buscar estatisticas.',
        player.id,
        0xff0000,
        'normal',
        1
      );
    }
  }

  /**
   * Verifica se jogador esta autenticado
   */
  isAuthenticated(playerId: number): boolean {
    return this.authenticatedPlayers.has(playerId);
  }

  /**
   * Retorna account ID do jogador autenticado
   */
  getAccountId(playerId: number): number | undefined {
    return this.authenticatedPlayers.get(playerId);
  }

  /**
   * Retorna dados completos da conta do jogador autenticado
   */
  getAuthenticatedPlayer(playerId: number): any | null {
    const accountId = this.authenticatedPlayers.get(playerId);
    if (!accountId) return null;

    try {
      const account = this.db.getAccountById(accountId);
      return account || null;
    } catch (error) {
      console.error('[AUTH] Erro ao buscar conta autenticada:', error);
      return null;
    }
  }

  /**
   * Busca dados de uma conta autenticada (alias para compatibilidade)
   */
  getAccount(playerId: number): any {
    const accountId = this.authenticatedPlayers.get(playerId);
    if (!accountId) return null;
    return this.db.getAccountById(accountId);
  }

  /**
   * Autentica jogador diretamente (util para auto-login via Discord)
   */
  authenticatePlayer(playerId: number, accountId: number) {
    this.authenticatedPlayers.set(playerId, accountId);
  }

  /**
   * Retorna nome formatado com Elo do jogador (se autenticado)
   * @returns Nome com tag [Elo] se autenticado, nome original caso contrario
   */
  getPlayerDisplayName(playerId: number, playerName: string): string {
    const account = this.getAccount(playerId);
    if (!account) return playerName;
    return `[${account.ranking}] ${playerName}`;
  }

  /**
   * Retorna Elo do jogador (se autenticado)
   * @returns Elo ou null se nao autenticado
   */
  getPlayerElo(playerId: number): number | null {
    const account = this.getAccount(playerId);
    return account ? account.ranking : null;
  }

  /**
   * Login simplificado para uso em commands.cjs
   */
  async login(player: any, password: string): Promise<any> {
    const haxballNick = player.name;
    const account = this.db.getAccountByNick(haxballNick);

    if (!account) {
      return { success: false, message: 'Nick nao cadastrado' };
    }

    try {
      const result = await this.authService.login({ haxballNick, password }, this.db);

      if (result.success && result.account) {
        this.authenticatedPlayers.set(player.id, result.account.id);
      }

      return result;
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      return { success: false, message: 'Erro interno' };
    }
  }

  /**
   * Logout simplificado
   */
  logout(player: any) {
    this.authenticatedPlayers.delete(player.id);
  }

  /**
   * Busca perfil publico de jogador por nick
   */
  async getProfile(haxballNick: string): Promise<any> {
    try {
      const profile = await this.authService.getPublicProfile(haxballNick, this.db);
      if (!profile) return null;

      try {
        if (this.statsService) {
          const aggregate = await this.statsService.getPlayerAggregate(profile.id);
          if (aggregate) {
            // Retorna um novo objeto com os campos agregados (sem alterar tipo original)
            return {
              ...profile,
              wins: aggregate.totalWins,
              losses: aggregate.totalLosses,
              draws: aggregate.totalDraws,
              goals: aggregate.totalGoals,
              assists: aggregate.totalAssists,
              saves: aggregate.totalSaves,
              totalMatches: aggregate.totalMatches,
            };
          }
        }
      } catch (err) {
        console.error('[AUTH] Erro ao buscar agregado de stats no getProfile:', err);
      }

      return profile;
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      return null;
    }
  }

  /**
   * Busca stats do jogador autenticado
   */
  async getPlayerStats(playerId: number): Promise<any> {
    const account = this.getAccount(playerId);
    if (!account) return null;

    // Enriquecer com agregados das estatisticas (se disponivel)
    try {
      if (this.statsService) {
        const aggregate = await this.statsService.getPlayerAggregate(account.id);
        if (aggregate) {
          return {
            ranking: account.ranking,
            points: account.points,
            coins: account.coins,
            wins: aggregate.totalWins || account.wins || 0,
            losses: aggregate.totalLosses || account.losses || 0,
            draws: aggregate.totalDraws || account.draws || 0,
            goals: aggregate.totalGoals || account.goals || 0,
            assists: aggregate.totalAssists || account.assists || 0,
            saves: aggregate.totalSaves || account.saves || 0,
          };
        }
      }
    } catch (err) {
      console.error('[AUTH] Erro ao buscar agregado de stats no getPlayerStats:', err);
    }

    // Fallback para campos na tabela de contas
    return {
      ranking: account.ranking,
      points: account.points,
      coins: account.coins,
      wins: account.wins || 0,
      losses: account.losses || 0,
      draws: account.draws || 0,
      goals: account.goals || 0,
      assists: account.assists || 0,
      saves: account.saves || 0,
    };
  }

  /**
   * Busca posicao no ranking de um jogador
   */
  async getRanking(haxballNick: string): Promise<any> {
    try {
      const account = this.db.getAccountByNick(haxballNick);
      if (!account) return null;

      // Busca posicao no ranking
      const allAccounts = this.db.getAllAccounts();
      const sorted = allAccounts.sort((a: any, b: any) => b.ranking - a.ranking);

      const position = sorted.findIndex((a: any) => a.id === account.id) + 1;

      return {
        position,
        ranking: account.ranking,
        points: account.points,
      };
    } catch (error) {
      console.error('Erro ao buscar ranking:', error);
      return null;
    }
  }

  /**
   * Busca top 10 jogadores
   */
  async getTop10(): Promise<any[]> {
    try {
      const allAccounts = this.db.getAllAccounts();
      return allAccounts
        .sort((a: any, b: any) => b.ranking - a.ranking)
        .slice(0, 10)
        .map((acc: any) => ({
          haxballNick: acc.haxballNick,
          ranking: acc.ranking,
          points: acc.points,
        }));
    } catch (error) {
      console.error('Erro ao buscar top 10:', error);
      return [];
    }
  }
}

//   __  ____ ____ _  _
// / _\/ ___) ___) )( \
//    \___ \___ ) \/ (
// \_/\_(____(____|____/
