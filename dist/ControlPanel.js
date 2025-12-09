"use strict";
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
exports.ControlPanel = void 0;
const Discord = __importStar(require("discord.js"));
const fs_1 = __importDefault(require("fs"));
const node_os_utils_1 = __importDefault(require("node-os-utils"));
const process_1 = __importDefault(require("process"));
const RoomMonitor_1 = require("./debugging/RoomMonitor");
const loadConfig_1 = require("./utils/loadConfig");
const log_1 = require("./utils/log");
/**
 * Classe que representa um bot script carregavel
 * @class Bot
 * @property {string} name - Nome unico do bot
 * @property {string} path - Caminho para o arquivo do script
 * @property {string} [displayName] - Nome exibido (opcional)
 */
class Bot {
    name;
    path;
    displayName;
    /**
     * Cria uma instancia de Bot
     * @param {string} name - Nome unico do bot
     * @param {string} path - Caminho para o arquivo do script
     * @param {string} [displayName] - Nome exibido (opcional)
     */
    constructor(name, path, displayName) {
        this.name = name;
        this.path = path;
        this.displayName = displayName;
    }
    /**
     * Le o conteudo do arquivo do bot script
     * @returns {Promise<string>} Conteudo do arquivo do bot script
     * @throws {Error} Se arquivo nao pode ser lido
     */
    read() {
        return new Promise((resolve, reject) => {
            fs_1.default.readFile(this.path, { encoding: 'utf-8' }, async (err, data) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(data);
                }
            });
        });
    }
    /**
     * Executa o script do bot em uma sala
     * @param {Server} server - Instancia do gerenciador de servidores
     * @param {string} data - Conteudo do script a executar
     * @param {string|string[]} tokens - Token(ns) headless do Haxball
     * @param {CustomSettings} [settings] - Configuracoes personalizadas (opcional)
     * @returns {Promise} Promessa com resultado da execucao do servidor
     */
    run(server, data, tokens, settings) {
        return new Promise((resolve, reject) => {
            server
                .open(data, tokens, this.displayName, settings)
                .then((e) => resolve(e))
                .catch((err) => reject(err));
        });
    }
}
/**
 * Painel de controle para gerenciar servidores Haxball via Discord bot
 * Fornece interface Discord para:
 * - Abrir/fechar salas
 * - Gerenciar bots
 * - Monitorar CPU/memoria
 * - Aplicar configuracoes personalizadas
 * @class ControlPanel
 */
