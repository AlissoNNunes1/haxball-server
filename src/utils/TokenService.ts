// Sistema de obtencao automatica de tokens do Haxball
// Importante: Requer resolucao manual de captcha antes de obter token

import * as fs from 'fs';
import * as path from 'path';

/**
 * Configuracao do servico de tokens
 */
interface TokenServiceConfig {
  tokenUrl: string;
  captchaUrl: string;
  cachePath: string;
  cacheExpiry: number; // Em milissegundos
}

/**
 * Informacoes do token em cache
 */
interface CachedToken {
  token: string;
  obtainedAt: number;
  expiresAt: number;
}

/**
 * Servico para gerenciamento de tokens Haxball
 *
 * IMPORTANTE: O Haxball requer resolucao de captcha humano antes de gerar tokens.
 * Este servico NAO resolve captchas automaticamente por questoes de seguranca e ToS.
 *
 * Fluxo recomendado:
 * 1. Usuario acessa https://www.haxball.com/headlesstoken manualmente
 * 2. Usuario resolve o captcha
 * 3. Usuario clica em "Generate Token" e copia o token
 * 4. Token e salvo no cache para reutilizacao
 */
export class TokenService {
  private config: TokenServiceConfig;
  private tokenCache: CachedToken | null = null;

  constructor(config?: Partial<TokenServiceConfig>) {
    this.config = {
      tokenUrl: 'https://www.haxball.com/rs/api/getheadlesstoken',
      captchaUrl: 'https://www.haxball.com/headlesstoken',
      cachePath: path.join(process.cwd(), '.haxball-tokens'),
      cacheExpiry: 30 * 24 * 60 * 60 * 1000, // 30 dias
      ...config,
    };

    this.loadCachedTokens();
  }

  /**
   * Carrega tokens do cache em disco
   */
  private loadCachedTokens(): void {
    try {
      if (fs.existsSync(this.config.cachePath)) {
        const data = fs.readFileSync(this.config.cachePath, 'utf8');
        const cached: CachedToken = JSON.parse(data);

        // Verifica se token ainda e valido
        if (cached.expiresAt > Date.now()) {
          this.tokenCache = cached;
          console.log('[TokenService] Token carregado do cache');
        } else {
          console.log('[TokenService] Token em cache expirado, removendo...');
          fs.unlinkSync(this.config.cachePath);
        }
      }
    } catch (error) {
      console.error('[TokenService] Erro ao carregar cache:', error);
    }
  }

  /**
   * Salva token no cache em disco
   */
  private saveCachedToken(token: string): void {
    try {
      const cached: CachedToken = {
        token,
        obtainedAt: Date.now(),
        expiresAt: Date.now() + this.config.cacheExpiry,
      };

      fs.writeFileSync(this.config.cachePath, JSON.stringify(cached, null, 2), 'utf8');
      this.tokenCache = cached;
      console.log('[TokenService] Token salvo no cache');
    } catch (error) {
      console.error('[TokenService] Erro ao salvar cache:', error);
    }
  }

  /**
   * Obtem token do cache se disponivel
   */
  public getCachedToken(): string | null {
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now()) {
      return this.tokenCache.token;
    }
    return null;
  }

  /**
   * Adiciona token manualmente ao cache
   * Util quando usuario gera token manualmente via navegador
   */
  public addToken(token: string): void {
    if (!token || typeof token !== 'string') {
      throw new Error('Token invalido');
    }

    this.saveCachedToken(token);
    console.log('[TokenService] Token adicionado manualmente ao cache');
  }

  /**
   * Remove token do cache
   */
  public clearCache(): void {
    try {
      if (fs.existsSync(this.config.cachePath)) {
        fs.unlinkSync(this.config.cachePath);
      }
      this.tokenCache = null;
      console.log('[TokenService] Cache limpo');
    } catch (error) {
      console.error('[TokenService] Erro ao limpar cache:', error);
    }
  }

  /**
   * Exibe instrucoes para obtencao manual de token
   */
  public showInstructions(): void {
    console.log('\n=== INSTRUCOES PARA OBTER TOKEN HAXBALL ===\n');
    console.log('1. Acesse:', this.config.captchaUrl);
    console.log('2. Resolva o captcha (verificacao humana)');
    console.log('3. Clique em "Generate Token"');
    console.log('4. Copie o token gerado');
    console.log('5. Use o comando: haxball-server token add <SEU_TOKEN>');
    console.log('\nOu adicione diretamente no config.json\n');
  }

  /**
   * Verifica status do cache
   */
  public getCacheStatus(): {
    hasToken: boolean;
    expiresIn?: number;
    expiresAt?: Date;
  } {
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now()) {
      return {
        hasToken: true,
        expiresIn: this.tokenCache.expiresAt - Date.now(),
        expiresAt: new Date(this.tokenCache.expiresAt),
      };
    }

    return { hasToken: false };
  }

  /**
   * Tenta obter token via API (NAO IMPLEMENTADO - requer captcha)
   *
   * Este metodo esta aqui apenas como documentacao.
   * A API oficial do Haxball REQUER resolucao de captcha no frontend,
   * o que impossibilita obtencao automatica de tokens via Node.js.
   *
   * @throws Error sempre - captcha obrigatorio
   */
  public async fetchTokenFromAPI(): Promise<never> {
    throw new Error(
      'Obtencao automatica de tokens nao e suportada pelo Haxball. ' +
        'A API requer resolucao de captcha no navegador. ' +
        'Use tokenService.showInstructions() para ver como obter token manualmente.'
    );
  }
}

//   __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
