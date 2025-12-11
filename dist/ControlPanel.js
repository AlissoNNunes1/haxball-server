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
// Full rewrite: create a single clean ControlPanel implementation
// Full rewrite: create a single clean ControlPanel implementation
const Discord = __importStar(require("discord.js"));
const discord_js_1 = require("discord.js");
const node_os_utils_1 = __importDefault(require("node-os-utils"));
const path_1 = __importDefault(require("path"));
const process_1 = __importDefault(require("process"));
const url_1 = require("url");
const Bot_1 = require("./Bot");
const AuthCommands_1 = require("./auth/AuthCommands");
const registerSlashCommands_1 = require("./commands/registerSlashCommands");
const RoomMonitor_1 = require("./debugging/RoomMonitor");
const loadConfig_1 = require("./utils/loadConfig");
const log_1 = require("./utils/log");
class ControlPanel {
    server;
    fileName;
    client;
    prefix;
    token;
    mastersDiscordId = [];
    adminChannelId;
    generalChannelId;
    guildId;
    maxRooms;
    bots = [];
    customSettings;
    mem;
    cpu;
    monitor;
    esmRoomsCache = [];
    panelConfig;
    authCommands;
    constructor(server, config, fileName) {
        this.server = server;
        this.fileName = fileName;
        this.panelConfig = config;
        this.prefix = config.discordPrefix;
        this.token = config.discordToken;
        this.mastersDiscordId = config.mastersDiscordId ?? [];
        this.adminChannelId = config.adminChannelId;
        this.generalChannelId = config.generalChannelId;
        this.guildId = config.guildId;
        this.maxRooms = config.maxRooms;
        this.mem = node_os_utils_1.default.mem;
        this.cpu = node_os_utils_1.default.cpu;
        this.client = new Discord.Client({
            intents: [
                Discord.GatewayIntentBits.Guilds,
                Discord.GatewayIntentBits.GuildMessages,
                Discord.GatewayIntentBits.MessageContent,
            ],
        });
        this.monitor = new RoomMonitor_1.RoomMonitor();
        this.monitor.startPeriodicReports(300000);
        if (config.customSettings)
            this.loadCustomSettings(config.customSettings);
        this.loadBots(config.bots);
        if (config.rooms && Array.isArray(config.rooms)) {
            this.esmRoomsCache = this.esmRoomsCache.concat(config.rooms.map((r) => ({
                name: r.name,
                module: { path: r.path, displayName: r.displayName },
            })));
        }
        this.client.on('ready', async () => {
            (0, log_1.log)('DISCORD', `Logged in as ${this.client.user?.tag}!`);
            // Registra Slash Commands
            if (this.client.user) {
                const clientId = this.client.user.id;
                // Use guildId para teste rapido (instantaneo), ou undefined para global (ate 1h)
                const guildId = this.guildId;
                if (guildId) {
                    (0, log_1.log)('DISCORD', `Registrando comandos no servidor ${guildId} (rapido)`);
                }
                else {
                    (0, log_1.log)('DISCORD', 'Registrando comandos globalmente (pode levar ate 1 hora)');
                }
                await (0, registerSlashCommands_1.registerSlashCommands)(this.token, clientId, guildId);
            }
        });
        this.client.on('interactionCreate', async (interaction) => {
            if (!interaction.isChatInputCommand())
                return;
            try {
                await this.handleSlashCommand(interaction);
            }
            catch (e) {
                console.error('Error handling slash command:', e);
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: 'Ocorreu um erro ao processar o comando.',
                        flags: discord_js_1.MessageFlags.Ephemeral,
                    });
                }
            }
        });
        this.client.on('messageCreate', async (msg) => {
            try {
                await this.command(msg);
            }
            catch (e) {
                if (msg.channel && 'send' in msg.channel)
                    this.logError(e, msg.channel);
                else
                    (0, log_1.log)('DISCORD', `Error handling command: ${e}`);
            }
        });
        // Inicializa sistema de autenticacao
        this.authCommands = new AuthCommands_1.AuthCommands();
        this.authCommands.startSessionCleanup();
        (0, log_1.log)('AUTH', 'Sistema de autenticacao inicializado');
        if (this.token)
            void this.client.login(this.token);
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
        for (const [key, value] of Object.entries(customSettings)) {
            customSettings[key] = this.transformSetting(value, customSettings);
        }
        this.customSettings = customSettings;
    }
    loadBots(bots) {
        this.bots = [];
        if (!Array.isArray(bots) && bots && typeof bots === 'object') {
            for (const [name, p] of Object.entries(bots)) {
                this.bots.push(new Bot_1.Bot(name, p));
            }
        }
        else if (Array.isArray(bots)) {
            for (const b of bots) {
                this.bots.push(new Bot_1.Bot(b.name, b.path, b.displayName));
            }
        }
    }
    async loadEsmRooms() {
        if (this.esmRoomsCache.length > 0)
            return this.esmRoomsCache;
        try {
            const modulePath = (0, url_1.pathToFileURL)(path_1.default.resolve(__dirname, '../apps/discord-bot/index.mjs')).href;
            // Use runtime dynamic import via Function to avoid TypeScript compiling to require()
            const dynamicImport = new Function('s', 'return import(s)');
            const mod = await dynamicImport(modulePath);
            const listFn = mod.listAvailableRooms;
            if (typeof listFn === 'function') {
                const list = await listFn();
                if (Array.isArray(list)) {
                    this.esmRoomsCache = this.esmRoomsCache.concat(list.map((r) => ({ name: r.name, module: r.module || r })));
                }
            }
        }
        catch (err) {
            (0, log_1.log)('DISCORD', `WARN: apps/discord-bot discovery failed: ${(err && err.message) || err}`);
        }
        if (this.panelConfig?.rooms && Array.isArray(this.panelConfig.rooms)) {
            for (const entry of this.panelConfig.rooms) {
                const roomEntry = entry;
                try {
                    const modPath = (0, url_1.pathToFileURL)(path_1.default.resolve(this.fileName ? path_1.default.dirname(this.fileName) : path_1.default.resolve('.'), roomEntry.path)).href;
                    const dynamicImport = new Function('s', 'return import(s)');
                    const rmod = await dynamicImport(modPath);
                    let modCandidate = rmod?.default ?? rmod;
                    // If not a module with init directly, search named exports for an object exposing init
                    if (!modCandidate || typeof modCandidate.init !== 'function') {
                        // Try find a named export that is a room module
                        const keys = Object.keys(modCandidate || {});
                        for (const k of keys) {
                            const v = modCandidate[k];
                            if (v && typeof v.init === 'function') {
                                modCandidate = v;
                                break;
                            }
                        }
                    }
                    this.esmRoomsCache.push({ name: roomEntry.name, module: modCandidate });
                }
                catch (err) {
                    this.esmRoomsCache.push({ name: roomEntry.name, module: { path: roomEntry.path } });
                }
            }
        }
        return this.esmRoomsCache;
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
            const nameStr = `Room ${browser.link} (PID: ${browser.pid})${browser.remotePort ? ` (localhost:${browser.remotePort})` : ''}`;
            rooms.push(nameStr);
        }
        if (rooms.length === 0)
            return 'There are no open rooms!';
        return rooms.join('\n');
    }
    async handleSlashCommand(interaction) {
        const commandName = interaction.commandName;
        // Comandos de autenticacao (sem necessidade de master check)
        if (['register', 'linkdiscord', 'profile', 'ranking', 'top', 'authhelp'].includes(commandName)) {
            // Verifica canal geral se configurado
            if (this.generalChannelId && interaction.channelId !== this.generalChannelId) {
                await interaction.reply({
                    content: `Comandos de autenticacao devem ser usados no canal <#${this.generalChannelId}>.`,
                    flags: discord_js_1.MessageFlags.Ephemeral,
                });
                return;
            }
            await this.authCommands.handleInteraction(interaction);
            return;
        }
        // Verifica permissao master para comandos admin
        if (!this.mastersDiscordId.includes(interaction.user.id)) {
            await interaction.reply({
                content: 'Sem permissao. Apenas masters podem usar comandos admin.',
                flags: discord_js_1.MessageFlags.Ephemeral,
            });
            return;
        }
        // Verifica canal admin se configurado
        if (this.adminChannelId && interaction.channelId !== this.adminChannelId) {
            await interaction.reply({
                content: `Comandos admin devem ser usados no canal <#${this.adminChannelId}>.`,
                flags: discord_js_1.MessageFlags.Ephemeral,
            });
            return;
        }
        // Comandos admin
        switch (commandName) {
            case 'help':
                await this.handleHelpSlash(interaction);
                break;
            case 'info':
                await this.handleInfoSlash(interaction);
                break;
            case 'meminfo':
                await this.handleMemInfoSlash(interaction);
                break;
            case 'metrics':
                await this.handleMetricsSlash(interaction);
                break;
            case 'open':
                await this.handleOpenSlash(interaction);
                break;
            case 'close':
                await this.handleCloseSlash(interaction);
                break;
            case 'reload':
                await this.handleReloadSlash(interaction);
                break;
            case 'exit':
                await this.handleExitSlash(interaction);
                break;
            case 'tokenlink':
                await this.handleTokenLinkSlash(interaction);
                break;
            default:
                await interaction.reply({
                    content: `Comando desconhecido: ${commandName}`,
                    flags: discord_js_1.MessageFlags.Ephemeral,
                });
        }
    }
    async handleHelpSlash(interaction) {
        const channelInfo = [];
        if (this.adminChannelId) {
            channelInfo.push(`**Canal Admin:** <#${this.adminChannelId}> (comandos admin)`);
        }
        if (this.generalChannelId) {
            channelInfo.push(`**Canal Geral:** <#${this.generalChannelId}> (comandos auth)`);
        }
        const embed = new Discord.EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Comandos Admin Disponiveis')
            .setDescription([
            channelInfo.length > 0 ? channelInfo.join('\n') + '\n' : '',
            '`/help` - Lista comandos admin',
            '`/info` - Informacoes sobre salas abertas',
            '`/meminfo` - Uso de memoria',
            '`/metrics` - Metricas do servidor',
            '`/open <bot> <token> [setting]` - Abre sala com bot',
            '`/close <pid|all>` - Fecha sala(s)',
            '`/reload` - Recarrega configuracao',
            '`/exit` - Desliga o bot',
            '`/tokenlink` - Gera link para token Haxball',
            '',
            '**Comandos de Autenticacao:**',
            '`/authhelp` - Lista todos os comandos de auth',
            '`/register <nick> <senha>` - Cria conta',
            '`/linkdiscord <nick> <senha>` - Vincula Discord',
            '`/profile [nick]` - Ver perfil',
            '`/ranking [nick]` - Ver ranking (alias de profile)',
            '`/top [criterio]` - Top jogadores',
        ].join('\n'))
            .setTimestamp(Date.now());
        await interaction.reply({ embeds: [embed] });
    }
    async handleInfoSlash(interaction) {
        const roomList = await this.getRoomNameList();
        const embed = new Discord.EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Salas Abertas')
            .setDescription(roomList)
            .setTimestamp(Date.now());
        await interaction.reply({ embeds: [embed] });
    }
    async handleMemInfoSlash(interaction) {
        const memUsage = process_1.default.memoryUsage();
        const embed = new Discord.EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Uso de Memoria')
            .addFields([
            { name: 'RSS', value: `${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`, inline: true },
            {
                name: 'Heap Total',
                value: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
                inline: true,
            },
            {
                name: 'Heap Usado',
                value: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
                inline: true,
            },
        ])
            .setTimestamp(Date.now());
        await interaction.reply({ embeds: [embed] });
    }
    async handleMetricsSlash(interaction) {
        const allMetrics = this.monitor.getAllMetrics();
        const totalRooms = allMetrics.length;
        const activeRooms = allMetrics.filter((m) => m.playerCount > 0).length;
        const totalPlayers = allMetrics.reduce((sum, m) => sum + m.playerCount, 0);
        const embed = new Discord.EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Metricas do Servidor')
            .addFields([
            { name: 'Total de Salas', value: `${totalRooms}`, inline: true },
            { name: 'Salas Ativas', value: `${activeRooms}`, inline: true },
            { name: 'Total de Jogadores', value: `${totalPlayers}`, inline: true },
        ])
            .setTimestamp(Date.now());
        await interaction.reply({ embeds: [embed] });
    }
    async handleOpenSlash(interaction) {
        const botName = interaction.options.getString('bot', true);
        const token = interaction.options.getString('token', true);
        const setting = interaction.options.getString('setting') || 'default';
        const bot = this.bots.find((b) => b.name === botName);
        if (!bot) {
            await interaction.reply({
                content: `Bot '${botName}' nao encontrado.`,
                flags: discord_js_1.MessageFlags.Ephemeral,
            });
            return;
        }
        await interaction.deferReply();
        try {
            const customSettings = this.customSettings && this.customSettings[setting]
                ? this.customSettings[setting]
                : undefined;
            const script = await bot.read();
            const browser = await bot.run(this.server, script, [token], customSettings);
            if (!browser) {
                await interaction.editReply({ content: 'Erro ao abrir sala: servidor retornou null' });
                return;
            }
            const embed = new Discord.EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Sala Aberta')
                .setDescription(`Sala ${browser.link} aberta com sucesso!\nPID: ${browser.pid}`)
                .setTimestamp(Date.now());
            await interaction.editReply({ embeds: [embed] });
        }
        catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e);
            await interaction.editReply({ content: `Erro ao abrir sala: ${errorMsg}` });
        }
    }
    async handleCloseSlash(interaction) {
        const pidStr = interaction.options.getString('pid', true);
        if (pidStr.toLowerCase() === 'all') {
            const count = this.server.browsers.length;
            await this.server.closeAll();
            await interaction.reply({ content: `${count} sala(s) fechada(s).` });
            return;
        }
        const pid = parseInt(pidStr, 10);
        if (isNaN(pid)) {
            await interaction.reply({ content: 'PID invalido.', flags: discord_js_1.MessageFlags.Ephemeral });
            return;
        }
        const found = this.server.browsers.find((b) => b.pid === pid);
        if (!found) {
            await interaction.reply({
                content: `Sala com PID ${pid} nao encontrada.`,
                flags: discord_js_1.MessageFlags.Ephemeral,
            });
            return;
        }
        await this.server.close(pid);
        await interaction.reply({ content: `Sala ${pid} fechada.` });
    }
    async handleReloadSlash(interaction) {
        if (!this.fileName) {
            await interaction.reply({
                content: 'Nenhum arquivo de config definido para reload.',
                flags: discord_js_1.MessageFlags.Ephemeral,
            });
            return;
        }
        try {
            const newConf = await (0, loadConfig_1.loadConfig)(this.fileName);
            if (newConf.panel) {
                this.panelConfig = newConf.panel;
                this.loadBots(newConf.panel.bots);
                if (newConf.panel.customSettings) {
                    this.loadCustomSettings(newConf.panel.customSettings);
                }
            }
            await interaction.reply({ content: 'Configuracao recarregada com sucesso.' });
        }
        catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e);
            await interaction.reply({
                content: `Erro ao recarregar: ${errorMsg}`,
                flags: discord_js_1.MessageFlags.Ephemeral,
            });
        }
    }
    async handleExitSlash(interaction) {
        await interaction.reply({ content: 'Desligando...' });
        await this.server.closeAll();
        process_1.default.exit(0);
    }
    async handleTokenLinkSlash(interaction) {
        const embed = new Discord.EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Gerar Token Haxball')
            .setDescription('Acesse: https://www.haxball.com/headlesstoken')
            .setTimestamp(Date.now());
        await interaction.reply({ embeds: [embed] });
    }
    async command(msg) {
        if (!msg.channel || !('send' in msg.channel))
            return;
        const channel = msg.channel;
        if (!msg.content.startsWith(this.prefix))
            return;
        // Verifica canal correto para comandos (deprecated)
        const isAdminUser = this.mastersDiscordId.includes(msg.author.id);
        if (isAdminUser && this.adminChannelId && msg.channelId !== this.adminChannelId) {
            return; // Ignora comandos admin fora do canal admin
        }
        if (!isAdminUser && this.generalChannelId && msg.channelId !== this.generalChannelId) {
            return; // Ignora comandos gerais fora do canal geral
        }
        const args = msg.content.slice(this.prefix.length).trim().split(' ').filter(Boolean);
        const text = msg.content
            .slice(this.prefix.length)
            .trim()
            .replace(args[0] + ' ', '');
        const command = args.shift()?.toLowerCase();
        const embed = new Discord.EmbedBuilder().setColor('#0099ff');
        if (!this.mastersDiscordId.includes(msg.author.id))
            return;
        if (command === 'help') {
            const channelInfo = [];
            if (this.adminChannelId) {
                channelInfo.push(`**Canal Admin:** <#${this.adminChannelId}>`);
            }
            if (this.generalChannelId) {
                channelInfo.push(`**Canal Geral:** <#${this.generalChannelId}>`);
            }
            embed
                .setTitle('Help - CIRS Haxball Server')
                .setDescription('⚠️ **AVISO**: Comandos com prefixo (!) estao DEPRECATED. Use Slash Commands (/) para maior seguranca.\n\n' +
                (channelInfo.length > 0 ? channelInfo.join('\n') + '\n' : ''))
                .addFields({ name: '\u200B', value: '**Comandos de Admin** (use /comando)', inline: false }, { name: '!help', value: 'Lista de comandos ➜ `/help`', inline: true }, { name: '!info', value: 'Informacoes do servidor ➜ `/info`', inline: true }, { name: '!meminfo', value: 'Uso de CPU e memoria ➜ `/meminfo`', inline: true }, { name: '!metrics', value: 'Metricas das salas ➜ `/metrics`', inline: true }, { name: '!open', value: 'Abrir uma sala ➜ `/open`', inline: true }, { name: '!close', value: 'Fechar uma sala ➜ `/close`', inline: true }, { name: '!esm-rooms', value: 'Listar modulos de sala', inline: true }, { name: '!reload', value: 'Recarregar configuracao ➜ `/reload`', inline: true }, { name: '!exit', value: 'Desligar servidor ➜ `/exit`', inline: true }, { name: '!tokenlink', value: 'Link para token Haxball ➜ `/tokenlink`', inline: true }, {
                name: '\u200B',
                value: '**Comandos de Autenticacao** ⚠️ DEPRECATED - USE `/authhelp`',
                inline: false,
            }, {
                name: '⚠️ IMPORTANTE',
                value: '`!register` e `!linkdiscord` expoe senhas publicamente!\nUSE `/register` e `/linkdiscord` (respostas privadas)',
                inline: false,
            }, { name: '!authhelp', value: 'Ajuda de autenticacao ➜ `/authhelp`', inline: true });
            await msg.channel.send({ embeds: [embed] });
            return;
        }
        if (command === 'tokenlink') {
            embed
                .setTitle('Headless Token')
                .setDescription(`[Click here.](https://www.haxball.com/headlesstoken)`);
            await msg.channel.send({ embeds: [embed] });
            return;
        }
        if (command === 'esm-rooms') {
            const list = await this.loadEsmRooms();
            embed.setTitle('Available ESM Rooms');
            embed.setDescription(list.map((r) => r.name).join('\n') || 'None');
            await msg.channel.send({ embeds: [embed] });
            return;
        }
        if (command === 'open') {
            embed.setTitle('Open room');
            if (this.maxRooms != null && this.server.browsers.length >= this.maxRooms) {
                embed.setDescription(`Maximum number of rooms (${this.maxRooms}) exceeded. Update configuration to change this.`);
                await msg.channel.send({ embeds: [embed] });
                return;
            }
            const bot = this.bots.find((b) => b.display === args[0] || b.name === args[0]);
            const esmRooms = await this.loadEsmRooms();
            const esmRoom = esmRooms.find((r) => r.name === args[0]);
            if (!bot && !esmRoom) {
                embed.setDescription(`This bot or room does not exist. Type ${this.prefix}info to see the list of available bots.`);
                await msg.channel.send({ embeds: [embed] });
                return;
            }
            let token = text
                .replace(args[0] || '', '')
                .trim()
                .replace(/"/g, '')
                .replace('Token obtained: ', '');
            if (!token) {
                embed.setDescription(`You have to define a [headless token](https://www.haxball.com/headlesstoken) as second argument: ${this.prefix}open <bot> <token>`);
                await msg.channel.send({ embeds: [embed] });
                return;
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
            if (bot) {
                try {
                    const script = await bot.read();
                    const res = await bot.run(this.server, script, [token, token.substring(0, token.lastIndexOf(' '))], settings);
                    if (res?.pid) {
                        const room = this.server.getRoom(res.pid);
                        if (room)
                            this.monitor.trackRoom(res.pid, room.room, room.botName);
                    }
                    message.edit({
                        embeds: [
                            embed.setDescription(`Room running! [Click here to join.](${res?.link})\nPID: ${res?.pid}\n${settingsMsg}`),
                        ],
                    });
                }
                catch (err) {
                    message.edit({ embeds: [embed.setDescription(`Unable to open the room!\n ${err}`)] });
                }
                return;
            }
            if (esmRoom) {
                try {
                    let mod = esmRoom.module;
                    if (mod && mod.path) {
                        const modPath = (0, url_1.pathToFileURL)(path_1.default.resolve(this.fileName ? path_1.default.dirname(this.fileName) : path_1.default.resolve('.'), mod.path)).href;
                        const dynamicImportEval = new Function('s', 'return import(s)');
                        const imported = await dynamicImportEval(modPath);
                        let importedCandidate = imported?.default ?? imported;
                        if (!importedCandidate || typeof importedCandidate.init !== 'function') {
                            const keys = Object.keys(importedCandidate || {});
                            for (const k of keys) {
                                const v = importedCandidate[k];
                                if (v && typeof v.init === 'function') {
                                    importedCandidate = v;
                                    break;
                                }
                            }
                        }
                        mod = importedCandidate;
                    }
                    const res = await this.server.openWithModule(mod, [token, token.substring(0, token.lastIndexOf(' '))], esmRoom.name, settings);
                    if (res?.pid) {
                        const room = this.server.getRoom(res.pid);
                        if (room)
                            this.monitor.trackRoom(res.pid, room.room, room.botName);
                    }
                    message.edit({
                        embeds: [
                            embed.setDescription(`Room running (ESM)! [Click here to join.](${res?.link})\nPID: ${res?.pid}\n${settingsMsg}`),
                        ],
                    });
                }
                catch (err) {
                    message.edit({ embeds: [embed.setDescription(`Unable to open the room!\n ${err}`)] });
                }
            }
        }
        if (command === 'info') {
            const roomList = await this.getRoomNameList();
            const esmRooms = await this.loadEsmRooms();
            embed.setTitle('Information').addFields({ name: 'Open rooms', value: roomList }, { name: 'Bot list', value: this.bots.map((b) => b.display || b.name).join('\n') }, { name: 'ESM rooms', value: esmRooms.map((r) => r.name).join('\n') || 'None' }, {
                name: 'Custom settings list',
                value: this.customSettings
                    ? Object.keys(this.customSettings).join('\n')
                    : 'No custom settings have been specified.',
            });
            await msg.channel.send({ embeds: [embed] });
            return;
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
            const serverCPUUsage = `Server Memory: ${(serverMem.heapUsed / 1024 / 1024).toFixed(2)} MB\n`;
            const roomMessage = this.server.browsers.length > 0 ? `\nOpen rooms: ${this.server.browsers.length}` : '';
            embed.setDescription(serverCPUUsage + roomMessage + '\n');
            message.edit({ embeds: [embed] });
        }
        if (command === 'metrics') {
            embed.setTitle('Room Metrics');
            const allMetrics = this.monitor.getAllMetrics();
            if (allMetrics.length === 0) {
                embed.setDescription('No active rooms to monitor.');
                await msg.channel.send({ embeds: [embed] });
                return;
            }
            let description = '';
            for (const m of allMetrics) {
                const uptime = Math.round(m.uptime / 1000);
                description += `**Sala ${m.pid}** (${m.botName})\n`;
                description += `  Tempo ativo: ${uptime}s | Jogadores: ${m.playerCount} | Jogos: ${m.gameCount}\n`;
                description += `  Entradas: ${m.playerJoinCount} | Saidas: ${m.playerLeaveCount} | Msgs: ${m.messageCount} | Erros: ${m.errorCount}\n\n`;
            }
            embed.setDescription(description || 'No metrics available.');
            await msg.channel.send({ embeds: [embed] });
            return;
        }
        if (command === 'close') {
            embed.setTitle('Close room').setDescription('Unable to find room');
            if (args[0] === 'all') {
                const roomCount = this.server.browsers.length;
                await this.server.closeAll();
                for (const metrics of this.monitor.getAllMetrics())
                    this.monitor.untrackRoom(metrics.pid);
                embed.setDescription(`${roomCount} rooms have been removed from tracking.`);
                await msg.channel.send({ embeds: [embed] });
                return;
            }
            const res = await this.server.close(text);
            if (res)
                embed.setDescription('Room closed!');
            await msg.channel.send({ embeds: [embed] });
            return;
        }
        if (command === 'exit') {
            embed.setTitle('Closing').setDescription('Closing server...');
            await msg.channel.send({ embeds: [embed] });
            await this.server.closeAll();
            process_1.default.exit(0);
        }
        if (command === 'reload') {
            embed.setTitle('Reload bots and custom settings').setColor(0xff0000);
            (0, loadConfig_1.loadConfig)(this.fileName)
                .then((config) => {
                if (!config.panel.bots)
                    embed.setDescription('Could not find bots in config file.');
                else {
                    this.loadBots(config.panel.bots);
                    if (config.panel.customSettings)
                        this.loadCustomSettings(config.panel.customSettings);
                    this.maxRooms = config.panel.maxRooms;
                    if (config.panel.rooms) {
                        this.panelConfig.rooms = config.panel.rooms;
                        // reset ESM cache to pick updated rooms
                        this.esmRoomsCache = [];
                    }
                    embed.setColor(0x0099ff).setDescription('Bot list and custom settings reloaded!');
                }
                channel.send({ embeds: [embed] });
            })
                .catch((err) => {
                embed.setDescription(`*${err.message}*\n\nSee logs for details.`);
                channel.send({ embeds: [embed] });
            });
            return;
        }
    }
}
exports.ControlPanel = ControlPanel;
//    __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
//# sourceMappingURL=ControlPanel.js.map