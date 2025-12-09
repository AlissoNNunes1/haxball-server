#!/usr/bin/env node

/**
 * Ferramenta de migracao automatica de scripts de bot
 * Adapta scripts escritos para Puppeteer (v4.x) para haxball.js nativo (v5.0.0+)
 *
 * Uso:
 *   node scripts/migrate-bot-scripts.js <arquivo-ou-diretorio>
 *
 * Exemplo:
 *   node scripts/migrate-bot-scripts.js bots/futsal.js
 *   node scripts/migrate-bot-scripts.js bots/
 */

const fs = require('fs');
const path = require('path');

/**
 * Padroes e transformacoes para migracao
 * Define as mudancas automaticas a serem feitas em scripts
 */
const MIGRATIONS = [
  {
    name: 'Remover window.HBInit com HBInit retornado',
    pattern:
      /var\s+room\s*=\s*window\.HBInit\s*\(\s*\{([^}]*?)\}\s*\)\s*;?/gm,
    replacement: '// room e fornecida automaticamente pelo contexto de execucao\n',
  },
  {
    name: 'Remover const room = window.HBInit',
    pattern:
      /const\s+room\s*=\s*window\.HBInit\s*\(\s*\{([^}]*?)\}\s*\)\s*;?/gm,
    replacement: '// room e fornecida automaticamente pelo contexto de execucao\n',
  },
  {
    name: 'Remover let room = window.HBInit',
    pattern:
      /let\s+room\s*=\s*window\.HBInit\s*\(\s*\{([^}]*?)\}\s*\)\s*;?/gm,
    replacement: '// room e fornecida automaticamente pelo contexto de execucao\n',
  },
  {
    name: 'Remover window.HBInit sem atribuicao',
    pattern: /window\.HBInit\s*\(\s*\{([^}]*?)\}\s*\)\s*;?/gm,
    replacement: '',
  },
];

/**
 * Lista de mudancas que nao sao automaticas
 * Usuario deve revisar e fazer manualmente
 */
const MANUAL_CHANGES = [
  {
    name: 'Custom Settings',
    description:
      'Se o script usava custom settings via window.customSettings, adapte para receber como parametro',
    example: `// ANTES: var gameMode = window.customSettings?.gameMode ?? 4;
// DEPOIS: var gameMode = customSettings?.gameMode ?? 4;`,
  },
  {
    name: 'localStorage/sessionStorage',
    description:
      'localStorage nao esta disponivel em haxball.js - use variaveis globais ou arquivos',
    example: `// ANTES: window.localStorage.setItem('key', 'value');
// DEPOIS: global.botState = global.botState || {}; botState.key = 'value';`,
  },
  {
    name: 'Event Handlers com referencia a window',
    description:
      'Callbacks que usam window devem ser adaptados para trabalhar sem browser window',
    example: `// ANTES: window.myCallback = () => {};
// DEPOIS: const myCallback = () => {};`,
  },
];

/**
 * Avalia se um arquivo precisa migracao
 * @param {string} content - Conteudo do arquivo
 * @returns {boolean} true se contem patterns legados
 */
function needsMigration(content) {
  return (
    /window\.HBInit|var\s+room\s*=|const\s+room\s*=|let\s+room\s*=/.test(
      content
    )
  );
}

/**
 * Realiza migracao automatica de um arquivo
 * @param {string} filePath - Caminho do arquivo
 * @param {boolean} verbose - Se deve imprimir detalhes
 * @returns {Object} Resultado da migracao {modified, warnings, errors}
 */
function migrateFile(filePath, verbose = false) {
  const result = {
    modified: false,
    warnings: [],
    errors: [],
    appliedMigrations: [],
  };

  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;

    // Aplicar todas as migraces
    for (const migration of MIGRATIONS) {
      if (migration.pattern.test(content)) {
        content = content.replace(migration.pattern, migration.replacement);
        result.appliedMigrations.push(migration.name);

        if (verbose) {
          console.log(`  ✓ Aplicado: ${migration.name}`);
        }
      }
    }

    // Verificar por patterns que requerem atencao manual
    if (/window\.|localStorage|sessionStorage/.test(content)) {
      result.warnings.push('Script contem referencias a window/localStorage');
    }

    if (!/room\s*=\s*\{|room\.onPlayerJoin|room\.sendChat/.test(content)) {
      result.warnings.push(
        'Script pode estar vazio ou nao usar room - verifique migracao'
      );
    }

    // Adicionar cabecalho de migracao
    const header = `// Migrado para haxball.js v5.0.0+
// Data: ${new Date().toISOString()}
// Conteudo: room e fornecida automaticamente pelo contexto

`;

    content = header + content;

    // Escrever arquivo migrado
    if (originalContent !== content) {
      fs.writeFileSync(filePath, content, 'utf-8');
      result.modified = true;
    }
  } catch (error) {
    result.errors.push(error.message);
  }

  return result;
}

/**
 * Processa um arquivo ou diretorio
 * @param {string} targetPath - Caminho do arquivo ou diretorio
 * @param {boolean} verbose - Se deve imprimir detalhes
 */
