#!/usr/bin/env node
"use strict";
/**
 * Ponto de entrada principal do servidor Haxball
 * Interface CLI para gerenciar salas Haxball via linha de comando
 * @module main
 * @requires yargs - Parsing de argumentos CLI
 * @requires openServer - Comando para iniciar servidor
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const yargs_1 = __importDefault(require("yargs"));
const openServer_1 = require("./commands/openServer");
const args = (0, yargs_1.default)(process.argv.slice(2));
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
        await (0, openServer_1.openServer)(argv.file);
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
args.demandCommand();
args.parse();
//    __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
//# sourceMappingURL=main.js.map