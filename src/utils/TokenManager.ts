import { log } from './log';

interface TokenEntry {
  token: string;
  lastUsed: number;
  createdAt: number;
  usageCount: number;
  botName?: string;
}

// Gerencia cache de tokens com rastreamento de tempo de uso
// Detecta quando e necessario novo token e facilita UX do usuario
export class TokenManager {
  private tokenCache: Map<string, TokenEntry> = new Map();
  private readonly TOKEN_EXPIRY_HOURS = 24;

  // Armazena token no cache
  storeToken(token: string, botName?: string): void {
    const key = token.substring(0, 20);
    const now = Date.now();

    this.tokenCache.set(key, {
      token,
      lastUsed: now,
      createdAt: now,
      usageCount: 1,
      botName,
    });

    log('TOKEN', `Token armazenado em cache para bot '${botName || 'generico'}'`);
  }

  // Recupera token do cache se ainda valido
  getToken(tokenKey: string): string | null {
    const entry = this.tokenCache.get(tokenKey);
    if (!entry) return null;

    const hoursSinceCreation = (Date.now() - entry.createdAt) / (1000 * 60 * 60);

    if (hoursSinceCreation > this.TOKEN_EXPIRY_HOURS) {
      this.tokenCache.delete(tokenKey);
      log('TOKEN', `Token expirado apos ${hoursSinceCreation.toFixed(1)} horas`);
      return null;
    }

    entry.lastUsed = Date.now();
    entry.usageCount++;

    return entry.token;
  }

  // Verifica se token precisa ser renovado (heuristica baseada em tempo)
  shouldRenewToken(tokenKey: string): boolean {
    const entry = this.tokenCache.get(tokenKey);
    if (!entry) return true;

    const hoursSinceCreation = (Date.now() - entry.createdAt) / (1000 * 60 * 60);
    const minutesSinceLastUse = (Date.now() - entry.lastUsed) / (1000 * 60);

    // Sugere renovacao se: passaram 24h OU muitos usos em pouco tempo
    if (hoursSinceCreation > this.TOKEN_EXPIRY_HOURS) {
      return true;
    }

    if (entry.usageCount > 50 && minutesSinceLastUse < 5) {
      log('TOKEN', `Aviso: Token em uso intenso (${entry.usageCount} usos)`);
      return true;
    }

    return false;
  }

  // Retorna informacoes sobre o token armazenado
  getTokenInfo(
    tokenKey: string
  ): { botName?: string; usageCount: number; hoursSinceCreation: number } | null {
    const entry = this.tokenCache.get(tokenKey);
    if (!entry) return null;

    const hoursSinceCreation = (Date.now() - entry.createdAt) / (1000 * 60 * 60);

    return {
      botName: entry.botName,
      usageCount: entry.usageCount,
      hoursSinceCreation,
    };
  }

  // Limpa token do cache
  removeToken(tokenKey: string): void {
    this.tokenCache.delete(tokenKey);
    log('TOKEN', 'Token removido do cache');
  }

  // Limpa todos os tokens expirados
  cleanupExpiredTokens(): void {
    let count = 0;

    for (const [key, entry] of this.tokenCache.entries()) {
      const hoursSinceCreation = (Date.now() - entry.createdAt) / (1000 * 60 * 60);

      if (hoursSinceCreation > this.TOKEN_EXPIRY_HOURS) {
        this.tokenCache.delete(key);
        count++;
      }
    }

    if (count > 0) {
      log('TOKEN', `Limpeza: ${count} token(s) expirado(s) removido(s)`);
    }
  }

  // Obtem link para obtencao de novo token
  getTokenLink(): string {
    return 'https://www.haxball.com/headlesstoken';
  }

  // Inicia limpeza periodica de tokens expirados
  startPeriodicCleanup(intervalMs: number = 3600000): void {
    setInterval(() => {
      this.cleanupExpiredTokens();
    }, intervalMs);

    log('TOKEN', 'Limpeza periodica de tokens iniciada');
  }
}

/* ASCII SIGNATURE
  __  ____ ____ _  _ 
 / _\/ ___) ___) )( \
/    \___ \___ ) \/ (
\_/\_(____(____|____/
*/
