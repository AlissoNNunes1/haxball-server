// Comando CLI para gerenciar tokens Haxball

import { TokenService } from '../utils/TokenService';

/**
 * Comando para gerenciar tokens do Haxball
 */
export async function tokenCommand(args: string[]): Promise<void> {
  const tokenService = new TokenService();

  if (args.length === 0) {
    console.log('\n=== GERENCIADOR DE TOKENS HAXBALL ===\n');
    console.log('Uso: haxball-server token <subcomando>');
    console.log('\nSubcomandos:');
    console.log('  add <token>     Adiciona token ao cache');
    console.log('  show            Exibe token em cache (se existir)');
    console.log('  status          Verifica status do cache');
    console.log('  clear           Remove token do cache');
    console.log('  help            Exibe instrucoes para obter token');
    console.log('\nExemplo:');
    console.log('  haxball-server token add thr1.AAAAAGWZZ6...');
    console.log('  haxball-server token status\n');
    return;
  }

  const subcommand = args[0].toLowerCase();

  switch (subcommand) {
    case 'add':
      if (args.length < 2) {
        console.error('Erro: Token nao fornecido');
        console.log('Uso: haxball-server token add <SEU_TOKEN>');
        return;
      }
      try {
        tokenService.addToken(args[1]);
        console.log('✓ Token adicionado com sucesso ao cache!');
      } catch (error) {
        console.error('Erro ao adicionar token:', (error as Error).message);
      }
      break;

    case 'show':
      {
        const token = tokenService.getCachedToken();
        if (token) {
          console.log('\nToken em cache:');
          console.log(token);
          console.log();
        } else {
          console.log('\nNenhum token valido em cache');
          console.log('Use: haxball-server token help\n');
        }
      }
      break;

    case 'status':
      {
        const status = tokenService.getCacheStatus();
        console.log('\n=== STATUS DO CACHE ===\n');
        if (status.hasToken) {
          console.log('✓ Token disponivel');
          console.log('Expira em:', Math.floor(status.expiresIn! / (24 * 60 * 60 * 1000)), 'dias');
          console.log('Data de expiracao:', status.expiresAt!.toLocaleString('pt-BR'));
        } else {
          console.log('✗ Nenhum token em cache');
          console.log('Use: haxball-server token help para obter instrucoes');
        }
        console.log();
      }
      break;

    case 'clear':
      tokenService.clearCache();
      console.log('✓ Cache limpo com sucesso\n');
      break;

    case 'help':
    case 'instrucoes':
      tokenService.showInstructions();
      break;

    default:
      console.error('Subcomando invalido:', subcommand);
      console.log('Use: haxball-server token (sem parametros) para ver ajuda');
  }
}

//   __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
