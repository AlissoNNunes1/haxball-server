"use strict";
/**
 * Gerenciador de instancias de servidores Haxball headless
 * NOTA: Implementacao stub com Puppeteer deprecado
 * Sera completamente reescrita na Fase 8 com haxball.js
 * @deprecated Usar haxball.js em v6.0.0
 * @module Server
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Server = void 0;
/**
 * Classe para gerenciar servidores Haxball
 * Atualmente um stub que dispara erro, aguardando migracao para haxball.js
 * @class Server
 * @deprecated Sera substituida por implementacao com haxball.js em v6.0.0
 */
class Server {
    browsers = [];
    /**
     * Inicializa o gerenciador de servidores
     * @param {ServerConfig} _config - Configuracao do servidor
     * @throws Aviso de deprecacao na inicializacao
     */
    constructor(_config) {
        console.warn('='.repeat(80));
        console.warn('WARNING: Server.ts uses deprecated Puppeteer implementation');
        console.warn('Room management is disabled until Phase 8 migration to haxball.js');
        console.warn('='.repeat(80));
    }
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
    async open(_script, _tokens, _name, _settings) {
        throw new Error('Puppeteer-based room opening is deprecated.\\n' +
            'This functionality will be restored in Phase 8 with haxball.js implementation.\\n' +
            'For now, this is a compilation stub only.');
    }
    /**
     * Fecha uma sala aberta
     * @param {string|number} _pidOrTitle - PID do processo ou nome da sala
     * @returns {Promise<boolean>} false em todas as chamadas (funcionalidade desativada)
     * @deprecated Usar haxball.js em v6.0.0
     */
    async close(_pidOrTitle) {
        console.warn('Room close functionality deprecated until Phase 8');
        return false;
    }
}
exports.Server = Server;
//    __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
//# sourceMappingURL=Server.js.map