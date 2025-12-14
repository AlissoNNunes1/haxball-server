import { HaxballServerConfig } from '../Global';
/**
 * Carrega e valida arquivo de configuracao JSON
 * Se arquivo nao for especificado, procura por config.json no diretorio atual
 * @param {string} [file] - Caminho do arquivo de configuracao (opcional)
 * @returns {Promise<HaxballServerConfig>} Configuracao carregada e validada
 * @throws {Object} Erro com mensagem descritiva e detalhes do erro original
 * @example
 * const config = await loadConfig('./config.json');
 * console.log(config.server.execPath);
 */
export declare function loadConfig(file?: string): Promise<HaxballServerConfig>;
