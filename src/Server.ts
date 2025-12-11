/**
 * Gerenciador de instancias de servidores Haxball com haxball.js
 * Implementacao moderna usando WebRTC nativo sem necessidade de Chrome/Chromium
 * @module Server
 * @version 6.0.0 (Fase 8 - Migracao haxball.js)
 */

import HaxballJS from 'haxball.js';
import { createRequire } from 'module';
import path from 'path';
import { CustomSettings, ServerConfig } from './Global';
import { log } from './utils/log';
import { logger } from './utils/Logger';

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
  private nextPid: number = 1000;
  private proxyServers: string[];
  private db: any | null = null;
  private hbInit: any = null;

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
   * @private
   * @returns {Promise<any>} Funcao HBInit do haxball.js
   */
  private async getHBInit(): Promise<any> {
    if (this.hbInit) return this.hbInit;

    try {
      // Nota: HaxballJS nao suporta proxy diretamente
      // Proxy sera tratado a nivel do token headless ou HTTP client
      this.hbInit = await HaxballJS();
      log('SERVER', 'haxball.js inicializado com sucesso');
      return this.hbInit;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Falha ao inicializar haxball.js: ${errorMsg}`);
    }
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
      const HBInit = await this.getHBInit();

      // Converter tokens para array se necessario
      const tokenArray = Array.isArray(tokens) ? tokens : [tokens];
      const token = tokenArray[0];

      if (!token) {
        throw new Error('Nenhum token fornecido');
      }

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
      const room = HBInit(roomConfig);

      // Gerar PID ficticio para compatibilidade
      const pid = this.nextPid++;

      // Executa script do bot
      this.executeBotScript(room, script, settings, this.db, scriptPath);

      // Aplicar event handlers padrao
      this.setupDefaultEventHandlers(room, pid, name);

      // Armazenar instancia
      const roomInstance: RoomInstance = {
        room,
        pid,
        botName: name || 'Unknown',
        link: room.getLink?.() || 'https://www.haxball.com/headless',
        createdAt: Date.now(),
        eventHandlers: new Map(),
      };

      this.rooms.set(pid, roomInstance);

      log('SERVER', `Sala aberta - PID: ${pid}, Nome: ${name}, Link: ${roomInstance.link}`);
      logger.info('Server', `Sala aberta`, { pid, name, link: roomInstance.link });

      return {
        link: roomInstance.link,
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
      const HBInit = await this.getHBInit();

      const tokenArray = Array.isArray(tokens) ? tokens : [tokens];
      const token = tokenArray[0];

      if (!token) {
        throw new Error('Nenhum token fornecido');
      }

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

      const room = HBInit(roomConfig);
      const pid = this.nextPid++;

      try {
        if (typeof roomModule?.init === 'function') {
          roomModule.init({ room, settings: settings || {}, db: this.db });
        } else {
          log('SERVER', 'Modulo de sala sem init definido');
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        log('SERVER', `AVISO: Erro ao executar modulo ESM: ${errorMsg.substring(0, 100)}`);
      }

      this.setupDefaultEventHandlers(room, pid, name || roomModule?.name);

      const roomInstance: RoomInstance = {
        room,
        pid,
        botName: name || roomModule?.name || 'Unknown',
        link: room.getLink?.() || 'https://www.haxball.com/headless',
        createdAt: Date.now(),
        eventHandlers: new Map(),
      };

      this.rooms.set(pid, roomInstance);

      log(
        'SERVER',
        `Sala aberta (ESM) - PID: ${pid}, Nome: ${roomInstance.botName}, Link: ${roomInstance.link}`
      );
      logger.info('Server', `Sala aberta ESM`, {
        pid,
        name: roomInstance.botName,
        link: roomInstance.link,
      });

      return {
        link: roomInstance.link,
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
      // haxball.js nao tem metodo close explicito
      // Remover handlers e deixar garbage collection fazer seu trabalho
      instance.eventHandlers.clear();
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
          // Criar um require funcao para o diretorio do script
          const scriptDir = path.dirname(scriptPath);
          const requireFn = createRequire(path.join(scriptDir, '__placeholder__.js'));

          // Limpar cache se existir
          if (require.cache[scriptPath]) {
            delete require.cache[scriptPath];
          }

          // Injetar contexto global antes de carregar
          (globalThis as any).room = room;
          (globalThis as any).customSettings = settings || {};
          (globalThis as any).db = safeDb;
          (globalThis as any).HBInit = (_config: any) => room;

          // Executar o script com require nativo
          requireFn(scriptPath);
          log('SERVER', `Bot script carregado com sucesso: ${path.basename(scriptPath)}`);
        } catch (requireError) {
          log(
            'SERVER',
            `Erro ao carregar via require, usando eval: ${
              requireError instanceof Error ? requireError.message : String(requireError)
            }`
          );

          // Injetar globais para eval
          (globalThis as any).room = room;
          (globalThis as any).customSettings = settings || {};
          (globalThis as any).db = safeDb;
          (globalThis as any).HBInit = (_config: any) => room;

          eval(script);
          log('SERVER', 'Bot script carregado com eval como fallback');
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
      if (room.onRoomLink) {
        const originalHandler = room.onRoomLink;
        room.onRoomLink = (link: string) => {
          log('SERVER', `Sala ${pid} link atualizado: ${link}`);
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
