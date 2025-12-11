import crypto from 'crypto';
import {
  AuthConfig,
  AuthResult,
  LoginData,
  PlayerSession,
  PublicPlayerProfile,
  RegisterData,
} from './types';

/**
 * Servico de autenticacao e gerenciamento de contas CIRS
 */
export class AuthService {
  private config: AuthConfig = {
    saltRounds: 10,
    tokenExpirationHours: 168, // 7 dias
    maxLoginAttempts: 5,
    lockoutDurationMinutes: 15,
    passwordMinLength: 6,
    passwordMaxLength: 50,
  };

  private activeSessions = new Map<string, PlayerSession>();

  constructor(config?: Partial<AuthConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Gera hash de senha seguro usando PBKDF2
   */
  private hashPassword(password: string, salt: string): string {
    return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  }

  /**
   * Gera salt aleatorio
   */
  private generateSalt(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Gera token de sessao
   */
  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Valida senha contra hash armazenado
   */
  private verifyPassword(password: string, hash: string, salt: string): boolean {
    const passwordHash = this.hashPassword(password, salt);
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(passwordHash));
  }

  /**
   * Valida formato de senha
   */
  private validatePassword(password: string): { valid: boolean; message: string } {
    if (password.length < this.config.passwordMinLength) {
      return {
        valid: false,
        message: `Senha deve ter no minimo ${this.config.passwordMinLength} caracteres`,
      };
    }
    if (password.length > this.config.passwordMaxLength) {
      return {
        valid: false,
        message: `Senha deve ter no maximo ${this.config.passwordMaxLength} caracteres`,
      };
    }
    return { valid: true, message: '' };
  }

  /**
   * Valida formato de nick Haxball
   */
  private validateNick(nick: string): { valid: boolean; message: string } {
    if (!nick || nick.trim().length === 0) {
      return { valid: false, message: 'Nick nao pode ser vazio' };
    }
    if (nick.length < 2) {
      return { valid: false, message: 'Nick deve ter no minimo 2 caracteres' };
    }
    if (nick.length > 25) {
      return { valid: false, message: 'Nick deve ter no maximo 25 caracteres' };
    }
    // Haxball permite caracteres especiais, entao nao validamos isso
    return { valid: true, message: '' };
  }

  /**
   * Registra nova conta
   */
  async register(data: RegisterData, db: any): Promise<AuthResult> {
    try {
      // Valida nick
      const nickValidation = this.validateNick(data.haxballNick);
      if (!nickValidation.valid) {
        return { success: false, message: nickValidation.message };
      }

      // Valida senha
      const passwordValidation = this.validatePassword(data.password);
      if (!passwordValidation.valid) {
        return { success: false, message: passwordValidation.message };
      }

      // Verifica se nick ja existe
      const existing = await db.getAccountByNick(data.haxballNick);
      if (existing) {
        return { success: false, message: 'Nick ja esta registrado' };
      }

      // Verifica se Discord ID ja esta vinculado (se fornecido)
      if (data.discordId) {
        const existingDiscord = await db.getAccountByDiscordId(data.discordId);
        if (existingDiscord) {
          return { success: false, message: 'Discord ID ja esta vinculado a outra conta' };
        }
      }

      // Gera salt e hash da senha
      const salt = this.generateSalt();
      const passwordHash = this.hashPassword(data.password, salt);

      // Cria conta
      const accountId = await db.createAccount({
        haxballNick: data.haxballNick,
        passwordHash,
        salt,
        discordId: data.discordId || null,
      });

      const account = await db.getAccountById(accountId);

      return {
        success: true,
        message: 'Conta criada com sucesso',
        account,
      };
    } catch (error) {
      console.error('Erro ao registrar conta:', error);
      return {
        success: false,
        message: 'Erro ao criar conta. Tente novamente mais tarde.',
      };
    }
  }

  /**
   * Autentica jogador
   */
  async login(data: LoginData, db: any): Promise<AuthResult> {
    try {
      // Busca conta
      const account = await db.getAccountByNick(data.haxballNick);
      if (!account) {
        // Registra tentativa falhada
        await db.recordLoginAttempt(data.haxballNick, false);
        return { success: false, message: 'Nick ou senha incorretos' };
      }

      // Verifica se conta esta ativa
      if (!account.isActive) {
        return { success: false, message: 'Conta esta desativada' };
      }

      // Verifica tentativas recentes
      const recentAttempts = await db.getRecentLoginAttempts(
        data.haxballNick,
        this.config.lockoutDurationMinutes
      );
      if (recentAttempts >= this.config.maxLoginAttempts) {
        return {
          success: false,
          message: `Muitas tentativas falhadas. Tente novamente em ${this.config.lockoutDurationMinutes} minutos`,
        };
      }

      // Verifica senha
      const passwordValid = this.verifyPassword(data.password, account.passwordHash, account.salt);
      if (!passwordValid) {
        // Registra tentativa falhada
        await db.recordLoginAttempt(data.haxballNick, false);
        return { success: false, message: 'Nick ou senha incorretos' };
      }

      // Gera token de sessao
      const token = this.generateToken();

      // Cria sessao
      const session: PlayerSession = {
        accountId: account.id,
        haxballNick: account.haxballNick,
        token,
        loginTime: new Date(),
        lastActivity: new Date(),
      };

      this.activeSessions.set(token, session);

      // Salva sessao no banco
      await db.createSession({
        accountId: account.id,
        token,
      });

      // Atualiza lastLogin
      await db.updateLastLogin(account.id);

      // Registra tentativa bem-sucedida
      await db.recordLoginAttempt(data.haxballNick, true);

      return {
        success: true,
        message: 'Login realizado com sucesso',
        account,
        token,
      };
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      return {
        success: false,
        message: 'Erro ao fazer login. Tente novamente mais tarde.',
      };
    }
  }

  /**
   * Valida token de sessao
   */
  async validateToken(token: string, db: any): Promise<PlayerSession | null> {
    // Verifica cache em memoria
    const session = this.activeSessions.get(token);
    if (session) {
      // Verifica se sessao expirou
      const expirationTime = new Date(session.loginTime);
      expirationTime.setHours(expirationTime.getHours() + this.config.tokenExpirationHours);

      if (new Date() > expirationTime) {
        this.activeSessions.delete(token);
        await db.deactivateSession(token);
        return null;
      }

      // Atualiza lastActivity
      session.lastActivity = new Date();
      return session;
    }

    // Busca no banco
    const dbSession = await db.getSessionByToken(token);
    if (!dbSession || !dbSession.isActive) {
      return null;
    }

    // Verifica expiracao
    const expirationTime = new Date(dbSession.loginTime);
    expirationTime.setHours(expirationTime.getHours() + this.config.tokenExpirationHours);

    if (new Date() > expirationTime) {
      await db.deactivateSession(token);
      return null;
    }

    // Adiciona ao cache
    const activeSession: PlayerSession = {
      accountId: dbSession.accountId,
      haxballNick: dbSession.haxballNick,
      token: dbSession.token,
      loginTime: new Date(dbSession.loginTime),
      lastActivity: new Date(),
      roomId: dbSession.roomId,
    };

    this.activeSessions.set(token, activeSession);
    return activeSession;
  }

  /**
   * Logout (invalida token)
   */
  async logout(token: string, db: any): Promise<boolean> {
    this.activeSessions.delete(token);
    await db.deactivateSession(token);
    return true;
  }

  /**
   * Busca perfil publico do jogador
   */
  async getPublicProfile(haxballNick: string, db: any): Promise<PublicPlayerProfile | null> {
    const account = await db.getAccountByNick(haxballNick);
    if (!account) {
      return null;
    }

    return {
      id: account.id,
      haxballNick: account.haxballNick,
      points: account.points,
      ranking: account.ranking,
      coins: account.coins,
      createdAt: account.createdAt,
      lastLogin: account.lastLogin,
    };
  }

  /**
   * Vincula Discord ID a conta existente
   */
  async linkDiscord(
    haxballNick: string,
    password: string,
    discordId: string,
    db: any
  ): Promise<AuthResult> {
    // Autentica primeiro
    const loginResult = await this.login({ haxballNick, password }, db);
    if (!loginResult.success || !loginResult.account) {
      return loginResult;
    }

    // Verifica se Discord ID ja esta vinculado
    const existingDiscord = await db.getAccountByDiscordId(discordId);
    if (existingDiscord) {
      return { success: false, message: 'Discord ID ja esta vinculado a outra conta' };
    }

    // Vincula Discord ID
    await db.linkDiscordId(loginResult.account.id, discordId);

    return {
      success: true,
      message: 'Discord vinculado com sucesso',
      account: loginResult.account,
    };
  }

  /**
   * Limpa sessoes expiradas
   */
  async cleanupExpiredSessions(db: any): Promise<number> {
    const expiredTime = new Date();
    expiredTime.setHours(expiredTime.getHours() - this.config.tokenExpirationHours);

    const count = await db.cleanupExpiredSessions(expiredTime);

    // Limpa cache em memoria
    for (const [token, session] of this.activeSessions.entries()) {
      const expirationTime = new Date(session.loginTime);
      expirationTime.setHours(expirationTime.getHours() + this.config.tokenExpirationHours);

      if (new Date() > expirationTime) {
        this.activeSessions.delete(token);
      }
    }

    return count;
  }
}

//   __  ____ ____ _  _
// / _\/ ___) ___) )( \
//    \___ \___ ) \/ (
// \_/\_(____(____|____/
