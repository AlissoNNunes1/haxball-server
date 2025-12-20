"use strict";
/**
 * Gerenciador de instancias de servidores Haxball com haxball.js
 * Implementacao moderna usando WebRTC nativo sem necessidade de Chrome/Chromium
 * @module Server
 * @version 6.0.0 (Fase 8 - Migracao haxball.js)
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Server = void 0;
// Import haxball.js lazily to avoid creating network handles during test import
let HaxballJS = null;
const path_1 = __importDefault(require("path"));
const log_1 = require("./utils/log");
const Logger_1 = require("./utils/Logger");
// Funcoes utilitarias de mensagens (CJS)
const { stopCommunityAnnouncements } = require('../shared/config/messages.cjs');
/**
 * Gerenciador de salas Haxball usando haxball.js
 * 70-80% reducao de memoria comparado a Puppeteer
 * Sem necessidade de Chrome/Chromium
 * @class Server
 */
class Server {
    rooms = new Map();
    // Map adicional para indexar instancias por link (stable id fornecido por haxball.js)
    roomsByLink = new Map();
    nextPid = 1000;
    proxyServers;
    db = null;
    // Rastreia tokens em uso para evitar "Can't init twice"
    tokensInUse = new Map();
    tokenInitTimes = new Map();
    // Mutex por token para serializar inicializacao do mesmo token
    tokenLocks = new Map();
    // Tempo minimo entre inicializacoes do mesmo token (ms)
    TOKEN_INIT_COOLDOWN = 6000;
    // Mutex simples para serializar chamadas de HBInit e evitar "Can't init twice" mesmo com tokens diferentes
    hbInitLock = Promise.resolve();
    /**
     * Compatibilidade com codigo antigo que acessa browsers array
     * @deprecated Use rooms Map diretamente
     */
    get browsers() {
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
    constructor(config, db) {
        this.proxyServers = config.proxyServers ?? [];
        this.db = db ?? null;
        (0, log_1.log)('SERVER', `Inicializando gerenciador de salas Haxball (haxball.js v6.0.0)`);
        (0, log_1.log)('SERVER', `Proxies habilitados: ${config.proxyEnabled ? 'SIM' : 'NAO'}`);
        if (this.proxyServers.length > 0) {
            (0, log_1.log)('SERVER', `Servidores proxy disponiveis: ${this.proxyServers.length}`);
        }
    }
    /**
     * Inicializa haxball.js de forma lazy (sob demanda)
     * @private
     * @returns {Promise<any>} Funcao HBInit do haxball.js
     */
    async getHBInit() {
        try {
            // Nota: HaxballJS nao suporta proxy diretamente
            // Proxy sera tratado a nivel do token headless ou HTTP client
            if (!HaxballJS) {
                // Lazy import to prevent network handles at module load time
                const mod = await Promise.resolve().then(() => __importStar(require('haxball.js')));
                HaxballJS = (mod && (mod.default || mod));
            }
            const hbInit = await HaxballJS();
            (0, log_1.log)('SERVER', 'haxball.js inicializado com sucesso');
            return hbInit;
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            throw new Error(`Falha ao inicializar haxball.js: ${errorMsg}`);
        }
    }
    /**
     * Aguarda cooldown antes de reutilizar um token
     * Evita erro "Can't init twice" do haxball.js
     * @private
     * @param {string} token - Token headless
     */
    async waitTokenCooldown(token) {
        const lastInitTime = this.tokenInitTimes.get(token);
        if (!lastInitTime)
            return;
        const elapsed = Date.now() - lastInitTime;
        if (elapsed < this.TOKEN_INIT_COOLDOWN) {
            const waitTime = this.TOKEN_INIT_COOLDOWN - elapsed;
            (0, log_1.log)('SERVER', `Aguardando ${waitTime}ms para reutilizar token (evitar "Can't init twice")`);
            await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
    }
    /**
     * Registra tempo de inicializacao de um token
     * @private
     * @param {string} token - Token headless
     */
    recordTokenInit(token) {
        this.tokenInitTimes.set(token, Date.now());
    }
    /**
     * Serializa uso do mesmo token para evitar init concorrente
     */
    async withTokenLock(token, fn) {
        const prevLock = this.tokenLocks.get(token) ?? Promise.resolve();
        let release;
        const currentLock = new Promise((resolve) => {
            release = resolve;
        });
        this.tokenLocks.set(token, prevLock.then(() => currentLock));
        await prevLock;
        try {
            return await fn();
        }
        finally {
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
    async withHbInitLock(fn) {
        const prevLock = this.hbInitLock;
        let release;
        this.hbInitLock = new Promise((resolve) => {
            release = resolve;
        });
        await prevLock;
        try {
            return await fn();
        }
        finally {
            release();
        }
    }
    /**
     * Seleciona o melhor token para usar (rotacao automática)
     * Prioriza tokens que nunca foram usados ou estao fora do cooldown
     * @private
     * @param {string[]} tokenArray - Array de tokens disponiveis
     * @returns {string} Token selecionado
     */
    selectBestToken(tokenArray) {
        if (tokenArray.length === 0) {
            throw new Error('Nenhum token fornecido');
        }
        const availableTokens = tokenArray.filter((t) => !this.tokensInUse.has(t));
        if (availableTokens.length === 0) {
            throw new Error('Todos os tokens fornecidos estao em uso; forneca um token diferente para abrir outra sala');
        }
        if (availableTokens.length === 1) {
            return availableTokens[0];
        }
        // Encontrar token que nunca foi usado
        for (const token of availableTokens) {
            if (!this.tokenInitTimes.has(token)) {
                return token;
            }
        }
        // Se todos foram usados, encontrar o que esta fora do cooldown
        for (const token of availableTokens) {
            const lastInitTime = this.tokenInitTimes.get(token);
            if (lastInitTime) {
                const elapsed = Date.now() - lastInitTime;
                if (elapsed >= this.TOKEN_INIT_COOLDOWN) {
                    return token;
                }
            }
        }
        // Se todos estao em cooldown, retornar o que foi usado ha mais tempo
        let oldestToken = availableTokens[0];
        let oldestTime = this.tokenInitTimes.get(oldestToken) ?? Infinity;
        for (const token of availableTokens.slice(1)) {
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
    async open(script, tokens, name, settings, scriptPath) {
        return this.withHbInitLock(async () => {
            try {
                const HBInit = await this.getHBInit();
                // Converter tokens para array se necessario
                const tokenArray = Array.isArray(tokens) ? tokens : [tokens];
                // Selecionar melhor token com rotacao automatica
                const token = this.selectBestToken(tokenArray);
                return this.withTokenLock(token, async () => {
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
                    Object.keys(roomConfig).forEach((key) => roomConfig[key] === undefined &&
                        delete roomConfig[key]);
                    // Abrir sala
                    const room = HBInit(roomConfig);
                    // Registrar tempo de inicializacao para evitar "Can't init twice"
                    this.recordTokenInit(token);
                    // Gerar PID ficticio para compatibilidade
                    const pid = this.nextPid++;
                    // Armazenar instancia (link sera atualizado via onRoomLink)
                    const roomInstance = {
                        room,
                        pid,
                        botName: name || 'Unknown',
                        link: 'https://www.haxball.com/headless',
                        createdAt: Date.now(),
                        eventHandlers: new Map(),
                    };
                    this.rooms.set(pid, roomInstance);
                    // Promise para aguardar link da sala
                    const linkPromise = new Promise((resolve) => {
                        const timeout = setTimeout(() => {
                            resolve(roomInstance.link || 'https://www.haxball.com/headless');
                        }, 10000); // Timeout de 10s
                        const originalHandler = room.onRoomLink;
                        room.onRoomLink = (link) => {
                            clearTimeout(timeout);
                            (0, log_1.log)('SERVER', `Sala ${pid} link recebido: ${link}`);
                            roomInstance.link = link;
                            if (link)
                                this.roomsByLink.set(String(link), pid);
                            if (typeof originalHandler === 'function') {
                                originalHandler.call(room, link);
                            }
                            resolve(link);
                        };
                    });
                    // Executa script do bot
                    this.executeBotScript(room, script, settings, this.db, scriptPath);
                    // Aplicar event handlers padrao (nao sobrescreve onRoomLink)
                    this.setupDefaultEventHandlers(room, pid, name);
                    // Aguarda link ficar disponivel
                    const finalLink = await linkPromise;
                    (0, log_1.log)('SERVER', `Sala aberta - PID: ${pid}, Nome: ${name}, Link: ${finalLink}`);
                    Logger_1.logger.info('Server', `Sala aberta`, { pid, name, link: finalLink });
                    return {
                        link: finalLink,
                        pid,
                    };
                });
            }
            catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                (0, log_1.log)('SERVER', `ERRO ao abrir sala: ${errorMsg}`);
                Logger_1.logger.error('Server', `Erro ao abrir sala`, { name, error: errorMsg });
                throw error;
            }
        });
    }
    /**
     * Abre sala consumindo um modulo ESM ja carregado (init executado direto sem VM)
     * @param {object} roomModule - Modulo com metodo init({ room, settings })
     * @param {string|string[]} tokens - Token(s) headless do Haxball
     * @param {string} [name] - Nome da sala (opcional, fallback para roomModule.name)
     * @param {CustomSettings} [settings] - Configuracoes personalizadas
     * @returns {Promise<{link: string, pid: number}>} Info da sala aberta
     */
    async openWithModule(roomModule, tokens, name, settings) {
        return this.withHbInitLock(async () => {
            try {
                const HBInit = await this.getHBInit();
                const tokenArray = Array.isArray(tokens) ? tokens : [tokens];
                // Selecionar melhor token com rotacao automatica
                const token = this.selectBestToken(tokenArray);
                return this.withTokenLock(token, async () => {
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
                    Object.keys(roomConfig).forEach((key) => roomConfig[key] === undefined &&
                        delete roomConfig[key]);
                    // Aguardar cooldown de token para evitar 'Can't init twice'
                    await this.waitTokenCooldown(token);
                    const room = HBInit(roomConfig);
                    this.recordTokenInit(token);
                    const pid = this.nextPid++;
                    // Armazenar instancia (link sera atualizado via onRoomLink)
                    const roomInstance = {
                        room,
                        pid,
                        botName: name || roomModule?.name || 'Unknown',
                        link: 'https://www.haxball.com/headless',
                        createdAt: Date.now(),
                        eventHandlers: new Map(),
                    };
                    this.rooms.set(pid, roomInstance);
                    // Promise para aguardar link da sala
                    const linkPromise = new Promise((resolve) => {
                        const timeout = setTimeout(() => {
                            resolve(roomInstance.link || 'https://www.haxball.com/headless');
                        }, 10000); // Timeout de 10s
                        const originalHandler = room.onRoomLink;
                        room.onRoomLink = (link) => {
                            clearTimeout(timeout);
                            (0, log_1.log)('SERVER', `Sala ESM ${pid} link recebido: ${link}`);
                            roomInstance.link = link;
                            if (link)
                                this.roomsByLink.set(String(link), pid);
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
                            }
                            catch (_) { }
                            roomModule.init({ room, settings: settings || {}, db: this.db });
                        }
                        else {
                            (0, log_1.log)('SERVER', 'Modulo de sala sem init definido');
                        }
                    }
                    catch (error) {
                        const errorMsg = error instanceof Error ? error.message : String(error);
                        (0, log_1.log)('SERVER', `AVISO: Erro ao executar modulo ESM: ${errorMsg.substring(0, 100)}`);
                    }
                    this.setupDefaultEventHandlers(room, pid, name || roomModule?.name);
                    // Aguarda link ficar disponivel
                    const finalLink = await linkPromise;
                    (0, log_1.log)('SERVER', `Sala aberta (ESM) - PID: ${pid}, Nome: ${roomInstance.botName}, Link: ${finalLink}`);
                    Logger_1.logger.info('Server', `Sala aberta ESM`, {
                        pid,
                        name: roomInstance.botName,
                        link: finalLink,
                    });
                    return {
                        link: finalLink,
                        pid,
                    };
                });
            }
            catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                (0, log_1.log)('SERVER', `ERRO ao abrir sala ESM: ${errorMsg}`);
                Logger_1.logger.error('Server', `Erro ao abrir sala ESM`, { name, error: errorMsg });
                throw error;
            }
        });
    }
    /**
     * Fecha uma sala aberta
     * @param {string|number} pidOrTitle - PID da sala ou nome
     * @returns {Promise<boolean>} true se sala foi fechada, false se nao encontrada
     * @example
     * const success = await server.close(1000);
     * if (success) console.log('Sala fechada com sucesso');
     */
    async close(pidOrTitle) {
        const pid = typeof pidOrTitle === 'number' ? pidOrTitle : parseInt(pidOrTitle);
        const instance = this.rooms.get(pid);
        if (!instance) {
            (0, log_1.log)('SERVER', `Sala ${pid} nao encontrada para fechamento`);
            return false;
        }
        try {
            // Parar qualquer anuncio periodico da comunidade para evitar timers vazando
            try {
                stopCommunityAnnouncements(instance?.room);
            }
            catch (_) { }
            // haxball.js nao tem metodo close explicito
            // Remover handlers e deixar garbage collection fazer seu trabalho
            instance.eventHandlers.clear();
            const link = instance.link;
            if (link)
                this.roomsByLink.delete(String(link));
            this.rooms.delete(pid);
            // Tentar force garbage collection se disponivel
            if (global.gc) {
                setImmediate(() => global.gc?.());
            }
            (0, log_1.log)('SERVER', `Sala ${pid} (${instance.botName}) fechada com sucesso`);
            Logger_1.logger.info('Server', `Sala fechada`, { pid, name: instance.botName });
            return true;
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            (0, log_1.log)('SERVER', `ERRO ao fechar sala ${pid}: ${errorMsg}`);
            Logger_1.logger.error('Server', `Erro ao fechar sala`, { pid, error: errorMsg });
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
    async closeAll() {
        const pids = Array.from(this.rooms.keys());
        let closedCount = 0;
        for (const pid of pids) {
            const result = await this.close(pid);
            if (result)
                closedCount++;
        }
        (0, log_1.log)('SERVER', `Todas as salas fechadas: ${closedCount}/${pids.length}`);
        Logger_1.logger.info('Server', `Shutdown completo`, {
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
    getRoom(pid) {
        return this.rooms.get(pid);
    }
    /**
     * Retorna todas as salas abertas
     * @returns {RoomInstance[]} Array de salas abertas
     */
    getAllRooms() {
        return Array.from(this.rooms.values());
    }
    /**
     * Recupera instancia da sala a partir do link (identificador estavel) se existente
     * @param link string
     * @returns RoomInstance | undefined
     */
    getRoomByLink(link) {
        const pid = this.roomsByLink.get(String(link));
        if (pid === undefined)
            return undefined;
        return this.getRoom(pid);
    }
    /**
     * Recupera instancia da sala a partir do objeto room do haxball.js
     * Usa propriedades estaveis como getLink(), link, name ou room.id quando disponivel
     * @param room any
     */
    getRoomByObject(room) {
        if (!room)
            return undefined;
        try {
            const link = room.getLink?.() || room.link || room.name || room.id;
            if (!link)
                return undefined;
            return this.getRoomByLink(String(link));
        }
        catch (_) {
            return undefined;
        }
    }
    /**
     * Retorna numero de salas abertas
     * @returns {number} Quantidade de salas
     */
    getRoomCount() {
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
    executeBotScript(room, script, settings, db, scriptPath) {
        try {
            // Garantir que anuncios da comunidade anteriores sejam interrompidos antes de (re)carregar o script
            try {
                stopCommunityAnnouncements(room);
            }
            catch (_) { }
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
                    const absoluteScriptPath = path_1.default.isAbsolute(scriptPath)
                        ? scriptPath
                        : path_1.default.resolve(process.cwd(), scriptPath);
                    (0, log_1.log)('SERVER', `Carregando script: ${absoluteScriptPath}`);
                    // Limpar cache se existir
                    if (require.cache[absoluteScriptPath]) {
                        delete require.cache[absoluteScriptPath];
                    }
                    // Injetar contexto global antes de carregar
                    globalThis.room = room;
                    globalThis.customSettings = settings || {};
                    globalThis.db = safeDb;
                    globalThis.HBInit = (_config) => room;
                    // Executar o script com require nativo
                    try {
                        require(absoluteScriptPath);
                        (0, log_1.log)('SERVER', `Bot script carregado com sucesso: ${path_1.default.basename(absoluteScriptPath)}`);
                    }
                    catch (innerError) {
                        // Capturar stack trace completo para debugging
                        if (innerError instanceof Error && innerError.stack) {
                            (0, log_1.log)('SERVER', `Stack trace completo: ${innerError.stack}`);
                        }
                        throw innerError;
                    }
                }
                catch (requireError) {
                    (0, log_1.log)('SERVER', `Erro ao carregar script: ${requireError instanceof Error ? requireError.message : String(requireError)}`);
                    // Se require falhou, lancar o erro original ao inves de tentar eval
                    // eval nao consegue resolver requires de modulos externos
                    const errorDetails = requireError instanceof Error ? requireError.message : String(requireError);
                    throw new Error(`Falha ao carregar script via require: ${errorDetails}. Script precisa ser um modulo CJS valido.`);
                }
                finally {
                    // Limpar injecoes globais
                    delete globalThis.room;
                    delete globalThis.customSettings;
                    delete globalThis.db;
                    delete globalThis.HBInit;
                }
            }
            else {
                // Fallback para eval se nao temos caminho
                globalThis.room = room;
                globalThis.customSettings = settings || {};
                globalThis.db = safeDb;
                globalThis.HBInit = (_config) => room;
                eval(script);
                (0, log_1.log)('SERVER', 'Bot script carregado e executado com sucesso');
            }
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            (0, log_1.log)('SERVER', `AVISO: Erro ao executar script bot: ${errorMsg}`);
            // Nao lancar erro - permitir que sala continue funcionando
        }
        finally {
            // Limpar globais injetados
            delete globalThis.room;
            delete globalThis.customSettings;
            delete globalThis.db;
            delete globalThis.HBInit;
        }
    }
    /**
     * Aplica event handlers padrao para logging e monitoramento
     * @private
     * @param {any} room - Objeto de sala
     * @param {number} pid - ID da sala
     * @param {string} [_botName] - Nome do bot (para futuro uso em logging)
     */
    setupDefaultEventHandlers(room, pid, _botName) {
        try {
            // Evento: Link da sala disponivel
            // Nao sobrescrever se ja foi configurado na Promise de link
            const hasLinkHandler = room.onRoomLink && typeof room.onRoomLink === 'function';
            if (!hasLinkHandler && room.onRoomLink !== undefined) {
                const originalHandler = room.onRoomLink;
                room.onRoomLink = (link) => {
                    (0, log_1.log)('SERVER', `Sala ${pid} link atualizado: ${link}`);
                    // Atualiza indice por link para manter chave estavel
                    const inst = this.getRoom(pid);
                    if (inst) {
                        if (inst.link)
                            this.roomsByLink.delete(String(inst.link));
                        inst.link = link;
                        if (link)
                            this.roomsByLink.set(String(link), pid);
                    }
                    if (typeof originalHandler === 'function') {
                        originalHandler.call(room, link);
                    }
                };
            }
            // Evento: Jogador entrou
            if (room.onPlayerJoin) {
                const originalHandler = room.onPlayerJoin;
                room.onPlayerJoin = (player) => {
                    (0, log_1.log)('SERVER', `Sala ${pid}: Jogador entrou - ${player?.name || 'Unknown'}`);
                    if (typeof originalHandler === 'function') {
                        originalHandler.call(room, player);
                    }
                };
            }
            // Evento: Jogador saiu
            if (room.onPlayerLeave) {
                const originalHandler = room.onPlayerLeave;
                room.onPlayerLeave = (player) => {
                    (0, log_1.log)('SERVER', `Sala ${pid}: Jogador saiu - ${player?.name || 'Unknown'}`);
                    if (typeof originalHandler === 'function') {
                        originalHandler.call(room, player);
                    }
                };
            }
            // Evento: Jogo comecou
            if (room.onGameStart) {
                const originalHandler = room.onGameStart;
                room.onGameStart = () => {
                    (0, log_1.log)('SERVER', `Sala ${pid}: Jogo iniciado`);
                    if (typeof originalHandler === 'function') {
                        originalHandler.call(room);
                    }
                };
            }
            // Evento: Jogo parou
            if (room.onGameStop) {
                const originalHandler = room.onGameStop;
                room.onGameStop = (byPlayer) => {
                    (0, log_1.log)('SERVER', `Sala ${pid}: Jogo parado`);
                    if (typeof originalHandler === 'function') {
                        originalHandler.call(room, byPlayer);
                    }
                };
            }
            (0, log_1.log)('SERVER', `Sala ${pid}: Event handlers padrao configurados`);
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            (0, log_1.log)('SERVER', `AVISO: Erro ao configurar handlers: ${errorMsg}`);
        }
    }
}
exports.Server = Server;
//    __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
//# sourceMappingURL=Server.js.map