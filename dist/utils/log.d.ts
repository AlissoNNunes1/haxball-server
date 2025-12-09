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
export declare function log(prefix: string, message: string): void;
