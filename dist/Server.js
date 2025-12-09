"use strict";
/**
 * Gerenciador de instancias de servidores Haxball com haxball.js
 * Implementacao moderna usando WebRTC nativo sem necessidade de Chrome/Chromium
 * @module Server
 * @version 6.0.0 (Fase 8 - Migracao haxball.js)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Server = void 0;
const haxball_js_1 = __importDefault(require("haxball.js"));
const log_1 = require("./utils/log");
/**
 * Gerenciador de salas Haxball usando haxball.js
 * 70-80% reducao de memoria comparado a Puppeteer
 * Sem necessidade de Chrome/Chromium
 * @class Server
 */
class Server {
    rooms = new Map();
    nextPid = 1000;
    proxyServers;
    hbInit = null;
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
     * Inicializa o gerenciador de salas Haxball
     * @param {ServerConfig} config - Configuracao do servidor
     * @throws {Error} Se inicializacao de haxball.js falhar
     */
    constructor(config) {
        this.proxyServers = config.proxyServers ?? [];
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
        if (this.hbInit)
            return this.hbInit;
        try {
            // Nota: HaxballJS nao suporta proxy diretamente
            // Proxy sera tratado a nivel do token headless ou HTTP client
            this.hbInit = await (0, haxball_js_1.default)();
            (0, log_1.log)('SERVER', 'haxball.js inicializado com sucesso');
            return this.hbInit;
        }
        catch (error) {
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
    async open(script, tokens, name, settings) {
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
                public: settings?.['reserved.haxball.public'] !== false
                    ? true
                    : false,
                noPlayer: settings?.['reserved.haxball.noPlayer'] !== false
                    ? true
                    : false,
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
            // Gerar PID ficticio para compatibilidade
            const pid = this.nextPid++;
            // Executa script do bot
            this.executeBotScript(room, script, settings);
            // Aplicar event handlers padrao
            this.setupDefaultEventHandlers(room, pid, name);
            // Armazenar instancia
            const roomInstance = {
                room,
                pid,
                botName: name || 'Unknown',
                link: room.getLink?.() || 'https://www.haxball.com/headless',
                createdAt: Date.now(),
                eventHandlers: new Map(),
            };
            this.rooms.set(pid, roomInstance);
            (0, log_1.log)('SERVER', `Sala aberta - PID: ${pid}, Nome: ${name}, Link: ${roomInstance.link}`);
            return {
                link: roomInstance.link,
                pid,
            };
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            (0, log_1.log)('SERVER', `ERRO ao abrir sala: ${errorMsg}`);
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
    async close(pidOrTitle) {
        const pid = typeof pidOrTitle === 'number' ? pidOrTitle : parseInt(pidOrTitle);
        const instance = this.rooms.get(pid);
        if (!instance) {
            (0, log_1.log)('SERVER', `Sala ${pid} nao encontrada para fechamento`);
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
            (0, log_1.log)('SERVER', `Sala ${pid} (${instance.botName}) fechada com sucesso`);
            return true;
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            (0, log_1.log)('SERVER', `ERRO ao fechar sala ${pid}: ${errorMsg}`);
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
     * @param {string} script - Codigo JavaScript do bot
     * @param {CustomSettings} [settings] - Configuracoes disponidas no contexto
     */
    executeBotScript(room, script, settings) {
        try {
            // Contexto disponivel ao script
            const context = {
                room,
                customSettings: settings || {},
                console: console,
            };
            // Usar vm para executar com isolamento
            const vm = require('vm');
            vm.runInNewContext(script, context, {
                filename: 'bot-script',
                timeout: 5000,
            });
            (0, log_1.log)('SERVER', 'Script bot carregado e executado com sucesso');
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            (0, log_1.log)('SERVER', `AVISO: Erro ao executar script bot: ${errorMsg.substring(0, 100)}`);
            // Nao lancar erro - permitir que sala continue funcionando
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
            if (room.onRoomLink) {
                const originalHandler = room.onRoomLink;
                room.onRoomLink = (link) => {
                    (0, log_1.log)('SERVER', `Sala ${pid} link atualizado: ${link}`);
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