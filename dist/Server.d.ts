/**
 * Gerenciador de instancias de servidores Haxball headless
 * NOTA: Implementacao stub com Puppeteer deprecado
 * Sera completamente reescrita na Fase 8 com haxball.js
 * @deprecated Usar haxball.js em v6.0.0
 * @module Server
 */
import { CustomSettings, ServerConfig } from './Global';
/**
 * Informacoes sobre instancia de navegador
 * @interface BrowserInfo
 * @property {number} pid - ID do processo do navegador
 * @property {string} link - Link de acesso da sala
 * @property {number} [remotePort] - Porta de debugging remoto (opcional)
 * @property {Function} [process] - Funcao retornando processo (opcional)
 * @property {Function} [pages] - Funcao retornando paginas abertas (opcional)
 * @deprecated Interface sera removida em v6.0.0
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
 * Classe para gerenciar servidores Haxball
 * Atualmente um stub que dispara erro, aguardando migracao para haxball.js
 * @class Server
 * @deprecated Sera substituida por implementacao com haxball.js em v6.0.0
 */
export declare class Server {
    browsers: BrowserInfo[];
    /**
     * Inicializa o gerenciador de servidores
     * @param {ServerConfig} _config - Configuracao do servidor
     * @throws Aviso de deprecacao na inicializacao
     */
    constructor(_config: ServerConfig);
    /**
     * Abre uma nova sala Haxball com script e token fornecidos
     * @param {string} _script - Script bot a executar
     * @param {string|string[]} _tokens - Token(ns) headless do Haxball
     * @param {string} [_name] - Nome da sala (opcional)
     * @param {CustomSettings} [_settings] - Configuracoes personalizadas (opcional)
     * @returns {Promise<{link: string, pid: number, remotePort?: number}|null>} Informacoes da sala ou null
     * @throws {Error} Sempre dispara erro indicando funcionalidade removida
     * @deprecated Usar haxball.js em v6.0.0
     */
    open(_script: string, _tokens: string | string[], _name?: string, _settings?: CustomSettings): Promise<{
        link: string;
        pid: number;
        remotePort?: number;
    } | null>;
    /**
     * Fecha uma sala aberta
     * @param {string|number} _pidOrTitle - PID do processo ou nome da sala
     * @returns {Promise<boolean>} false em todas as chamadas (funcionalidade desativada)
     * @deprecated Usar haxball.js em v6.0.0
     */
    close(_pidOrTitle: string | number): Promise<boolean>;
}
