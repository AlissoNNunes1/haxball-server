// Full rewrite: create a single clean ControlPanel implementation
// Full rewrite: create a single clean ControlPanel implementation
import * as Discord from 'discord.js';
import os from 'node-os-utils';
import process from 'process';
import path from 'path';
import { pathToFileURL } from 'url';

import { CustomSettings, CustomSettingsList, PanelConfig } from './Global';
import { Server } from './Server';
import { RoomMonitor } from './debugging/RoomMonitor';
import { Bot } from './Bot';

import { loadConfig } from './utils/loadConfig';
import { log } from './utils/log';

export class ControlPanel {
  private client: Discord.Client;
  private prefix: string;
  private token: string;
  private mastersDiscordId: string[] = [];
  private maxRooms?: number;

  private bots: Bot[] = [];
  private customSettings: CustomSettingsList | undefined;

  private mem: any;
  private cpu: any;

  private monitor: RoomMonitor;
  private esmRoomsCache: { name: string; module: any }[] = [];
  private panelConfig: PanelConfig;

  constructor(private server: Server, config: PanelConfig, private fileName?: string) {
    this.panelConfig = config;
    this.prefix = config.discordPrefix;
    this.token = config.discordToken;
    this.mastersDiscordId = config.mastersDiscordId ?? [];
    this.maxRooms = config.maxRooms;

    this.mem = os.mem;
    this.cpu = os.cpu;

    this.client = new Discord.Client({
      intents: [
        Discord.GatewayIntentBits.Guilds,
        Discord.GatewayIntentBits.GuildMessages,
        Discord.GatewayIntentBits.MessageContent,
      ],
    });

    this.monitor = new RoomMonitor();
    this.monitor.startPeriodicReports(300000);

    if (config.customSettings) this.loadCustomSettings(config.customSettings);
    this.loadBots(config.bots);

    if (config.rooms && Array.isArray(config.rooms)) {
      this.esmRoomsCache = this.esmRoomsCache.concat(
        config.rooms.map((r) => ({ name: r.name, module: { path: r.path, displayName: r.displayName } }))
      );
    }

    this.client.on('ready', () => {
      log('DISCORD', `Logged in as ${this.client.user?.tag}!`);
    });

    this.client.on('messageCreate', async (msg) => {
      try {
        await this.command(msg);
      } catch (e) {
        if (msg.channel && 'send' in msg.channel) this.logError(e, msg.channel as Discord.TextChannel);
        else log('DISCORD', `Error handling command: ${e}`);
      }
    });

    if (this.token) void this.client.login(this.token);
  }

  private transformSetting(setting: CustomSettings, list: CustomSettingsList) {
    if (setting.extends) {
      const extensions = typeof setting.extends === 'string' ? [setting.extends] : setting.extends;
      let newSetting: CustomSettings = {};

      for (const e of extensions) {
        let ext = list[e];
        if (ext) {
          if (ext.extends) ext = this.transformSetting(ext, list);
          newSetting = { ...newSetting, ...ext };
        }
      }

      newSetting = { ...newSetting, ...setting };
      delete newSetting.extends;
      return newSetting;
    }

    return setting;
  }

  private loadCustomSettings(customSettings: CustomSettingsList) {
    this.customSettings = undefined;
    for (const [key, value] of Object.entries(customSettings)) {
      customSettings[key] = this.transformSetting(value, customSettings);
    }
    this.customSettings = customSettings;
  }

  private loadBots(bots: PanelConfig['bots']) {
    this.bots = [];

    if (!Array.isArray(bots) && bots && typeof bots === 'object') {
      for (const [name, p] of Object.entries(bots as Record<string, string>)) {
        this.bots.push(new Bot(name, p));
      }
    } else if (Array.isArray(bots)) {
      for (const b of bots) {
        this.bots.push(new Bot(b.name, b.path, b.displayName));
      }
    }
  }

