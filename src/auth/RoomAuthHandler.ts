import { AuthService } from './AuthService';
import { getAuthDb } from '../database/auth-client';

/**
 * Gerencia autenticacao e comandos dentro das salas Haxball
 */
export class RoomAuthHandler {
  private authService: AuthService;
  private db: any;
  private authenticatedPlayers = new Map<number, number>(); // playerId -> accountId

  constructor() {
    this.db = getAuthDb();
    this.authService = new AuthService();
  }

  /**
   * Registra handlers de autenticacao na sala
   */
  registerHandlers(room: any) {
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
      room.sendAnnouncement(
        '[AUTH] Uso: /login <senha>',
        player.id,
        0xff9900,
        'bold',
        2
      );
      return;
    }

    const password = args.slice(1).join(' ');
    const haxballNick = player.name;

    try {
      const result = await this.authService.login({ haxballNick, password }, this.db);

      if (result.success && result.account) {
        this.authenticatedPlayers.set(player.id, result.account.id);

        room.sendAnnouncement(
          `[AUTH] Login realizado com sucesso! Bem-vindo, ${result.account.haxballNick}!`,
          player.id,
          0x00ff00,
          'bold',
          2
        );

        room.sendAnnouncement(
          `[AUTH] Pontos: ${result.account.points} | Ranking: ${result.account.ranking} | Moedas: ${result.account.coins}`,
          player.id,
          0x00ff00,
          'normal',
          1
        );
      } else {
        room.sendAnnouncement(
          `[AUTH] Falha no login: ${result.message}`,
          player.id,
          0xff0000,
          'bold',
          2
        );
      }
    } catch (error) {
      console.error('Erro ao fazer login na sala:', error);
      room.sendAnnouncement(
        '[AUTH] Erro interno ao fazer login. Tente novamente.',
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
      room.sendAnnouncement(
        '[AUTH] Voce nao esta autenticado.',
        player.id,
        0xff9900,
        'normal',
        1
      );
      return;
    }

    this.authenticatedPlayers.delete(player.id);
    room.sendAnnouncement(
      '[AUTH] Logout realizado com sucesso.',
      player.id,
      0x00ff00,
      'normal',
      1
    );
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

      room.sendAnnouncement(
        `[PERFIL] ${profile.haxballNick}`,
        player.id,
        0x00aaff,
        'bold',
        2
      );
      room.sendAnnouncement(
        `Pontos: ${profile.points} | Ranking: ${profile.ranking} | Moedas: ${profile.coins}`,
        player.id,
        0x00aaff,
        'normal',
        1
      );
      room.sendAnnouncement(
        `Membro desde: ${memberSince}`,
        player.id,
        0x00aaff,
        'normal',
        1
      );
    } catch (error) {
      console.error('Erro ao buscar perfil na sala:', error);
      room.sendAnnouncement(
        '[AUTH] Erro ao buscar perfil.',
        player.id,
        0xff0000,
        'normal',
        1
      );
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

      room.sendAnnouncement(
        `[STATS] ${account.haxballNick}`,
        player.id,
        0x00aaff,
        'bold',
        2
      );

      if (ratings) {
        room.sendAnnouncement(
          `Elo Geral: ${ratings.overall.toFixed(0)}`,
          player.id,
          0x00aaff,
          'normal',
          1
        );
        room.sendAnnouncement(
          `GK: ${ratings.gk.toFixed(0)} | DEF: ${ratings.def.toFixed(0)} | MID: ${ratings.mid.toFixed(0)} | ATA: ${ratings.ata.toFixed(0)}`,
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
      const stats = this.db.sqlite
        .prepare(
          'SELECT SUM(goals) as goals, SUM(assists) as assists, SUM(saves) as saves FROM stats WHERE account_id = ?'
        )
        .get(accountId) as any;

      if (stats && stats.goals !== null) {
        room.sendAnnouncement(
          `Gols: ${stats.goals} | Assistencias: ${stats.assists} | Defesas: ${stats.saves}`,
          player.id,
          0x00aaff,
          'normal',
          1
        );
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
   * Busca account por player ID
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
}

//   __  ____ ____ _  _
// / _\/ ___) ___) )( \
//    \___ \___ ) \/ (
// \_/\_(____(____|____/
