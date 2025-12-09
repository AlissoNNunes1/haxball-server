import { maxLengthLog } from "../Global";

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
export function log(prefix: string, message: string) {
    const timestamp = new Date().toLocaleTimeString("pt-BR");

    if (message.length > maxLengthLog) {
        message = message.slice(0, maxLengthLog) + "...";
    }

    console.log(`[${timestamp}] [${prefix}] ${message}`);
}

//    __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/