  private async loadEsmRooms() {
    if (this.esmRoomsCache.length > 0) return this.esmRoomsCache;
    try {
      const modulePath = pathToFileURL(path.resolve(__dirname, '../apps/discord-bot/index.mjs')).href;
      // Use runtime dynamic import via Function to avoid TypeScript compiling to require()
      const dynamicImport = new Function('s', 'return import(s)');
      const mod = await dynamicImport(modulePath);
      const listFn = (mod as any).listAvailableRooms;
      if (typeof listFn === 'function') {
        const list = await listFn();
        if (Array.isArray(list)) {
          this.esmRoomsCache = this.esmRoomsCache.concat(list.map((r: any) => ({ name: r.name, module: r.module || r })));
        }
      }
    } catch (err) {
      log('DISCORD', `WARN: apps/discord-bot discovery failed: ${(err && (err as Error).message) || err}`);
    }

    if (this.panelConfig?.rooms && Array.isArray(this.panelConfig.rooms)) {
      for (const entry of this.panelConfig.rooms) {
        const roomEntry = entry as { name: string; path: string; type?: string };
        try {
          const modPath = pathToFileURL(
            path.resolve(this.fileName ? path.dirname(this.fileName) : path.resolve('.'), roomEntry.path)
          ).href;
          const dynamicImport = new Function('s', 'return import(s)');
          const rmod = await dynamicImport(modPath);
          let modCandidate: any = rmod?.default ?? rmod;
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
        } catch (err) {
          this.esmRoomsCache.push({ name: roomEntry.name, module: { path: roomEntry.path } });
        }
      }
    }

    return this.esmRoomsCache;
  }

  private async logError(e: unknown, channel: Discord.TextChannel) {
    const errorMessage = e instanceof Error ? e.message : typeof e === 'string' ? e : JSON.stringify(e);
    const embed = new Discord.EmbedBuilder().setColor('#0099ff').setTitle('Log Error').setTimestamp(Date.now()).setDescription(errorMessage);
    await channel.send({ embeds: [embed] });
  }

  private async getRoomNameList() {
    const rooms: string[] = [];
    for (const browser of this.server.browsers) {
      const nameStr = `Room ${browser.link} (PID: ${browser.pid})${browser.remotePort ? ` (localhost:${browser.remotePort})` : ''}`;
      rooms.push(nameStr);
    }
    if (rooms.length === 0) return 'There are no open rooms!';
    return rooms.join('\n');
  }

