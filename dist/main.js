#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const yargs_1 = __importDefault(require("yargs"));
const openServer_1 = require("./commands/openServer");
const args = (0, yargs_1.default)(process.argv.slice(2));
args.command({
    command: "open",
    aliases: ["o", "r", "run", "server"],
    describe: "Opens a Haxball server.",
    builder: {
        file: {
            describe: "The config.json file.",
            demandOption: false,
            type: "string",
        }
    },
    handler: (argv) => {
        (0, openServer_1.openServer)(argv.file);
    }
});
args.command({
    command: "connect",
    aliases: ["c"],
    describe: "DEPRECATED: SSH tunnel functionality removed in v5.0.0",
    builder: {},
    handler: async () => {
        console.log("SSH tunnel functionality has been removed in v5.0.0");
        console.log("Please use 'open' command for local room management with haxball.js");
    }
});
args.demandCommand();
args.parse();
//# sourceMappingURL=main.js.map