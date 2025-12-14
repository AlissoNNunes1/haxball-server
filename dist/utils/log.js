"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = log;
const Global_1 = require("../Global");
/**
 * Registra mensagem no console com timestamp e prefixo
 * Trunca mensagens maiores que maxLengthLog caracteres
 * @param {string} prefix - Prefixo da mensagem (ex: 'DISCORD', 'SERVER')
 * @param {string} message - Mensagem a registrar
 * @returns {void}
 * @example
 * log('SERVER', 'Sala aberta com sucesso');
 * // Saida: [14:30:45] [SERVER] Sala aberta com sucesso
 */
function log(prefix, message) {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    if (message.length > Global_1.maxLengthLog) {
        message = message.slice(0, Global_1.maxLengthLog) + '...';
    }
    console.log(`[${timestamp}] [${prefix}] ${message}`);
}
//    __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
//# sourceMappingURL=log.js.map