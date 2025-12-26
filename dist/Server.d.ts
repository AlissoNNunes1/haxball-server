/**
 * Gerenciador de instancias de servidores Haxball com haxball.js
 * Implementacao moderna usando WebRTC nativo sem necessidade de Chrome/Chromium
 * @module Server
 * @version 6.0.0 (Fase 8 - Migracao haxball.js)
 */
import { CustomSettings, ServerConfig } from './Global';
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
    process?: () => {
        pid?: number;
    } | null;
    pages?: () => Promise<unknown[]>;
}
/**
 * Gerenciador de salas Haxball usando haxball.js
 * 70-80% reducao de memoria comparado a Puppeteer
 * Sem necessidade de Chrome/Chromium
 * @class Server
 */
export declare class Server {
    private rooms;
    private roomsByLink;
    private nextPid;
    private proxyServers;
    private db;
    private hbInitInstance;
    private hbInitPromise;
    private tokenInitTimes;
    private tokenLocks;
    private readonly TOKEN_INIT_COOLDOWN;
    private hbInitLock;
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
     * @throws {Error} Se inicializacao de haxball.js falhar
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
    private getHBInit;
    /**
     * Executa a inicializacao real do haxball.js
     * @private
     */
    private initializeHBInit;
    /**
     * Aguarda cooldown antes de reutilizar um token
     * Evita erro "Can't init twice" do haxball.js
     * @private
     * @param {string} token - Token headless
     */
    private waitTokenCooldown;
    /**
     * Registra tempo de inicializacao de um token
     * @private
     * @param {string} token - Token headless
     */
    private recordTokenInit;
    /**
     * Serializa uso do mesmo token para evitar init concorrente
     */
    private withTokenLock;
    /**
     * Serializa execucao critica de HBInit para evitar condicao de corrida "Can't init twice"
     * @private
     */
    private withHbInitLock;
    /**
     * Seleciona o melhor token para usar
     * Suporta ilimitadas salas com o mesmo token (serializadas via lock)
     * Distribui entre multiplos tokens se disponivel
     * @private
     * @param {string[]} tokenArray - Array de tokens disponiveis
     * @returns {string} Token selecionado
     */
    private selectBestToken;
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
    openWithModule(roomModule: {
        init?: ({ room, settings, db }: {
            room: any;
            settings?: CustomSettings;
            db?: any;
        }) => any;
        name?: string;
    }, tokens: string | string[], name?: string, settings?: CustomSettings): Promise<{
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
    /**
     * Executa script do bot no contexto da sala
     * @private
     * @param {any} room - Objeto de sala
     * @param {string} script - Codigo JavaScript do bot (caminho ou conteudo)
     * @param {CustomSettings} [settings] - Configuracoes disponidas no contexto
     * @param {string} [scriptPath] - Caminho do script para require
     */
    private executeBotScript;
    /**
     * Aplica event handlers padrao para logging e monitoramento
     * @private
     * @param {any} room - Objeto de sala
     * @param {number} pid - ID da sala
     * @param {string} [_botName] - Nome do bot (para futuro uso em logging)
     */
    private setupDefaultEventHandlers;
}
