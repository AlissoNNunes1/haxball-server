/**
 * Encontra uma porta disponivel a partir da porta fornecida
 * NOTA: Implementacao temporaria que retorna a porta fornecida
 * TODO: Implementar verificacao real de disponibilidade na Fase 8
 * @param {number} startingPort - Porta inicial para busca
 * @returns {Promise<number>} Promessa que resolve com a porta disponivel
 * @deprecated Sera removido na migracao para haxball.js
 * @example
 * const port = await getAvailablePort(9500);
 * console.log(port); // 9500 (sem verificacao)
 */
export async function getAvailablePort(startingPort: number): Promise<number> {
  // Retorna a porta fornecida sem verificacao
  // TODO: Implementar verificacao real na Phase 8 com haxball.js
  return startingPort;
}

//    __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/

//    __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
