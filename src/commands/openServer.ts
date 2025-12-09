import { Server } from '../Server';
import { ControlPanel } from '../ControlPanel';
import { RoomMonitor } from '../debugging/RoomMonitor';
import { WebMonitor } from '../debugging/WebMonitor';
import { logger } from '../utils/Logger';

import { loadConfig } from '../utils/loadConfig';

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
export async function openServer(file?: string): Promise<void> {
  try {
    const config = await loadConfig(file);
    const server = new Server(config.server);
    const roomMonitor = new RoomMonitor();

    logger.info('OpenServer', 'Servidor inicializado', {
      hasPanel: !!config.panel,
      proxyEnabled: config.server?.proxyEnabled,
    });

    // Iniciar WebMonitor se configurado
    const webMonitorPort = (config.panel?.webMonitor?.port || 3000) as number;
    void new WebMonitor(roomMonitor, {
      port: webMonitorPort,
      host: (config.panel?.webMonitor?.host || 'localhost') as string,
    });

    logger.info('OpenServer', 'Web Monitor iniciado', { port: webMonitorPort });

    new ControlPanel(server, config.panel, file);
  } catch (err: unknown) {
    const errorMessage =
      err && typeof err === 'object' && 'message' in err
        ? String((err as { message: unknown }).message)
        : 'Unknown error';
    const hasError = err && typeof err === 'object' && 'error' in err;

    logger.error('OpenServer', 'Erro ao inicializar servidor', { error: errorMessage });

    console.error(
      hasError ? `${errorMessage}, ${(err as { error: unknown }).error}` : errorMessage
    );
    process.exit(1);
  }
}

//    __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
