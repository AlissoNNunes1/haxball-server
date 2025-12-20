#!/usr/bin/env node
/**
 * Ponto de entrada principal do servidor Haxball
 * Interface CLI para gerenciar salas Haxball via linha de comando
 * @module main
 * @requires yargs - Parsing de argumentos CLI
 * @requires openServer - Comando para iniciar servidor
 */

import yargs from 'yargs';

import { openChampionshipRoom } from './commands/openChampionship';
import { openServer } from './commands/openServer';

const args = yargs(process.argv.slice(2));

/**
 * Comando 'open' - Inicia um servidor Haxball com configuracoes
 * Aliases: o, r, run, server
 * Opcoes:
 *  - file: Caminho para arquivo config.json (opcional)
 */
args.command({
  command: 'open',
  aliases: ['o', 'r', 'run', 'server'],
  describe: 'Opens a Haxball server.',
  builder: {
    file: {
      describe: 'The config.json file.',
      demandOption: false,
      type: 'string',
    },
  },
  handler: async (argv) => {
    await openServer(argv.file as string);
  },
});

/**
 * Comando 'connect' - Deprecated em v5.0.0
 * Funcionalidade de tunel SSH foi removida
 * Aliases: c
 */
args.command({
  command: 'connect',
  aliases: ['c'],
  describe: 'DEPRECATED: SSH tunnel functionality removed in v5.0.0',
  builder: {},
  handler: async () => {
    console.log('SSH tunnel functionality has been removed in v5.0.0');
    console.log("Please use 'open' command for local room management with haxball.js");
  },
});

/**
 * Comando 'token' - Gerencia tokens Haxball
 * Subcomandos: add, show, status, clear, help
 */
args.command({
  command: 'token <subcommand> [token]',
  aliases: ['t'],
  describe: 'Gerencia tokens do Haxball',
  builder: {
    subcommand: {
      describe: 'Subcomando (add, show, status, clear, help)',
      demandOption: true,
      type: 'string',
    },
    token: {
      describe: 'Token para adicionar (usado com add)',
      demandOption: false,
      type: 'string',
    },
  },
  handler: async (argv) => {
    const { tokenCommand } = await import('./commands/token');
    const subArgs = [argv.subcommand as string];
    if (argv.token) subArgs.push(argv.token as string);
    await tokenCommand(subArgs);
  },
});

args.command({
  command: 'championship',
  aliases: ['ch'],
  describe: 'Abre uma sala temporaria de campeonato.',
  builder: {
    file: {
      describe: 'Arquivo config.json (opcional).',
      demandOption: false,
      type: 'string',
    },
    preset: {
      describe: 'Preset de campeonato (default, rs5, rs6, rs7, rs11).',
      demandOption: true,
      type: 'string',
    },
    token: {
      describe: 'Token headless do Haxball.',
      demandOption: true,
      type: 'string',
    },
    home: {
      describe: 'Time mandante.',
      demandOption: true,
      type: 'string',
    },
    away: {
      describe: 'Time visitante.',
      demandOption: true,
      type: 'string',
    },
    spectators: {
      describe: 'Permitir espectadores (padrao: true).',
      demandOption: false,
      type: 'boolean',
      default: true,
    },
    password: {
      describe: 'Senha opcional da sala.',
      demandOption: false,
      type: 'string',
    },
  },
  handler: async (argv) => {
    await openChampionshipRoom({
      file: argv.file as string,
      token: argv.token as string,
      preset: argv.preset as string,
      home: argv.home as string,
      away: argv.away as string,
      spectators: argv.spectators as boolean,
      password: argv.password as string,
    });
  },
});

args.demandCommand();
args.parse();

//    __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