  private async command(msg: Discord.Message): Promise<void> {
    if (!msg.channel || !('send' in msg.channel)) return;
    const channel = msg.channel as Discord.TextChannel;
    if (!msg.content.startsWith(this.prefix)) return;

    const args = msg.content.slice(this.prefix.length).trim().split(' ').filter(Boolean);
    const text = msg.content.slice(this.prefix.length).trim().replace(args[0] + ' ', '');
    const command = args.shift()?.toLowerCase();

    const embed = new Discord.EmbedBuilder().setColor('#0099ff');

    if (!this.mastersDiscordId.includes(msg.author.id)) return;

    if (command === 'help') {
      embed
        .setTitle('Help')
        .setDescription('Haxball Server Control Panel commands')
        .addFields(
          { name: 'help', value: 'Command list.', inline: true },
          { name: 'info', value: 'Server info.', inline: true },
          { name: 'meminfo', value: 'CPU and memory info.', inline: true },
          { name: 'metrics', value: 'Show room metrics.', inline: true },
          { name: 'open', value: 'Open a room.', inline: true },
          { name: 'esm-rooms', value: 'List ESM room modules available', inline: true },
          { name: 'close', value: 'Close a room.', inline: true },
          { name: 'reload', value: 'Reload the bot configuration.', inline: true },
          { name: 'exit', value: 'Close the server.', inline: true },
          { name: 'tokenlink', value: 'Haxball Headless Token page.', inline: true }
        );
      await msg.channel.send({ embeds: [embed] });
      return;
    }

    if (command === 'tokenlink') {
      embed.setTitle('Headless Token').setDescription(`[Click here.](https://www.haxball.com/headlesstoken)`);
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

      let token = text.replace(args[0] || '', '').trim().replace(/"/g, '').replace('Token obtained: ', '');
      if (!token) {
        embed.setDescription(`You have to define a [headless token](https://www.haxball.com/headlesstoken) as second argument: ${this.prefix}open <bot> <token>`);
        await msg.channel.send({ embeds: [embed] });
        return;
      }

      let settings: CustomSettings | undefined;
      let settingsMsg = 'No setting has been loaded (not specified or not found).';

      if (this.customSettings != null) {
        const settingArg = args[args.length - 1];
        settings = this.customSettings[settingArg];
        if (settings) {
          settingsMsg = `\`${settingArg}\` settings have been loaded.`;
          token = token.replace(settingArg, '').trim();
        } else if (this.customSettings['default']) {
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
            if (room) this.monitor.trackRoom(res.pid, room.room, room.botName);
          }
          message.edit({ embeds: [embed.setDescription(`Room running! [Click here to join.](${res?.link})\nPID: ${res?.pid}\n${settingsMsg}`)] });
        } catch (err) {
          message.edit({ embeds: [embed.setDescription(`Unable to open the room!\n ${err}`)] });
        }

        return;
      }

      if (esmRoom) {
        try {
          let mod = esmRoom.module;
          if (mod && mod.path) {
            const modPath = pathToFileURL(path.resolve(this.fileName ? path.dirname(this.fileName) : path.resolve('.'), mod.path)).href;
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
            if (room) this.monitor.trackRoom(res.pid, room.room, room.botName);
          }

          message.edit({ embeds: [embed.setDescription(`Room running (ESM)! [Click here to join.](${res?.link})\nPID: ${res?.pid}\n${settingsMsg}`)] });
        } catch (err) {
          message.edit({ embeds: [embed.setDescription(`Unable to open the room!\n ${err}`)] });
        }
      }
    }

    if (command === 'info') {
      const roomList = await this.getRoomNameList();
      const esmRooms = await this.loadEsmRooms();
      embed.setTitle('Information').addFields(
        { name: 'Open rooms', value: roomList },
        { name: 'Bot list', value: this.bots.map((b) => b.display || b.name).join('\n') },
        { name: 'ESM rooms', value: esmRooms.map((r) => r.name).join('\n') || 'None' },
        { name: 'Custom settings list', value: this.customSettings ? Object.keys(this.customSettings).join('\n') : 'No custom settings have been specified.' }
      );
      await msg.channel.send({ embeds: [embed] });
      return;
    }

    if (command === 'meminfo') {
      const embedLoading = new Discord.EmbedBuilder().setColor('#0099ff').setTitle('Information').setDescription('Loading...');
      const message = await msg.channel.send({ embeds: [embedLoading] });
      const memInfo = await this.mem.info();
      const cpuUsage = await this.cpu.usage();
      embed
        .setTitle('Information')
        .addFields(
          { name: 'CPUs', value: String(this.cpu.count()), inline: true },
          { name: 'CPU usage', value: cpuUsage + '%', inline: true },
          { name: 'Free CPU', value: 100 - cpuUsage + '%', inline: true },
          { name: 'Memory', value: `${(memInfo.usedMemMb / 1000).toFixed(2)}/${(memInfo.totalMemMb / 1000).toFixed(2)} GB (${memInfo.freeMemPercentage}% livre)`, inline: true },
          { name: 'OS', value: String(await os.os.oos()), inline: true },
          { name: 'Machine Uptime', value: new Date(os.os.uptime() * 1000).toISOString().substr(11, 8), inline: true }
        );
      const serverMem = process.memoryUsage();
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
        for (const metrics of this.monitor.getAllMetrics()) this.monitor.untrackRoom(metrics.pid);
        embed.setDescription(`${roomCount} rooms have been removed from tracking.`);
        await msg.channel.send({ embeds: [embed] });
        return;
      }
      const res = await this.server.close(text);
      if (res) embed.setDescription('Room closed!');
      await msg.channel.send({ embeds: [embed] });
      return;
    }

    if (command === 'exit') {
      embed.setTitle('Closing').setDescription('Closing server...');
      await msg.channel.send({ embeds: [embed] });
      await this.server.closeAll();
      process.exit(0);
    }

    if (command === 'reload') {
      embed.setTitle('Reload bots and custom settings').setColor(0xff0000);
      loadConfig(this.fileName)
        .then((config) => {
          if (!config.panel.bots) embed.setDescription('Could not find bots in config file.');
          else {
            this.loadBots(config.panel.bots);
            if (config.panel.customSettings) this.loadCustomSettings(config.panel.customSettings);
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
          embed.setDescription(`*${(err as Error).message}*\n\nSee logs for details.`);
          channel.send({ embeds: [embed] });
        });
      return;
    }
  }
}

//    __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
