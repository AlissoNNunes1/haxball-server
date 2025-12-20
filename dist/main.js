#!/usr/bin/env node
"use strict";
/**
 * Ponto de entrada principal do servidor Haxball
 * Interface CLI para gerenciar salas Haxball via linha de comando
 * @module main
 * @requires yargs - Parsing de argumentos CLI
 * @requires openServer - Comando para iniciar servidor
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const yargs_1 = __importDefault(require("yargs"));
const openChampionship_1 = require("./commands/openChampionship");
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
        const { tokenCommand } = await Promise.resolve().then(() => __importStar(require('./commands/token')));
        const subArgs = [argv.subcommand];
        if (argv.token)
            subArgs.push(argv.token);
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
        await (0, openChampionship_1.openChampionshipRoom)({
            file: argv.file,
            token: argv.token,
            preset: argv.preset,
            home: argv.home,
            away: argv.away,
            spectators: argv.spectators,
            password: argv.password,
        });
    },
});
args.demandCommand();
args.parse();
//    __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
//# sourceMappingURL=main.js.map