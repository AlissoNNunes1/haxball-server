"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openServer = openServer;
const Server_1 = require("../Server");
const ControlPanel_1 = require("../ControlPanel");
const RoomMonitor_1 = require("../debugging/RoomMonitor");
const WebMonitor_1 = require("../debugging/WebMonitor");
const Logger_1 = require("../utils/Logger");
const loadConfig_1 = require("../utils/loadConfig");
/**
 * Abre um servidor Haxball com base em arquivo de configuracao
 * Carrega configuracoes, inicializa servidor e painel Discord
 * Em caso de erro, exibe mensagem e encerra processo
 * @async
 * @param {string} [file] - Caminho do arquivo config.json (opcional)
 * @returns {Promise<void>}
 * @throws {process.exit} Encerra com codigo 1 se erro na configuracao
 * @example
 * await openServer('./config.json');
 * // Inicia servidor com configuracoes do arquivo
 */
async function openServer(file) {
    try {
        const config = await (0, loadConfig_1.loadConfig)(file);
        const server = new Server_1.Server(config.server);
        const roomMonitor = new RoomMonitor_1.RoomMonitor();
        Logger_1.logger.info('OpenServer', 'Servidor inicializado', {
            hasPanel: !!config.panel,
            proxyEnabled: config.server?.proxyEnabled
        });
        // Iniciar WebMonitor se configurado
        const webMonitorPort = (config.panel?.webMonitor?.port || 3000);
        void new WebMonitor_1.WebMonitor(roomMonitor, {
            port: webMonitorPort,
            host: (config.panel?.webMonitor?.host || 'localhost')
        });
        Logger_1.logger.info('OpenServer', 'Web Monitor iniciado', { port: webMonitorPort });
        new ControlPanel_1.ControlPanel(server, config.panel, file);
    }
    catch (err) {
        const errorMessage = err && typeof err === 'object' && 'message' in err
            ? String(err.message)
            : 'Unknown error';
        const hasError = err && typeof err === 'object' && 'error' in err;
        Logger_1.logger.error('OpenServer', 'Erro ao inicializar servidor', { error: errorMessage });
        console.error(hasError ? `${errorMessage}, ${err.error}` : errorMessage);
        process.exit(1);
    }
}
//    __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
//# sourceMappingURL=openServer.js.map