/**
 * Gerenciador de instancias de servidores Haxball com haxball.js
 * Implementacao moderna usando WebRTC nativo sem necessidade de Chrome/Chromium
 * IMPORTANTE: Cada sala roda em processo Node.js separado para evitar "Can't init twice"
 * @module Server
 * @version 6.0.0 (Fase 8 - Migracao haxball.js + Child Processes)
 */
import { ChildProcess } from 'child_process';
import { CustomSettings, ServerConfig } from './Global';
/**
 * Representa uma instancia de sala Haxball aberta
 * @interface RoomInstance
 * @property {ChildProcess} process - Processo filho que executa a sala
 * @property {number} pid - ID do processo filho
 * @property {string} botName - Nome do bot que abriu a sala
 * @property {string} link - Link de acesso da sala
 * @property {number} createdAt - Timestamp de criacao
 * @property {string} token - Token usado pela sala
 */
export interface RoomInstance {
    process: ChildProcess;
    pid: number;
    botName: string;
    link: string;
    createdAt: number;
    token?: string;
    room?: any;
    eventHandlers?: Map<string, Function>;
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
    process?: () => {
        pid?: number;
    } | null;
    pages?: () => Promise<unknown[]>;
}
/**
 * Gerenciador de salas Haxball usando child processes
 * Cada sala roda em processo separado para evitar "Can't init twice"
 * @class Server
 */
export declare class Server {
    private rooms;
    private roomsByLink;
    private nextPid;
    private proxyServers;
    private db;
    private workerPath;
    /**
     * Compatibilidade com codigo antigo que acessa browsers array
     * @deprecated Use rooms Map diretamente
     */
    get browsers(): BrowserInfo[];
    /**
     * Retorna o cliente DB (se inicializado)
     */
    getDb(): any;
    /**
     * Inicializa o gerenciador de salas Haxball
     * @param {ServerConfig} config - Configuracao do servidor
     */
    constructor(config: ServerConfig, db?: any);
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
    open(script: string, tokens: string | string[], name?: string, settings?: CustomSettings, scriptPath?: string): Promise<{
        link: string;
        pid: number;
        remotePort?: number;
    } | null>;
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
    openWithModule(_roomModule: {
        init?: ({ room, settings, db }: {
            room: any;
            settings?: CustomSettings;
            db?: any;
        }) => any;
        name?: string;
    }, _tokens: string | string[], _name?: string, _settings?: CustomSettings): Promise<{
        link: string;
        pid: number;
        remotePort?: number;
    } | null>;
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
    close(pidOrTitle: string | number): Promise<boolean>;
    /**
     * Fecha todas as salas abertas
     * Util para shutdown gracioso ou limpeza completa
     * @returns {number} Numero de salas fechadas
     * @example
     * await server.closeAll();
     */
    closeAll(): Promise<number>;
    /**
     * Retorna instancia de sala por PID
     * @param {number} pid - ID da sala
     * @returns {RoomInstance|undefined} Instancia da sala ou undefined
     */
    getRoom(pid: number): RoomInstance | undefined;
    /**
     * Retorna todas as salas abertas
     * @returns {RoomInstance[]} Array de salas abertas
     */
    getAllRooms(): RoomInstance[];
    /**
     * Verifica se um token ja tem uma sala aberta
     * @param token Token a verificar
     * @returns {boolean} true se token ja esta em uso
     */
    isTokenInUse(token: string): boolean;
    /**
     * Retorna a sala aberta com um determinado token, se existir
     * @param token Token a procurar
     * @returns {RoomInstance | undefined} Sala aberta com esse token ou undefined
     */
    getRoomByToken(token: string): RoomInstance | undefined;
    /**
     * Recupera instancia da sala a partir do link (identificador estavel) se existente
     * @param link string
     * @returns RoomInstance | undefined
     */
    getRoomByLink(link: string): RoomInstance | undefined;
    /**
     * Recupera instancia da sala a partir do objeto room do haxball.js
     * Usa propriedades estaveis como getLink(), link, name ou room.id quando disponivel
     * @param room any
     */
    getRoomByObject(room: any): RoomInstance | undefined;
    /**
     * Retorna numero de salas abertas
     * @returns {number} Quantidade de salas
     */
    getRoomCount(): number;
}
