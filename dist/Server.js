"use strict";
/**
 * Gerenciador de instancias de servidores Haxball com haxball.js
 * Implementacao moderna usando WebRTC nativo sem necessidade de Chrome/Chromium
 * IMPORTANTE: Cada sala roda em processo Node.js separado para evitar "Can't init twice"
 * @module Server
 * @version 6.0.0 (Fase 8 - Migracao haxball.js + Child Processes)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Server = void 0;
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const auth_client_1 = require("./database/auth-client");
const log_1 = require("./utils/log");
const Logger_1 = require("./utils/Logger");
/**
 * Gerenciador de salas Haxball usando child processes
 * Cada sala roda em processo separado para evitar "Can't init twice"
 * @class Server
 */
class Server {
    rooms = new Map();
    roomsByLink = new Map();
    nextPid = 1000;
    proxyServers;
    db = null;
    // Caminho do worker que sera executado como processo filho
    workerPath;
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
     */
    constructor(config, db) {
        this.proxyServers = config.proxyServers ?? [];
        this.db = db ?? null;
        this.workerPath = path_1.default.join(__dirname, 'RoomWorker.js');
        // Inicializar Auth DB se ainda nao foi inicializado
        try {
            (0, auth_client_1.initAuthDb)();
            (0, log_1.log)('SERVER', `Auth DB inicializado`);
        }
        catch (error) {
            const err = error instanceof Error ? error.message : String(error);
            (0, log_1.log)('SERVER', `AVISO: Erro ao inicializar Auth DB: ${err}`);
        }
        (0, log_1.log)('SERVER', `Inicializando gerenciador de salas Haxball (Child Process Architecture)`);
        (0, log_1.log)('SERVER', `Worker path: ${this.workerPath}`);
        (0, log_1.log)('SERVER', `Proxies habilitados: ${config.proxyEnabled ? 'SIM' : 'NAO'}`);
        if (this.proxyServers.length > 0) {
            (0, log_1.log)('SERVER', `Servidores proxy disponiveis: ${this.proxyServers.length}`);
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
    /**
     * Abre uma sala Haxball em processo separado (child process)
     * Resolve problema "Can't init twice" do haxball.js
     * @param {string} script - Script do bot (nao usado no modo fork, apenas scriptPath)
     * @param {string|string[]} tokens - Token(s) headless do Haxball
     * @param {string} [name] - Nome da sala
     * @param {CustomSettings} [settings] - Configuracoes personalizadas
     * @param {string} [scriptPath] - Caminho do script do bot
     * @returns {Promise<{link: string, pid: number}>} Info da sala aberta
     */
    async open(script, tokens, name, settings, scriptPath) {
        try {
            const tokenArray = Array.isArray(tokens) ? tokens : [tokens];
            const token = tokenArray[0]; // Usa primeiro token (simplificado)
            // Verificar se token ja esta em uso
            if (this.isTokenInUse(token)) {
                throw new Error(`Token ja esta sendo usado por outra sala`);
            }
            const pid = this.nextPid++;
            (0, log_1.log)('SERVER', `Iniciando processo para sala ${pid} (${name})`);
            // Criar processo filho executando RoomWorker
            const childProcess = (0, child_process_1.fork)(this.workerPath, [], {
                stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
                env: {
                    ...process.env,
                    ROOM_PID: String(pid),
                },
            });
            // Criar instancia temporaria
            const roomInstance = {
                process: childProcess,
                pid,
                botName: name || 'Unknown',
                link: 'https://www.haxball.com/headless',
                createdAt: Date.now(),
                token,
            };
            this.rooms.set(pid, roomInstance);
            // Promise para aguardar link do worker
            const linkPromise = new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Timeout aguardando link da sala (60s)'));
                }, 60000); // 60s timeout
                childProcess.on('message', (message) => {
                    if (message.type === 'link') {
                        clearTimeout(timeout);
                        const link = message.data.link;
                        roomInstance.link = link;
                        if (link)
                            this.roomsByLink.set(String(link), pid);
                        (0, log_1.log)('SERVER', `Sala ${pid} link recebido: ${link}`);
                        resolve(link);
                    }
                    else if (message.type === 'error') {
                        clearTimeout(timeout);
                        reject(new Error(message.data.error));
                    }
                });
                childProcess.on('error', (error) => {
                    clearTimeout(timeout);
                    reject(error);
                });
                childProcess.on('exit', (code) => {
                    if (code !== 0 && code !== null) {
                        clearTimeout(timeout);
                        reject(new Error(`Worker process exited with code ${code}`));
                    }
                });
            });
            // Enviar mensagem de inicializacao para o worker
            childProcess.send({
                type: 'init',
                data: {
                    script,
                    scriptPath,
                    token,
                    name,
                    settings,
                    pid,
                },
            });
            // Aguardar link ficar disponivel
            const finalLink = await linkPromise;
            (0, log_1.log)('SERVER', `Sala aberta - PID: ${pid}, Nome: ${name}, Link: ${finalLink}`);
            Logger_1.logger.info('Server', `Sala aberta`, { pid, name, link: finalLink });
            return {
                link: finalLink,
                pid,
            };
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            (0, log_1.log)('SERVER', `ERRO ao abrir sala: ${errorMsg}`);
            Logger_1.logger.error('Server', `Erro ao abrir sala`, { name, error: errorMsg });
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
    /**
     * METODO DEPRECATED: openWithModule nao e suportado com child process architecture
     * Use open() com script de bot ao inves disso
     */
    async openWithModule(_roomModule, _tokens, _name, _settings) {
        (0, log_1.log)('SERVER', 'AVISO: openWithModule esta deprecated com child process architecture. Use open() com script de bot.');
        throw new Error('openWithModule nao e suportado com child process architecture. Use open() com script de bot.');
    }
    /**
     * Fecha uma sala aberta
     * @param {string|number} pidOrTitle - PID da sala ou nome
     * @returns {Promise<boolean>} true se sala foi fechada, false se nao encontrada
     * @example
     * const success = await server.close(1000);
     * if (success) console.log('Sala fechada com sucesso');
     */
    /**
     * Fecha uma sala aberta (encerra o processo filho)
     * @param {string|number} pidOrTitle - PID da sala
     * @returns {Promise<boolean>} true se sala foi fechada
     */
    async close(pidOrTitle) {
        const pid = typeof pidOrTitle === 'number' ? pidOrTitle : parseInt(pidOrTitle);
        const instance = this.rooms.get(pid);
        if (!instance) {
            (0, log_1.log)('SERVER', `Sala ${pid} nao encontrada para fechamento`);
            return false;
        }
        try {
            const link = instance.link;
            if (link)
                this.roomsByLink.delete(String(link));
            this.rooms.delete(pid);
            // Enviar mensagem de close para o worker
            if (instance.process && !instance.process.killed) {
                instance.process.send({ type: 'close' });
                // Aguardar um pouco para processo encerrar graciosamente
                await new Promise((resolve) => setTimeout(resolve, 1000));
                // Se ainda nao morreu, forcar
                if (!instance.process.killed) {
                    instance.process.kill('SIGTERM');
                }
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
     * Verifica se um token ja tem uma sala aberta
     * @param token Token a verificar
     * @returns {boolean} true se token ja esta em uso
     */
    isTokenInUse(token) {
        return Array.from(this.rooms.values()).some((room) => room.token === token);
    }
    /**
     * Retorna a sala aberta com um determinado token, se existir
     * @param token Token a procurar
     * @returns {RoomInstance | undefined} Sala aberta com esse token ou undefined
     */
    getRoomByToken(token) {
        return Array.from(this.rooms.values()).find((room) => room.token === token);
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
}
exports.Server = Server;
//    __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
//# sourceMappingURL=Server.js.map