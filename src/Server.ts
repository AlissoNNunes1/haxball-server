/**
 * Gerenciador de instancias de servidores Haxball com haxball.js
 * Implementacao moderna usando WebRTC nativo sem necessidade de Chrome/Chromium
 * @module Server
 * @version 6.0.0 (Fase 8 - Migracao haxball.js)
 */

// Import haxball.js lazily to avoid creating network handles during test import
let HaxballJS: any = null;
import path from 'path';
import { CustomSettings, ServerConfig } from './Global';
import { log } from './utils/log';
import { logger } from './utils/Logger';
// Funcoes utilitarias de mensagens (CJS)
const { stopCommunityAnnouncements } = require('../shared/config/messages.cjs');

/**
 * Representa uma instancia de sala Haxball aberta
 * @interface RoomInstance
 * @property {any} room - Objeto de sala do haxball.js
 * @property {number} pid - ID de processo (ficticio para compatibilidade com ControlPanel)
 * @property {string} botName - Nome do bot que abriu a sala
 * @property {string} link - Link de acesso da sala
 * @property {number} createdAt - Timestamp de criacao
 * @property {Map} eventHandlers - Handlers de eventos aplicados
 */
export interface RoomInstance {
  room: any;
  pid: number;
  botName: string;
  link: string;
  createdAt: number;
  eventHandlers: Map<string, Function>;
  token?: string;
}

/**
 * Interface compativel com codigo antigo (Puppeteer)
 * Mantida para compatibilidade com ControlPanel
 * @interface BrowserInfo
 * @deprecated Use RoomInstance em novo codigo
 */
export interface BrowserInfo {
  pid: number;
  link: string;
  remotePort?: number;
  process?: () => { pid?: number } | null;
  pages?: () => Promise<unknown[]>;
}

/**
 * Gerenciador de salas Haxball usando haxball.js
 * 70-80% reducao de memoria comparado a Puppeteer
 * Sem necessidade de Chrome/Chromium
 * @class Server
 */
export class Server {
  private rooms: Map<number, RoomInstance> = new Map();
  // Map adicional para indexar instancias por link (stable id fornecido por haxball.js)
  private roomsByLink: Map<string, number> = new Map();
  private nextPid: number = 1000;
  private proxyServers: string[];
  private db: any | null = null;
  // Cache da instancia HBInit (inicializada uma unica vez)
  private hbInitInstance: any = null;
  // Promise para sincronizar inicializacao do HBInit (evitar race condition)
  private hbInitPromise: Promise<any> | null = null;
  // Rastreia tempo da ultima inicializacao por token (para cooldown)
  private tokenInitTimes: Map<string, number> = new Map();
  // Mutex por token para serializar inicializacao do mesmo token
  private tokenLocks: Map<string, Promise<void>> = new Map();
  // Tempo minimo entre inicializacoes do mesmo token (ms)
  private readonly TOKEN_INIT_COOLDOWN = 6000;
  // Mutex simples para serializar chamadas de HBInit e evitar "Can't init twice" mesmo com tokens diferentes
  private hbInitLock: Promise<void> = Promise.resolve();

  /**
   * Compatibilidade com codigo antigo que acessa browsers array
   * @deprecated Use rooms Map diretamente
   */
  get browsers(): BrowserInfo[] {
    return Array.from(this.rooms.values()).map((instance) => ({
      pid: instance.pid,
      link: instance.link,
    }));
  }

  /**
   * Retorna o cliente DB (se inicializado)
   */
  getDb() {
    return this.db;
  }

  /**
   * Inicializa o gerenciador de salas Haxball
   * @param {ServerConfig} config - Configuracao do servidor
   * @throws {Error} Se inicializacao de haxball.js falhar
   */
  constructor(config: ServerConfig, db?: any) {
    this.proxyServers = config.proxyServers ?? [];
    this.db = db ?? null;

    log('SERVER', `Inicializando gerenciador de salas Haxball (haxball.js v6.0.0)`);
    log('SERVER', `Proxies habilitados: ${config.proxyEnabled ? 'SIM' : 'NAO'}`);
    if (this.proxyServers.length > 0) {
      log('SERVER', `Servidores proxy disponiveis: ${this.proxyServers.length}`);
    }
  }

