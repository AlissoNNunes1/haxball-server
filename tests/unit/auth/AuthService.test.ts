import { AuthService } from '../../src/auth/AuthService';
import { RegisterData, LoginData } from '../../src/auth/types';

describe('AuthService', () => {
  let authService: AuthService;
  let mockDb: any;

  beforeEach(() => {
    authService = new AuthService();

    // Mock database
    mockDb = {
      getAccountByNick: jest.fn(),
      getAccountByDiscordId: jest.fn(),
      getAccountById: jest.fn(),
      createAccount: jest.fn(),
      createSession: jest.fn(),
      updateLastLogin: jest.fn(),
      recordLoginAttempt: jest.fn(),
      getRecentLoginAttempts: jest.fn(),
      getSessionByToken: jest.fn(),
      deactivateSession: jest.fn(),
      linkDiscordId: jest.fn(),
      cleanupExpiredSessions: jest.fn(),
    };
  });

  describe('register', () => {
    it('deve registrar nova conta com sucesso', async () => {
      const registerData: RegisterData = {
        haxballNick: 'TestPlayer',
        password: 'senha123',
        discordId: '123456789',
      };

      mockDb.getAccountByNick.mockResolvedValue(null);
      mockDb.getAccountByDiscordId.mockResolvedValue(null);
      mockDb.createAccount.mockResolvedValue(1);
      mockDb.getAccountById.mockResolvedValue({
        id: 1,
        haxballNick: 'TestPlayer',
        discordId: '123456789',
        points: 0,
        ranking: 1000,
        coins: 0,
      });

      const result = await authService.register(registerData, mockDb);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Conta criada com sucesso');
      expect(result.account).toBeDefined();
      expect(mockDb.createAccount).toHaveBeenCalled();
    });

    it('deve falhar se nick ja existe', async () => {
      const registerData: RegisterData = {
        haxballNick: 'ExistingPlayer',
        password: 'senha123',
      };

      mockDb.getAccountByNick.mockResolvedValue({ id: 1, haxballNick: 'ExistingPlayer' });

      const result = await authService.register(registerData, mockDb);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Nick ja esta registrado');
      expect(mockDb.createAccount).not.toHaveBeenCalled();
    });

    it('deve falhar se senha for muito curta', async () => {
      const registerData: RegisterData = {
        haxballNick: 'TestPlayer',
        password: '123',
      };

      const result = await authService.register(registerData, mockDb);

      expect(result.success).toBe(false);
      expect(result.message).toContain('no minimo');
    });

    it('deve falhar se nick for muito curto', async () => {
      const registerData: RegisterData = {
        haxballNick: 'A',
        password: 'senha123',
      };

      const result = await authService.register(registerData, mockDb);

      expect(result.success).toBe(false);
      expect(result.message).toContain('no minimo 2 caracteres');
    });

    it('deve falhar se Discord ID ja esta vinculado', async () => {
      const registerData: RegisterData = {
        haxballNick: 'NewPlayer',
        password: 'senha123',
        discordId: '123456789',
      };

      mockDb.getAccountByNick.mockResolvedValue(null);
      mockDb.getAccountByDiscordId.mockResolvedValue({ id: 2, discordId: '123456789' });

      const result = await authService.register(registerData, mockDb);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Discord ID ja esta vinculado a outra conta');
    });
  });

  describe('login', () => {
    it('deve fazer login com sucesso', async () => {
      const loginData: LoginData = {
        haxballNick: 'TestPlayer',
        password: 'senha123',
      };

      const mockAccount = {
        id: 1,
        haxballNick: 'TestPlayer',
        passwordHash: 'hashedpassword',
        salt: 'salt',
        isActive: true,
      };

      mockDb.getAccountByNick.mockResolvedValue(mockAccount);
      mockDb.getRecentLoginAttempts.mockResolvedValue(0);
      mockDb.createSession.mockResolvedValue(1);

      // Mock password verification (simplificado para teste)
      jest
        .spyOn(authService as any, 'verifyPassword')
        .mockReturnValue(true);

      const result = await authService.login(loginData, mockDb);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Login realizado com sucesso');
      expect(result.token).toBeDefined();
      expect(mockDb.recordLoginAttempt).toHaveBeenCalledWith('TestPlayer', true);
    });

    it('deve falhar se conta nao existe', async () => {
      const loginData: LoginData = {
        haxballNick: 'NonExistent',
        password: 'senha123',
      };

      mockDb.getAccountByNick.mockResolvedValue(null);

      const result = await authService.login(loginData, mockDb);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Nick ou senha incorretos');
      expect(mockDb.recordLoginAttempt).toHaveBeenCalledWith('NonExistent', false);
    });

    it('deve falhar se senha incorreta', async () => {
      const loginData: LoginData = {
        haxballNick: 'TestPlayer',
        password: 'senhaerrada',
      };

      const mockAccount = {
        id: 1,
        haxballNick: 'TestPlayer',
        passwordHash: 'hashedpassword',
        salt: 'salt',
        isActive: true,
      };

      mockDb.getAccountByNick.mockResolvedValue(mockAccount);
      mockDb.getRecentLoginAttempts.mockResolvedValue(0);

      jest
        .spyOn(authService as any, 'verifyPassword')
        .mockReturnValue(false);

      const result = await authService.login(loginData, mockDb);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Nick ou senha incorretos');
      expect(mockDb.recordLoginAttempt).toHaveBeenCalledWith('TestPlayer', false);
    });

    it('deve falhar se muitas tentativas falhadas', async () => {
      const loginData: LoginData = {
        haxballNick: 'TestPlayer',
        password: 'senha123',
      };

      const mockAccount = {
        id: 1,
        haxballNick: 'TestPlayer',
        isActive: true,
      };

      mockDb.getAccountByNick.mockResolvedValue(mockAccount);
      mockDb.getRecentLoginAttempts.mockResolvedValue(5);

      const result = await authService.login(loginData, mockDb);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Muitas tentativas falhadas');
    });

    it('deve falhar se conta esta desativada', async () => {
      const loginData: LoginData = {
        haxballNick: 'TestPlayer',
        password: 'senha123',
      };

      const mockAccount = {
        id: 1,
        haxballNick: 'TestPlayer',
        isActive: false,
      };

      mockDb.getAccountByNick.mockResolvedValue(mockAccount);

      const result = await authService.login(loginData, mockDb);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Conta esta desativada');
    });
  });

  describe('validateToken', () => {
    it('deve validar token ativo', async () => {
      const token = 'validtoken123';
      const mockSession = {
        accountId: 1,
        haxballNick: 'TestPlayer',
        token,
        loginTime: new Date(Date.now() - 3600000), // 1 hora atras
        isActive: true,
      };

      mockDb.getSessionByToken.mockResolvedValue(mockSession);

      const session = await authService.validateToken(token, mockDb);

      expect(session).toBeDefined();
      expect(session?.accountId).toBe(1);
      expect(session?.haxballNick).toBe('TestPlayer');
    });

    it('deve retornar null para token invalido', async () => {
      const token = 'invalidtoken';

      mockDb.getSessionByToken.mockResolvedValue(null);

      const session = await authService.validateToken(token, mockDb);

      expect(session).toBeNull();
    });

    it('deve retornar null para token expirado', async () => {
      const token = 'expiredtoken';
      const mockSession = {
        accountId: 1,
        haxballNick: 'TestPlayer',
        token,
        loginTime: new Date(Date.now() - 200 * 3600000), // 200 horas atras (> 168h expiration)
        isActive: true,
      };

      mockDb.getSessionByToken.mockResolvedValue(mockSession);

      const session = await authService.validateToken(token, mockDb);

      expect(session).toBeNull();
      expect(mockDb.deactivateSession).toHaveBeenCalledWith(token);
    });
  });

  describe('getPublicProfile', () => {
    it('deve retornar perfil publico', async () => {
      const mockAccount = {
        id: 1,
        haxballNick: 'TestPlayer',
        points: 100,
        ranking: 1200,
        coins: 50,
        createdAt: new Date('2024-01-01'),
        lastLogin: new Date('2024-12-01'),
      };

      mockDb.getAccountByNick.mockResolvedValue(mockAccount);

      const profile = await authService.getPublicProfile('TestPlayer', mockDb);

      expect(profile).toBeDefined();
      expect(profile?.haxballNick).toBe('TestPlayer');
      expect(profile?.points).toBe(100);
      expect(profile?.ranking).toBe(1200);
    });

    it('deve retornar null se conta nao existe', async () => {
      mockDb.getAccountByNick.mockResolvedValue(null);

      const profile = await authService.getPublicProfile('NonExistent', mockDb);

      expect(profile).toBeNull();
    });
  });
});

//   __  ____ ____ _  _
// / _\/ ___) ___) )( \
//    \___ \___ ) \/ (
// \_/\_(____(____|____/
