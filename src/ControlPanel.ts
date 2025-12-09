import * as Discord from 'discord.js';
import fs from 'fs';
import os from 'node-os-utils';
import process from 'process';

import { CustomSettings, CustomSettingsList, PanelConfig } from './Global';
import { Server } from './Server';
import { RoomMonitor } from './debugging/RoomMonitor';

import { loadConfig } from './utils/loadConfig';
import { log } from './utils/log';

/**
 * Classe que representa um bot script carregavel
 * @class Bot
 * @property {string} name - Nome unico do bot
 * @property {string} path - Caminho para o arquivo do script
 * @property {string} [displayName] - Nome exibido (opcional)
 */
class Bot {
  /**
   * Cria uma instancia de Bot
   * @param {string} name - Nome unico do bot
   * @param {string} path - Caminho para o arquivo do script
   * @param {string} [displayName] - Nome exibido (opcional)
   */
  constructor(public name: string, public path: string, public displayName?: string) {}

  /**
   * Le o conteudo do arquivo do bot script
   * @returns {Promise<string>} Conteudo do arquivo do bot script
   * @throws {Error} Se arquivo nao pode ser lido
   */
  read(): Promise<string> {
    return new Promise((resolve, reject) => {
      fs.readFile(this.path, { encoding: 'utf-8' }, async (err, data) => {
        if (err) {
          reject(err);
        } else {
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
  run(
    server: Server,
    data: string,
    tokens: string | string[],
    settings?: CustomSettings
  ): ReturnType<Server['open']> {
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
export class ControlPanel {
  private client = new Discord.Client({
    intents: [
      Discord.GatewayIntentBits.Guilds,
      Discord.GatewayIntentBits.GuildMessages,
      Discord.GatewayIntentBits.MessageContent,
    ],
  });

  private cpu = os.cpu;
  private mem = os.mem;

  private prefix: string;
  private token: string;

  private mastersDiscordId: string[];

  private bots: Bot[] = [];

  private customSettings?: CustomSettingsList;

  private maxRooms?: number;

  private monitor: RoomMonitor;

  /**
   * Inicializa o painel de controle Discord
   * @param {Server} server - Instancia do gerenciador de servidores
   * @param {PanelConfig} config - Configuracoes do painel
   * @param {string} [fileName] - Nome do arquivo de configuracao (opcional)
   */
  constructor(private server: Server, config: PanelConfig, private fileName?: string) {
    this.prefix = config.discordPrefix;
    this.token = config.discordToken;
    this.mastersDiscordId = config.mastersDiscordId;
    this.maxRooms = config.maxRooms;

    // Inicializar monitor de salas
    this.monitor = new RoomMonitor();
    this.monitor.startPeriodicReports(300000); // Relatorios a cada 5 minutos

    //    __  ____ ____ _  _
    //  / _\/ ___) ___) )( \
    // /    \___ \___ ) \/ (
    // \_/\_(____(____|____/

    if (config.customSettings) this.loadCustomSettings(config.customSettings);
    this.loadBots(config.bots);

    this.client.on('ready', () => {
      log('DISCORD', `Logged in as ${this.client.user?.tag}!`);
    });

    this.client.on('messageCreate', async (msg) => {
      try {
        this.command(msg);
      } catch (e) {
        this.logError(e, msg.channel as Discord.TextChannel);
      }
    });

    this.client.login(this.token);
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

    for (const entry of Object.entries(customSettings)) {
      const key = entry[0];
      const value = entry[1];

      customSettings[key] = this.transformSetting(value, customSettings);
    }

    this.customSettings = customSettings;
  }

  private loadBots(bots: PanelConfig['bots']) {
    this.bots = [];

    if (!Array.isArray(bots)) {
      for (const entry of Object.entries(bots)) {
        const name = entry[0];
        const path = entry[1];

        this.bots.push(new Bot(name, path));
      }
    } else {
      for (const bot of bots) {
        this.bots.push(new Bot(bot.name, bot.path, bot.displayName));
      }
    }
  }

  private async logError(e: unknown, channel: Discord.TextChannel) {
    const errorMessage =
      e instanceof Error ? e.message : typeof e === 'string' ? e : JSON.stringify(e);

    const embed = new Discord.EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Log Error')
      .setTimestamp(Date.now())
      .setDescription(errorMessage);

    await channel.send({ embeds: [embed] });
  }

  private async getRoomNameList() {
    const rooms: string[] = [];

    for (const browser of this.server.browsers) {
      // Browser info simplificado - sem acesso a pages/proxyServer
      const nameStr = `Room ${browser.link} (PID: ${browser.pid})${
        browser.remotePort ? ` (localhost:${browser.remotePort})` : ''
      }`;

      rooms.push(nameStr);
    }

    if (rooms.length === 0) return 'There are no open rooms!';

    return rooms.join('\\n');
  }

  private async command(msg: Discord.Message) {
    // Type guard para garantir canal com metodo send
    if (!msg.channel || !('send' in msg.channel)) return;

    const channel = msg.channel as Discord.TextChannel;

    if (!msg.content.startsWith(this.prefix)) return;

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
          .addFields(
            { name: 'help', value: 'Command list.', inline: true },
            { name: 'info', value: 'Server info.', inline: true },
            { name: 'meminfo', value: 'CPU and memory info.', inline: true },
            { name: 'metrics', value: 'Show room metrics.', inline: true },
            { name: 'open', value: 'Open a room.', inline: true },
            { name: 'close', value: 'Close a room.', inline: true },
            { name: 'reload', value: 'Reload the bot configuration.', inline: true },
            { name: 'exit', value: 'Close the server.', inline: true },
            { name: 'tokenlink', value: 'Haxball Headless Token page.', inline: true }
          );

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
          embed.setDescription(
            `Maximum number of rooms (${this.maxRooms}) excedeed. Update configuration to change this.`
          );

          return msg.channel.send({ embeds: [embed] });
        }

        const bot = this.bots.find((b) => b.name === args[0]);

        if (!bot) {
          embed.setDescription(
            `This bot does not exist. Type ${this.prefix}info to see the list of available bots.`
          );

          return msg.channel.send({ embeds: [embed] });
        }

        let token = text
          .replace(args[0], '')
          .trim()
          .replace(/\"/g, '')
          .replace('Token obtained: ', '');

        if (!token || token === '') {
          embed.setDescription(
            `You have to define a [headless token](https://www.haxball.com/headlesstoken) as second argument: ${this.prefix}open <bot> <token>`
          );

          return msg.channel.send({ embeds: [embed] });
        }

        let settings: CustomSettings;
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

        bot
          .read()
          .then((script) => {
            bot
              .run(
                this.server,
                script,
                [token, token.substring(0, token.lastIndexOf(' '))],
                settings
              )
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
                    embed.setDescription(
                      `Room running! [Click here to join.](${e?.link})\nBrowser process: ${e?.pid}${
                        e?.remotePort ? `\nRemote debugging: localhost:${e.remotePort}` : ''
                      }\n${settingsMsg}`
                    ),
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

        embed.setTitle('Information').addFields(
          { name: 'Open rooms', value: roomList },
          { name: 'Bot list', value: this.bots.map((b) => b.name).join('\n') },
          {
            name: 'Custom settings list',
            value: this.customSettings
              ? Object.keys(this.customSettings).join('\n')
              : 'No custom settings have been specified.',
          }
        );

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

        embed.setTitle('Information').addFields(
          { name: 'CPUs', value: String(this.cpu.count()), inline: true },
          { name: 'CPU usage', value: cpuUsage + '%', inline: true },
          { name: 'Free CPU', value: 100 - cpuUsage + '%', inline: true },
          {
            name: 'Memory',
            value: `${(memInfo.usedMemMb / 1000).toFixed(2)}/${(memInfo.totalMemMb / 1000).toFixed(
              2
            )} GB (${memInfo.freeMemPercentage}% livre)`,
            inline: true,
          },
          { name: 'OS', value: String(await os.os.oos()), inline: true },
          {
            name: 'Machine Uptime',
            value: new Date(os.os.uptime() * 1000).toISOString().substr(11, 8),
            inline: true,
          }
        );

        const serverMem = process.memoryUsage();
        const serverCPUUsage = `Server Memory: ${(serverMem.heapUsed / 1024 / 1024).toFixed(
          2
        )} MB\\n`;
        const roomMessage =
          this.server.browsers.length > 0 ? `\\nOpen rooms: ${this.server.browsers.length}` : '';

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

        process.exit(0);
      }

      // Comando eval removido por questoes de seguranca
      // Execute codigo diretamente no servidor se necessario

      if (command === 'reload') {
        embed.setTitle('Reload bots and custom settings').setColor(0xff0000);

        loadConfig(this.fileName)
          .then((config) => {
            if (!config.panel.bots) {
              embed.setDescription('Could not find bots in config file.');
            } else {
              this.loadBots(config.panel.bots);
              if (config.panel.customSettings) this.loadCustomSettings(config.panel.customSettings);
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