  /**
   * Inicializa haxball.js de forma lazy (sob demanda)
   * IMPORTANTE: HBInit() so pode ser chamado uma unica vez por instancia do modulo
   * Por isso fazemos cache apos a primeira inicializacao
   * Thread-safe: usa promise para evitar race condition
   * @private
   * @returns {Promise<any>} Funcao HBInit do haxball.js (cache apos primeira chamada)
   */
  private async getHBInit(): Promise<any> {
    try {
      // Se ja foi inicializado, retorna do cache
      if (this.hbInitInstance) {
        return this.hbInitInstance;
      }

      // Se ja tem uma promise de inicializacao em andamento, aguarda
      if (this.hbInitPromise) {
        return await this.hbInitPromise;
      }

      // Cria a promise de inicializacao
      this.hbInitPromise = this.initializeHBInit();
      this.hbInitInstance = await this.hbInitPromise;
      return this.hbInitInstance;
    } catch (error) {
      this.hbInitPromise = null; // Limpa para tentar novamente
      throw error;
    }
  }

  /**
   * Executa a inicializacao real do haxball.js
   * @private
   */
  private async initializeHBInit(): Promise<any> {
    // Nota: HaxballJS nao suporta proxy diretamente
    // Proxy sera tratado a nivel do token headless ou HTTP client
    if (!HaxballJS) {
      // Lazy import to prevent network handles at module load time
      const mod = await import('haxball.js');
      HaxballJS = (mod && (mod.default || mod)) as any;
    }

    // Chamada UNICA a HaxballJS()
    const hbInit = await HaxballJS();
    log('SERVER', 'haxball.js inicializado com sucesso');
    return hbInit;
  }

