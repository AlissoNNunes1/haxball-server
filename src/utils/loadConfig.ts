import { promises as fs } from "fs";
import path from "path";

import { HaxballServerConfig } from "../Global";

/**
 * Valida se um objeto e uma configuracao Haxball valida
 * Verifica presenca obrigatoria de server e panel
 * @param {unknown} object - Objeto a validar
 * @returns {boolean} true se objeto e uma HaxballServerConfig valida
 * @private
 */
function validate(object: unknown): object is HaxballServerConfig {
    if (!object || typeof object !== 'object') return false;
    const config = object as Record<string, unknown>;
    if (!config.server || typeof config.server !== 'object') return false;
    if (!config.panel || typeof config.panel !== 'object') return false;

    return true;
}

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
export async function loadConfig(file?: string): Promise<HaxballServerConfig> {
    const filePath = file == null || file == "" ? path.resolve(path.resolve('.'), "config.json") : file;

    try {
        const data = await fs.readFile(filePath, { encoding: "utf-8" });
        const json = JSON.parse(data);

        if (!validate(json)) {
            throw {
                message: `Invalid configuration`,
                error: null
            };
        }

        return json;
    } catch (err) {
        if (err && typeof err === 'object' && 'message' in err && err.message === 'Invalid configuration') {
            throw err;
        }
        
        throw {
            message: `Error while loading or parsing config file`,
            error: err
        };
    }
}

//    __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/