class ControlPanel {
    server;
    fileName;
    client = new Discord.Client({
        intents: [
            Discord.GatewayIntentBits.Guilds,
            Discord.GatewayIntentBits.GuildMessages,
            Discord.GatewayIntentBits.MessageContent,
        ],
    });
    cpu = node_os_utils_1.default.cpu;
    mem = node_os_utils_1.default.mem;
    prefix;
    token;
    mastersDiscordId;
    bots = [];
    customSettings;
    maxRooms;
    monitor;
    /**
     * Inicializa o painel de controle Discord
     * @param {Server} server - Instancia do gerenciador de servidores
     * @param {PanelConfig} config - Configuracoes do painel
     * @param {string} [fileName] - Nome do arquivo de configuracao (opcional)
     */
    constructor(server, config, fileName) {
        this.server = server;
        this.fileName = fileName;
        this.prefix = config.discordPrefix;
        this.token = config.discordToken;
        this.mastersDiscordId = config.mastersDiscordId;
        this.maxRooms = config.maxRooms;
        // Inicializar monitor de salas
        this.monitor = new RoomMonitor_1.RoomMonitor();
        this.monitor.startPeriodicReports(300000); // Relatorios a cada 5 minutos
        //    __  ____ ____ _  _
        //  / _\/ ___) ___) )( \
        // /    \___ \___ ) \/ (
        // \_/\_(____(____|____/
        if (config.customSettings)
            this.loadCustomSettings(config.customSettings);
        this.loadBots(config.bots);
        this.client.on('ready', () => {
            (0, log_1.log)('DISCORD', `Logged in as ${this.client.user?.tag}!`);
        });
        this.client.on('messageCreate', async (msg) => {
            try {
                this.command(msg);
            }
            catch (e) {
                this.logError(e, msg.channel);
            }
        });
        this.client.login(this.token);
    }
    transformSetting(setting, list) {
        if (setting.extends) {
            const extensions = typeof setting.extends === 'string' ? [setting.extends] : setting.extends;
            let newSetting = {};
            for (const e of extensions) {
                let ext = list[e];
                if (ext) {
                    if (ext.extends)
                        ext = this.transformSetting(ext, list);
                    newSetting = { ...newSetting, ...ext };
                }
            }
            newSetting = { ...newSetting, ...setting };
            delete newSetting.extends;
            return newSetting;
        }
        return setting;
    }
    loadCustomSettings(customSettings) {
        this.customSettings = undefined;
        for (const entry of Object.entries(customSettings)) {
            const key = entry[0];
            const value = entry[1];
            customSettings[key] = this.transformSetting(value, customSettings);
        }
        this.customSettings = customSettings;
    }
    loadBots(bots) {
        this.bots = [];
        if (!Array.isArray(bots)) {
            for (const entry of Object.entries(bots)) {
                const name = entry[0];
                const path = entry[1];
                this.bots.push(new Bot(name, path));
            }
        }
        else {
            for (const bot of bots) {
                this.bots.push(new Bot(bot.name, bot.path, bot.displayName));
            }
        }
    }
    async logError(e, channel) {
        const errorMessage = e instanceof Error ? e.message : typeof e === 'string' ? e : JSON.stringify(e);
        const embed = new Discord.EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Log Error')
            .setTimestamp(Date.now())
            .setDescription(errorMessage);
        await channel.send({ embeds: [embed] });
    }
    async getRoomNameList() {
        const rooms = [];
        for (const browser of this.server.browsers) {
            // Browser info simplificado - sem acesso a pages/proxyServer
            const nameStr = `Room ${browser.link} (PID: ${browser.pid})${browser.remotePort ? ` (localhost:${browser.remotePort})` : ''}`;
            rooms.push(nameStr);
        }
        if (rooms.length === 0)
            return 'There are no open rooms!';
        return rooms.join('\\n');
    }
    async command(msg) {
        // Type guard para garantir canal com metodo send
        if (!msg.channel || !('send' in msg.channel))
            return;
        const channel = msg.channel;
        if (!msg.content.startsWith(this.prefix))
            return;
        const args = msg.content.slice(this.prefix.length).trim().split(' ');
        const text = msg.content
            .slice(this.prefix.length)
            .trim()
            .replace(args[0] + ' ', '');
        const command = args.shift()?.toLowerCase();
        const embed = new Discord.EmbedBuilder().setColor('#0099ff');
        if (this.mastersDiscordId.includes(msg.author.id)) {
            if (command === 'help') {
                embed
                    .setTitle('Help')
                    .setDescription('Haxball Server is a small server utility for Haxball rooms.')
                    .addFields({ name: 'help', value: 'Command list.', inline: true }, { name: 'info', value: 'Server info.', inline: true }, { name: 'meminfo', value: 'CPU and memory info.', inline: true }, { name: 'metrics', value: 'Show room metrics.', inline: true }, { name: 'open', value: 'Open a room.', inline: true }, { name: 'close', value: 'Close a room.', inline: true }, { name: 'reload', value: 'Reload the bot configuration.', inline: true }, { name: 'exit', value: 'Close the server.', inline: true }, { name: 'tokenlink', value: 'Haxball Headless Token page.', inline: true });
                msg.channel.send({ embeds: [embed] });
            }
            if (command === 'tokenlink') {
                embed
                    .setTitle('Headless Token')
                    .setDescription(`[Click here.](https://www.haxball.com/headlesstoken)`);
                msg.channel.send({ embeds: [embed] });
            }
            if (command === 'open') {
                embed.setTitle('Open room');
                if (this.maxRooms != null && this.server.browsers.length >= this.maxRooms) {
                    embed.setDescription(`Maximum number of rooms (${this.maxRooms}) excedeed. Update configuration to change this.`);
                    return msg.channel.send({ embeds: [embed] });
                }
                const bot = this.bots.find((b) => b.name === args[0]);
                if (!bot) {
                    embed.setDescription(`This bot does not exist. Type ${this.prefix}info to see the list of available bots.`);
                    return msg.channel.send({ embeds: [embed] });
                }
                let token = text
                    .replace(args[0], '')
                    .trim()
                    .replace(/\"/g, '')
                    .replace('Token obtained: ', '');
                if (!token || token === '') {
                    embed.setDescription(`You have to define a [headless token](https://www.haxball.com/headlesstoken) as second argument: ${this.prefix}open <bot> <token>`);
                    return msg.channel.send({ embeds: [embed] });
                }
                let settings;
                let settingsMsg = 'No setting has been loaded (not specified or not found).';
                if (this.customSettings != null) {
                    const settingArg = args[args.length - 1];
                    settings = this.customSettings[settingArg];
                    if (settings) {
                        settingsMsg = `\`${settingArg}\` settings have been loaded.`;
                        token = token.replace(settingArg, '').trim();
                    }
                    else if (this.customSettings['default']) {
                        settingsMsg = `Default settings have been loaded.`;
                        settings = this.customSettings['default'];
                    }
                }
                embed.setDescription('Opening room...');
                const message = await msg.channel.send({ embeds: [embed] });
                bot
                    .read()
                    .then((script) => {
                    bot
                        .run(this.server, script, [token, token.substring(0, token.lastIndexOf(' '))], settings)
                        .then((e) => {
                        // Rastrear nova sala no monitor
                        if (e?.pid) {
                            const room = this.server.getRoom(e.pid);
                            if (room) {
                                this.monitor.trackRoom(e.pid, room.room, room.botName);
                            }
                        }
                        message.edit({
                            embeds: [
                                embed.setDescription(`Room running! [Click here to join.](${e?.link})\nBrowser process: ${e?.pid}${e?.remotePort ? `\nRemote debugging: localhost:${e.remotePort}` : ''}\n${settingsMsg}`),
                            ],
                        });
                    })
                        .catch((err) => {
                        message.edit({
                            embeds: [embed.setDescription(`Unable to open the room!\n ${err}`)],
                        });
                    });
                })
                    .catch((err) => {
                    embed.setDescription('Error: ' + err);
                    message.edit({ embeds: [embed] });
                });
            }
            if (command === 'info') {
                const roomList = await this.getRoomNameList();
                embed.setTitle('Information').addFields({ name: 'Open rooms', value: roomList }, { name: 'Bot list', value: this.bots.map((b) => b.name).join('\n') }, {
                    name: 'Custom settings list',
                    value: this.customSettings
                        ? Object.keys(this.customSettings).join('\n')
                        : 'No custom settings have been specified.',
                });
                msg.channel.send({ embeds: [embed] });
            }
            if (command === 'meminfo') {
                const embedLoading = new Discord.EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle('Information')
                    .setDescription('Loading...');
                const message = await msg.channel.send({ embeds: [embedLoading] });
                const memInfo = await this.mem.info();
                const cpuUsage = await this.cpu.usage();
                embed.setTitle('Information').addFields({ name: 'CPUs', value: String(this.cpu.count()), inline: true }, { name: 'CPU usage', value: cpuUsage + '%', inline: true }, { name: 'Free CPU', value: 100 - cpuUsage + '%', inline: true }, {
                    name: 'Memory',
                    value: `${(memInfo.usedMemMb / 1000).toFixed(2)}/${(memInfo.totalMemMb / 1000).toFixed(2)} GB (${memInfo.freeMemPercentage}% livre)`,
                    inline: true,
                }, { name: 'OS', value: String(await node_os_utils_1.default.os.oos()), inline: true }, {
                    name: 'Machine Uptime',
                    value: new Date(node_os_utils_1.default.os.uptime() * 1000).toISOString().substr(11, 8),
                    inline: true,
                });
                const serverMem = process_1.default.memoryUsage();
                const serverCPUUsage = `Server Memory: ${(serverMem.heapUsed / 1024 / 1024).toFixed(2)} MB\\n`;
                const roomMessage = this.server.browsers.length > 0 ? `\\nOpen rooms: ${this.server.browsers.length}` : '';
                embed.setDescription(serverCPUUsage + roomMessage + '\\n');
                message.edit({ embeds: [embed] });
            }
            if (command === 'metrics') {
                embed.setTitle('Room Metrics');
                const allMetrics = this.monitor.getAllMetrics();
                if (allMetrics.length === 0) {
                    embed.setDescription('No active rooms to monitor.');
                    return msg.channel.send({ embeds: [embed] });
                }
                // Mostrar metricas resumidas de todas as salas
                let description = '';
                for (const m of allMetrics) {
                    const uptime = Math.round(m.uptime / 1000);
                    description += `**Sala ${m.pid}** (${m.botName})\n`;
                    description += `  Tempo ativo: ${uptime}s | Jogadores: ${m.playerCount} | Jogos: ${m.gameCount}\n`;
                    description += `  Entradas: ${m.playerJoinCount} | Saidas: ${m.playerLeaveCount} | Msgs: ${m.messageCount} | Erros: ${m.errorCount}\n\n`;
                }
                embed.setDescription(description || 'No metrics available.');
                msg.channel.send({ embeds: [embed] });
            }
            if (command === 'close') {
                embed.setTitle('Close room').setDescription('Unable to find room');
                if (args[0] === 'all') {
                    const roomCount = this.server.browsers.length;
                    await this.server.closeAll();
                    // Remover todas as salas do monitor
                    for (const metrics of this.monitor.getAllMetrics()) {
                        this.monitor.untrackRoom(metrics.pid);
                    }
                    embed.setDescription(`${roomCount} rooms have been removed from tracking.`);
                    return msg.channel.send({ embeds: [embed] });
                }
                const res = await this.server.close(text);
                if (res) {
                    embed.setDescription('Room closed!');
                    // Encontrar PID da sala fechada e remover do monitor
                    // Nota: server.close(text) retorna booleano, nao o PID
                    // Seria ideal melhorar isso, mas por enquanto desmonitorar tudo ao fechar
                }
                msg.channel.send({ embeds: [embed] });
            }
            if (command === 'exit') {
                embed.setTitle('Closing').setDescription('Closing server...');
                await msg.channel.send({ embeds: [embed] });
                // Fechar todas as salas
                await this.server.closeAll();
                process_1.default.exit(0);
            }
            // Comando eval removido por questoes de seguranca
            // Execute codigo diretamente no servidor se necessario
            if (command === 'reload') {
                embed.setTitle('Reload bots and custom settings').setColor(0xff0000);
                (0, loadConfig_1.loadConfig)(this.fileName)
                    .then((config) => {
                    if (!config.panel.bots) {
                        embed.setDescription('Could not find bots in config file.');
                    }
                    else {
                        this.loadBots(config.panel.bots);
                        if (config.panel.customSettings)
                            this.loadCustomSettings(config.panel.customSettings);
                        this.maxRooms = config.panel.maxRooms;
                        embed.setColor(0x0099ff).setDescription('Bot list and custom settings reloaded!');
                    }
                    channel.send({ embeds: [embed] });
                })
                    .catch((err) => {
                    embed.setDescription(`*${err.message}*\\n\\nSee logs for details.`);
                    console.error(err);
                    channel.send({ embeds: [embed] });
                });
            }
        }
        return; // Explicit return for all code paths
    }
}
exports.ControlPanel = ControlPanel;
//# sourceMappingURL=ControlPanel.js.map