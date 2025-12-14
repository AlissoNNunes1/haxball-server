// DEPRECATED: Este arquivo sera removido na migracao para haxball.js
// Por enquanto usa uma implementacao simples sem portscanner

export async function getAvailablePort(startPort: number = 3000): Promise<number> {
  // Implementacao simplificada - retorna porta incrementada
  // TODO: Implementar verificacao real de porta disponivel na Phase 8
  return startPort;
}

//    __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