  /**
   * Aguarda cooldown antes de reutilizar um token
   * Evita erro "Can't init twice" do haxball.js
   * @private
   * @param {string} token - Token headless
   */
  private async waitTokenCooldown(token: string): Promise<void> {
    const lastInitTime = this.tokenInitTimes.get(token);
    if (!lastInitTime) return;

    const elapsed = Date.now() - lastInitTime;
    if (elapsed < this.TOKEN_INIT_COOLDOWN) {
      const waitTime = this.TOKEN_INIT_COOLDOWN - elapsed;
      log('SERVER', `Aguardando ${waitTime}ms para reutilizar token (evitar "Can't init twice")`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  /**
   * Registra tempo de inicializacao de um token
   * @private
   * @param {string} token - Token headless
   */
  private recordTokenInit(token: string): void {
    this.tokenInitTimes.set(token, Date.now());
  }

  /**
   * Serializa uso do mesmo token para evitar init concorrente
   */
  private async withTokenLock<T>(token: string, fn: () => Promise<T>): Promise<T> {
    const prevLock = this.tokenLocks.get(token) ?? Promise.resolve();
    let release!: () => void;
    const currentLock = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.tokenLocks.set(
      token,
      prevLock.then(() => currentLock)
    );

    await prevLock;
    try {
      return await fn();
    } finally {
      release();
      // Limpa se ninguem mais aguardando
      const chain = this.tokenLocks.get(token);
      if (chain === currentLock) {
        this.tokenLocks.delete(token);
      }
    }
  }

  /**
   * Serializa execucao critica de HBInit para evitar condicao de corrida "Can't init twice"
   * @private
   */
  private async withHbInitLock<T>(fn: () => Promise<T>): Promise<T> {
    const prevLock = this.hbInitLock;
    let release!: () => void;
    this.hbInitLock = new Promise<void>((resolve) => {
      release = resolve;
    });

    await prevLock;

    try {
      return await fn();
    } finally {
      release();
    }
  }

  /**
   * Seleciona o melhor token para usar
   * Suporta ilimitadas salas com o mesmo token (serializadas via lock)
   * Distribui entre multiplos tokens se disponivel
   * @private
   * @param {string[]} tokenArray - Array de tokens disponiveis
   * @returns {string} Token selecionado
   */
  private selectBestToken(tokenArray: string[]): string {
    if (tokenArray.length === 0) {
      throw new Error('Nenhum token fornecido');
    }

    if (tokenArray.length === 1) {
      return tokenArray[0];
    }

    // Se multiplos tokens, preferir o que nunca foi usado
    for (const token of tokenArray) {
      if (!this.tokenInitTimes.has(token)) {
        return token;
      }
    }

    // Se todos foram usados, preferir o que esta fora do cooldown
    for (const token of tokenArray) {
      const lastInitTime = this.tokenInitTimes.get(token);
      if (lastInitTime) {
        const elapsed = Date.now() - lastInitTime;
        if (elapsed >= this.TOKEN_INIT_COOLDOWN) {
          return token;
        }
      }
    }

    // Se todos estao em cooldown, retornar o que foi usado ha mais tempo
    let oldestToken = tokenArray[0];
    let oldestTime = this.tokenInitTimes.get(oldestToken) ?? Infinity;

    for (const token of tokenArray.slice(1)) {
      const time = this.tokenInitTimes.get(token) ?? Infinity;
      if (time < oldestTime) {
        oldestTime = time;
        oldestToken = token;
      }
    }

    return oldestToken;
  }

  /**
   * Abre uma nova sala Haxball
   * @param {string} script - Codigo do bot script (JavaScript)
   * @param {string|string[]} tokens - Token(ns) headless do Haxball
   * @param {string} [name] - Nome da sala (opcional)
   * @param {CustomSettings} [settings] - Configuracoes personalizadas (opcional)
   * @returns {Promise<{link: string, pid: number}>} Informacoes da sala aberta
   * @throws {Error} Se abertura de sala falhar
   * @example
   * const result = await server.open(botScript, 'thr1.xxx.xxx', 'Minha Sala');
   * console.log(`Sala aberta: ${result.link}`);
   */
  async open(
    script: string,
    tokens: string | string[],
    name?: string,
    settings?: CustomSettings,
    scriptPath?: string
  ): Promise<{ link: string; pid: number; remotePort?: number } | null> {
    try {
      // Converter tokens para array se necessario
      const tokenArray = Array.isArray(tokens) ? tokens : [tokens];
      // Selecionar melhor token com rotacao automatica
      const token = this.selectBestToken(tokenArray);

      // Declaracoes fora do lock para evitar 'used before assigned'
      let room: any;
      let pid: number = -1;
      let roomInstance: RoomInstance = {
        room: null,
        pid: -1,
        botName: 'Unknown',
        link: 'https://www.haxball.com/headless',
        createdAt: Date.now(),
        eventHandlers: new Map(),
      };

      // Serializar por token (nao por HBInit) para permitir paralelo com tokens diferentes
      await this.withTokenLock(token, async () => {
        // LOCK CRITICO: apenas getHBInit() + HBInit() + setup basico
        await this.withHbInitLock(async () => {
          const HBInit = await this.getHBInit();

          // Aguardar cooldown para evitar "Can't init twice"
          await this.waitTokenCooldown(token);

          // Construir configuracao da sala
          const roomConfig = {
            roomName: name || 'Haxball Room',
            maxPlayers: settings?.['reserved.haxball.maxPlayers']
              ? Number(settings['reserved.haxball.maxPlayers'])
              : 16,
            public: settings?.['reserved.haxball.public'] !== false ? true : false,
            noPlayer: settings?.['reserved.haxball.noPlayer'] !== false ? true : false,
            password: settings?.['reserved.haxball.password']
              ? String(settings['reserved.haxball.password'])
              : undefined,
            geo: settings?.['reserved.haxball.geo']
              ? JSON.parse(String(settings['reserved.haxball.geo']))
              : undefined,
            token: token,
          };

          // Remover undefined
          Object.keys(roomConfig).forEach(
            (key) =>
              roomConfig[key as keyof typeof roomConfig] === undefined &&
              delete roomConfig[key as keyof typeof roomConfig]
          );

          // Abrir sala
          room = HBInit(roomConfig);

          // Registrar tempo de inicializacao para evitar "Can't init twice"
          this.recordTokenInit(token);

          // Gerar PID ficticio para compatibilidade
          pid = this.nextPid++;

          // Armazenar instancia (link sera atualizado via onRoomLink)
          roomInstance = {
            room,
            pid,
            botName: name || 'Unknown',
            link: 'https://www.haxball.com/headless',
            createdAt: Date.now(),
            eventHandlers: new Map(),
            token: token, // Guardar para logging/debug
          };

          this.rooms.set(pid, roomInstance);
        });
      });

      // FIM LOCK CRITICO: agora pode rodar em paralelo
      // Promise para aguardar link da sala (nao precisa de lock global)
      const linkPromise = new Promise<string>((resolve) => {
        const timeout = setTimeout(() => {
          resolve(roomInstance.link || 'https://www.haxball.com/headless');
        }, 10000); // Timeout de 10s

        const originalHandler = room.onRoomLink;
        room.onRoomLink = (link: string) => {
          clearTimeout(timeout);
          log('SERVER', `Sala ${pid} link recebido: ${link}`);
          roomInstance.link = link;
          if (link) this.roomsByLink.set(String(link), pid);
          if (typeof originalHandler === 'function') {
            originalHandler.call(room, link);
          }
          resolve(link);
        };
      });

      // Executa script do bot (paralelo)
      this.executeBotScript(room, script, settings, this.db, scriptPath);

      // Aplicar event handlers padrao (paralelo)
      this.setupDefaultEventHandlers(room, pid, name);

      // Aguarda link ficar disponivel
      const finalLink = await linkPromise;

      log('SERVER', `Sala aberta - PID: ${pid}, Nome: ${name}, Link: ${finalLink}`);
      logger.info('Server', `Sala aberta`, { pid, name, link: finalLink });

      return {
        link: finalLink,
        pid,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log('SERVER', `ERRO ao abrir sala: ${errorMsg}`);
      logger.error('Server', `Erro ao abrir sala`, { name, error: errorMsg });
      throw error;
    }
  }

  /**
   * Abre sala consumindo um modulo ESM ja carregado (init executado direto sem VM)
   * @param {object} roomModule - Modulo com metodo init({ room, settings })
   * @param {string|string[]} tokens - Token(s) headless do Haxball
   * @param {string} [name] - Nome da sala (opcional, fallback para roomModule.name)
   * @param {CustomSettings} [settings] - Configuracoes personalizadas
   * @returns {Promise<{link: string, pid: number}>} Info da sala aberta
   */
  async openWithModule(
    roomModule: {
      init?: ({ room, settings, db }: { room: any; settings?: CustomSettings; db?: any }) => any;
      name?: string;
    },
    tokens: string | string[],
    name?: string,
    settings?: CustomSettings
  ): Promise<{ link: string; pid: number; remotePort?: number } | null> {
    try {
      const tokenArray = Array.isArray(tokens) ? tokens : [tokens];
      // Selecionar melhor token com rotacao automatica
      const token = this.selectBestToken(tokenArray);

      // Declaracoes fora do lock para evitar 'used before assigned'
      let room: any;
      let pid: number = -1;
      let roomInstance: RoomInstance = {
        room: null,
        pid: -1,
        botName: 'Unknown',
        link: 'https://www.haxball.com/headless',
        createdAt: Date.now(),
        eventHandlers: new Map(),
      };

      // Serializar por token (nao por HBInit) para permitir paralelo com tokens diferentes
      await this.withTokenLock(token, async () => {
        // LOCK CRITICO: apenas getHBInit() + HBInit() + setup basico
        await this.withHbInitLock(async () => {
          const HBInit = await this.getHBInit();

          const roomConfig = {
            roomName: name || roomModule?.name || 'Haxball Room',
            maxPlayers: settings?.['reserved.haxball.maxPlayers']
              ? Number(settings['reserved.haxball.maxPlayers'])
              : 16,
            public: settings?.['reserved.haxball.public'] !== false ? true : false,
            noPlayer: settings?.['reserved.haxball.noPlayer'] !== false ? true : false,
            password: settings?.['reserved.haxball.password']
              ? String(settings['reserved.haxball.password'])
              : undefined,
            geo: settings?.['reserved.haxball.geo']
              ? JSON.parse(String(settings['reserved.haxball.geo']))
              : undefined,
            token: token,
          };

          Object.keys(roomConfig).forEach(
            (key) =>
              roomConfig[key as keyof typeof roomConfig] === undefined &&
              delete roomConfig[key as keyof typeof roomConfig]
          );

          // Aguardar cooldown de token para evitar 'Can't init twice'
          await this.waitTokenCooldown(token);
          room = HBInit(roomConfig);
          this.recordTokenInit(token);
          pid = this.nextPid++;

          // Armazenar instancia (link sera atualizado via onRoomLink)
          roomInstance = {
            room,
            pid,
            botName: name || roomModule?.name || 'Unknown',
            link: 'https://www.haxball.com/headless',
            createdAt: Date.now(),
            eventHandlers: new Map(),
          };

          this.rooms.set(pid, roomInstance);
        });
      });

      // FIM LOCK CRITICO: agora pode rodar em paralelo
      // Promise para aguardar link da sala (nao precisa de lock global)
      const linkPromise = new Promise<string>((resolve) => {
        const timeout = setTimeout(() => {
          resolve(roomInstance.link || 'https://www.haxball.com/headless');
        }, 10000); // Timeout de 10s

        const originalHandler = room.onRoomLink;
        room.onRoomLink = (link: string) => {
          clearTimeout(timeout);
          log('SERVER', `Sala ESM ${pid} link recebido: ${link}`);
          roomInstance.link = link;
          if (link) this.roomsByLink.set(String(link), pid);
          if (typeof originalHandler === 'function') {
            originalHandler.call(room, link);
          }
          resolve(link);
        };
      });

      try {
        if (typeof roomModule?.init === 'function') {
          // Parar anuncios periodicos antes de reavaliar/init do modulo
          try {
            stopCommunityAnnouncements(room);
          } catch (_) {}
          roomModule.init({ room, settings: settings || {}, db: this.db });
        } else {
          log('SERVER', 'Modulo de sala sem init definido');
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        log('SERVER', `AVISO: Erro ao executar modulo ESM: ${errorMsg.substring(0, 100)}`);
      }

      this.setupDefaultEventHandlers(room, pid, name || roomModule?.name);

      // Aguarda link ficar disponivel
      const finalLink = await linkPromise;

      log(
        'SERVER',
        `Sala aberta (ESM) - PID: ${pid}, Nome: ${roomInstance.botName}, Link: ${finalLink}`
      );
      logger.info('Server', `Sala aberta ESM`, {
        pid,
        name: roomInstance.botName,
        link: finalLink,
      });

      return {
        link: finalLink,
        pid,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log('SERVER', `ERRO ao abrir sala ESM: ${errorMsg}`);
      logger.error('Server', `Erro ao abrir sala ESM`, { name, error: errorMsg });
      throw error;
    }
  }

  /**
   * Fecha uma sala aberta
   * @param {string|number} pidOrTitle - PID da sala ou nome
   * @returns {Promise<boolean>} true se sala foi fechada, false se nao encontrada
   * @example
   * const success = await server.close(1000);
   * if (success) console.log('Sala fechada com sucesso');
   */
  async close(pidOrTitle: string | number): Promise<boolean> {
    const pid = typeof pidOrTitle === 'number' ? pidOrTitle : parseInt(pidOrTitle);

    const instance = this.rooms.get(pid);
    if (!instance) {
      log('SERVER', `Sala ${pid} nao encontrada para fechamento`);
      return false;
    }

    try {
      // Parar qualquer anuncio periodico da comunidade para evitar timers vazando
      try {
        stopCommunityAnnouncements(instance?.room);
      } catch (_) {}
      // haxball.js nao tem metodo close explicito
      // Remover handlers e deixar garbage collection fazer seu trabalho
      instance.eventHandlers.clear();
      const link = instance.link;
      if (link) this.roomsByLink.delete(String(link));
      this.rooms.delete(pid);

      // Tentar force garbage collection se disponivel
      if (global.gc) {
        setImmediate(() => global.gc?.());
      }

      log('SERVER', `Sala ${pid} (${instance.botName}) fechada com sucesso`);
      logger.info('Server', `Sala fechada`, { pid, name: instance.botName });
      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log('SERVER', `ERRO ao fechar sala ${pid}: ${errorMsg}`);
      logger.error('Server', `Erro ao fechar sala`, { pid, error: errorMsg });
      return false;
    }
  }

  /**
   * Fecha todas as salas abertas
   * Util para shutdown gracioso ou limpeza completa
   * @returns {number} Numero de salas fechadas
   * @example
   * await server.closeAll();
   */
  async closeAll(): Promise<number> {
    const pids = Array.from(this.rooms.keys());
    let closedCount = 0;

    for (const pid of pids) {
      const result = await this.close(pid);
      if (result) closedCount++;
    }

    log('SERVER', `Todas as salas fechadas: ${closedCount}/${pids.length}`);
    logger.info('Server', `Shutdown completo`, {
      closedRooms: closedCount,
      totalRooms: pids.length,
    });
    return closedCount;
  }

  /**
   * Retorna instancia de sala por PID
   * @param {number} pid - ID da sala
   * @returns {RoomInstance|undefined} Instancia da sala ou undefined
   */
  getRoom(pid: number): RoomInstance | undefined {
    return this.rooms.get(pid);
  }

  /**
   * Retorna todas as salas abertas
   * @returns {RoomInstance[]} Array de salas abertas
   */
  getAllRooms(): RoomInstance[] {
    return Array.from(this.rooms.values());
  }

  /**
   * Verifica se um token ja tem uma sala aberta
   * @param token Token a verificar
   * @returns {boolean} true se token ja esta em uso
   */
  isTokenInUse(token: string): boolean {
    return Array.from(this.rooms.values()).some((room) => room.token === token);
  }

  /**
   * Retorna a sala aberta com um determinado token, se existir
   * @param token Token a procurar
   * @returns {RoomInstance | undefined} Sala aberta com esse token ou undefined
   */
  getRoomByToken(token: string): RoomInstance | undefined {
    return Array.from(this.rooms.values()).find((room) => room.token === token);
  }

  /**
   * Recupera instancia da sala a partir do link (identificador estavel) se existente
   * @param link string
   * @returns RoomInstance | undefined
   */
  getRoomByLink(link: string): RoomInstance | undefined {
    const pid = this.roomsByLink.get(String(link));
    if (pid === undefined) return undefined;
    return this.getRoom(pid);
  }

  /**
   * Recupera instancia da sala a partir do objeto room do haxball.js
   * Usa propriedades estaveis como getLink(), link, name ou room.id quando disponivel
   * @param room any
   */
  getRoomByObject(room: any): RoomInstance | undefined {
    if (!room) return undefined;
    try {
      const link = room.getLink?.() || room.link || room.name || room.id;
      if (!link) return undefined;
      return this.getRoomByLink(String(link));
    } catch (_) {
      return undefined;
    }
  }

  /**
   * Retorna numero de salas abertas
   * @returns {number} Quantidade de salas
   */
  getRoomCount(): number {
    return this.rooms.size;
  }

  /**
   * Executa script do bot no contexto da sala
   * @private
   * @param {any} room - Objeto de sala
   * @param {string} script - Codigo JavaScript do bot (caminho ou conteudo)
   * @param {CustomSettings} [settings] - Configuracoes disponidas no contexto
   * @param {string} [scriptPath] - Caminho do script para require
   */
  private executeBotScript(
    room: any,
    script: string,
    settings?: CustomSettings,
    db?: any,
    scriptPath?: string
  ): void {
    try {
      // Garantir que anuncios da comunidade anteriores sejam interrompidos antes de (re)carregar o script
      try {
        stopCommunityAnnouncements(room);
      } catch (_) {}
      // Contexto disponivel ao script
      const safeDb = db
        ? {
            ensureUserByName: db.ensureUserByName?.bind(db),
            createRoomSession: db.createRoomSession?.bind(db),
            createMatch: db.createMatch?.bind(db),
            insertMatchEvent: db.insertMatchEvent?.bind(db),
            incrementStatCount: db.incrementStatCount?.bind(db),
            logEvent: db.logEvent?.bind(db),
          }
        : undefined;

      // Se temos um caminho de script, tentar usar require diretamente
      if (scriptPath) {
        try {
          // Resolver caminho absoluto do script
          const absoluteScriptPath = path.isAbsolute(scriptPath)
            ? scriptPath
            : path.resolve(process.cwd(), scriptPath);

          log('SERVER', `Carregando script: ${absoluteScriptPath}`);

          // Limpar cache se existir
          if (require.cache[absoluteScriptPath]) {
            delete require.cache[absoluteScriptPath];
          }

          // Injetar contexto global antes de carregar
          (globalThis as any).room = room;
          (globalThis as any).customSettings = settings || {};
          (globalThis as any).db = safeDb;
          (globalThis as any).HBInit = (_config: any) => room;

          // Executar o script com require nativo
          try {
            require(absoluteScriptPath);
            log('SERVER', `Bot script carregado com sucesso: ${path.basename(absoluteScriptPath)}`);
          } catch (innerError) {
            // Capturar stack trace completo para debugging
            if (innerError instanceof Error && innerError.stack) {
              log('SERVER', `Stack trace completo: ${innerError.stack}`);
            }
            throw innerError;
          }
        } catch (requireError) {
          log(
            'SERVER',
            `Erro ao carregar script: ${
              requireError instanceof Error ? requireError.message : String(requireError)
            }`
          );

          // Se require falhou, lancar o erro original ao inves de tentar eval
          // eval nao consegue resolver requires de modulos externos
          const errorDetails =
            requireError instanceof Error ? requireError.message : String(requireError);
          throw new Error(
            `Falha ao carregar script via require: ${errorDetails}. Script precisa ser um modulo CJS valido.`
          );
        } finally {
          // Limpar injecoes globais
          delete (globalThis as any).room;
          delete (globalThis as any).customSettings;
          delete (globalThis as any).db;
          delete (globalThis as any).HBInit;
        }
      } else {
        // Fallback para eval se nao temos caminho
        (globalThis as any).room = room;
        (globalThis as any).customSettings = settings || {};
        (globalThis as any).db = safeDb;
        (globalThis as any).HBInit = (_config: any) => room;

        eval(script);
        log('SERVER', 'Bot script carregado e executado com sucesso');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log('SERVER', `AVISO: Erro ao executar script bot: ${errorMsg}`);
      // Nao lancar erro - permitir que sala continue funcionando
    } finally {
      // Limpar globais injetados
      delete (globalThis as any).room;
      delete (globalThis as any).customSettings;
      delete (globalThis as any).db;
      delete (globalThis as any).HBInit;
    }
  }

  /**
   * Aplica event handlers padrao para logging e monitoramento
   * @private
   * @param {any} room - Objeto de sala
   * @param {number} pid - ID da sala
   * @param {string} [_botName] - Nome do bot (para futuro uso em logging)
   */
  private setupDefaultEventHandlers(room: any, pid: number, _botName?: string): void {
    try {
      // Evento: Link da sala disponivel
      // Nao sobrescrever se ja foi configurado na Promise de link
      const hasLinkHandler = room.onRoomLink && typeof room.onRoomLink === 'function';
      if (!hasLinkHandler && room.onRoomLink !== undefined) {
        const originalHandler = room.onRoomLink;
        room.onRoomLink = (link: string) => {
          log('SERVER', `Sala ${pid} link atualizado: ${link}`);
          // Atualiza indice por link para manter chave estavel
          const inst = this.getRoom(pid);
          if (inst) {
            if (inst.link) this.roomsByLink.delete(String(inst.link));
            inst.link = link;
            if (link) this.roomsByLink.set(String(link), pid);
          }
          if (typeof originalHandler === 'function') {
            originalHandler.call(room, link);
          }
        };
      }

      // Evento: Jogador entrou
      if (room.onPlayerJoin) {
        const originalHandler = room.onPlayerJoin;
        room.onPlayerJoin = (player: any) => {
          log('SERVER', `Sala ${pid}: Jogador entrou - ${player?.name || 'Unknown'}`);
          if (typeof originalHandler === 'function') {
            originalHandler.call(room, player);
          }
        };
      }

      // Evento: Jogador saiu
      if (room.onPlayerLeave) {
        const originalHandler = room.onPlayerLeave;
        room.onPlayerLeave = (player: any) => {
          log('SERVER', `Sala ${pid}: Jogador saiu - ${player?.name || 'Unknown'}`);
          if (typeof originalHandler === 'function') {
            originalHandler.call(room, player);
          }
        };
      }

      // Evento: Jogo comecou
      if (room.onGameStart) {
        const originalHandler = room.onGameStart;
        room.onGameStart = () => {
          log('SERVER', `Sala ${pid}: Jogo iniciado`);
          if (typeof originalHandler === 'function') {
            originalHandler.call(room);
          }
        };
      }

      // Evento: Jogo parou
      if (room.onGameStop) {
        const originalHandler = room.onGameStop;
        room.onGameStop = (byPlayer: any) => {
          log('SERVER', `Sala ${pid}: Jogo parado`);
          if (typeof originalHandler === 'function') {
            originalHandler.call(room, byPlayer);
          }
        };
      }

      log('SERVER', `Sala ${pid}: Event handlers padrao configurados`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log('SERVER', `AVISO: Erro ao configurar handlers: ${errorMsg}`);
    }
  }
}

//    __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