function processPath(targetPath, verbose = false) {
  const stats = fs.statSync(targetPath);

  if (stats.isFile()) {
    // Processar arquivo individual
    if (!targetPath.endsWith('.js')) {
      console.error(
        `Erro: Arquivo deve ter extensao .js, encontrado: ${targetPath}`
      );
      process.exit(1);
    }

    const result = migrateFile(targetPath, verbose);
    printFileResult(targetPath, result);
  } else if (stats.isDirectory()) {
    // Processar diretorio
    const files = fs.readdirSync(targetPath);
    const jsFiles = files.filter((f) => f.endsWith('.js'));

    if (jsFiles.length === 0) {
      console.log(
        `Nenhum arquivo .js encontrado em ${targetPath}`
      );
      return;
    }

    console.log(`Encontrados ${jsFiles.length} arquivo(s) .js\n`);

    const results = {
      total: jsFiles.length,
      modified: 0,
      errors: 0,
      warnings: 0,
    };

    for (const file of jsFiles) {
      const filePath = path.join(targetPath, file);
      const result = migrateFile(filePath, verbose);

      printFileResult(filePath, result);

      if (result.modified) results.modified++;
      if (result.errors.length > 0) results.errors++;
      if (result.warnings.length > 0) results.warnings++;
    }

    console.log('\n' + '='.repeat(60));
    console.log('RELATORIO DE MIGRACAO');
    console.log('='.repeat(60));
    console.log(`Total de arquivos: ${results.total}`);
    console.log(`Arquivos modificados: ${results.modified}`);
    console.log(`Erros: ${results.errors}`);
    console.log(`Avisos: ${results.warnings}`);
    console.log('='.repeat(60));
  } else {
    console.error(`Erro: Caminho nao e arquivo nem diretorio: ${targetPath}`);
    process.exit(1);
  }
}

/**
 * Imprime resultado da migracao de um arquivo
 * @param {string} filePath - Caminho do arquivo
 * @param {Object} result - Resultado da migracao
 */
function printFileResult(filePath, result) {
  const shortPath = path.basename(filePath);

  if (result.errors.length > 0) {
    console.log(`✗ ${shortPath}`);
    result.errors.forEach((err) => console.log(`    ERRO: ${err}`));
    return;
  }

  if (result.modified) {
    console.log(`✓ ${shortPath} - MIGRADO`);
    result.appliedMigrations.forEach((m) => console.log(`    - ${m}`));
  } else {
    console.log(`- ${shortPath} - Nao precisa migracao`);
  }

  result.warnings.forEach((w) => console.log(`    AVISO: ${w}`));
}

/**
 * Imprime guia de migracao manual
 */
function printMigrationGuide() {
  console.log('\n' + '='.repeat(60));
  console.log('MUDANCAS QUE REQUEREM REVISAO MANUAL');
  console.log('='.repeat(60));

  for (const change of MANUAL_CHANGES) {
    console.log(`\n[${change.name}]`);
    console.log(`${change.description}`);
    console.log(`Exemplo:\n${change.example}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('DICAS DE MIGRACAO');
  console.log('='.repeat(60));
  console.log(`
1. room - Fornecida automaticamente no contexto
   - NAO precisa atribuir: var room = window.HBInit(...)
   - Comece direto: room.onPlayerJoin = function(player) { ... }

2. Configuracao de Sala - Use settings em Server.ts
   - Passe roomName, maxPlayers, public, noPlayer, password via customSettings
   - NAO tente ler de window.customSettings

3. Token Headless
   - Token agora e passado via config, nao mais injetado no HTML
   - Scripts NAO precisam lidar com isso

4. Comunicacao com Bot
   - console.log() ainda funciona (capturado pelo logging)
   - room.sendChat() para enviar mensagens
   - Event handlers (onPlayerJoin, onPlayerChat, etc) como antes

5. Testing
   - Teste o script com "npm run test:bot <arquivo>"
   - Verifique se nao ha erros no console
   - Valide comportamento esperado do bot

6. Compatibilidade
   - Maioria dos scripts legados funcionam sem mudanca
   - Apenas scripts que usam window/localStorage/etc precisam adaptacao
  `);
}

// Main
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Ferramenta de Migracao de Scripts Haxball.js');
    console.log('');
    console.log(
      'Uso: node scripts/migrate-bot-scripts.js <arquivo-ou-diretorio> [opcoes]'
    );
    console.log('');
    console.log('Opcoes:');
    console.log('  --verbose, -v   Mostrar detalhes de cada mudanca');
    console.log('  --guide          Mostrar guia completo de migracao');
    console.log('');
    console.log('Exemplos:');
    console.log('  node scripts/migrate-bot-scripts.js bots/futsal.js');
    console.log('  node scripts/migrate-bot-scripts.js bots/');
    console.log(
      '  node scripts/migrate-bot-scripts.js bots/ --verbose --guide'
    );
    process.exit(0);
  }

  const targetPath = args[0];
  const verbose = args.includes('--verbose') || args.includes('-v');
  const showGuide = args.includes('--guide');

  if (!fs.existsSync(targetPath)) {
    console.error(`Erro: Caminho nao encontrado: ${targetPath}`);
    process.exit(1);
  }

  console.log('Ferramenta de Migracao de Scripts Haxball.js');
  console.log('');

  processPath(targetPath, verbose);

  if (showGuide) {
    printMigrationGuide();
  }
}

main();

//    __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
