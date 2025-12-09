#!/usr/bin/env node

import yargs from "yargs";

import { openServer } from "./commands/openServer";

const args = yargs(process.argv.slice(2));

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
        openServer(argv.file as string);
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

args.demandCommand()
args.parse();