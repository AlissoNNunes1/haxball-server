"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
/**
 * Valida se um objeto e uma configuracao Haxball valida
 * Verifica presenca obrigatoria de server e panel
 * @param {unknown} object - Objeto a validar
 * @returns {boolean} true se objeto e uma HaxballServerConfig valida
 * @private
 */
function validate(object) {
    if (!object || typeof object !== 'object')
        return false;
    const config = object;
    if (!config.server || typeof config.server !== 'object')
        return false;
    if (!config.panel || typeof config.panel !== 'object')
        return false;
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
async function loadConfig(file) {
    const filePath = file == null || file == '' ? path_1.default.resolve(path_1.default.resolve('.'), 'config.json') : file;
    try {
        const data = await fs_1.promises.readFile(filePath, { encoding: 'utf-8' });
        const json = JSON.parse(data);
        if (!validate(json)) {
            throw {
                message: `Invalid configuration`,
                error: null,
            };
        }
        return json;
    }
    catch (err) {
        if (err &&
            typeof err === 'object' &&
            'message' in err &&
            err.message === 'Invalid configuration') {
            throw err;
        }
        throw {
            message: `Error while loading or parsing config file`,
            error: err,
        };
    }
}
//    __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
//# sourceMappingURL=loadConfig.js.map