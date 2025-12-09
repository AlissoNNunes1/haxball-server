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
export declare function openServer(file?: string): Promise<void>;
