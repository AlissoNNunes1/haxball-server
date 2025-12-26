// Full rewrite: create a single clean ControlPanel implementation
// Full rewrite: create a single clean ControlPanel implementation
import * as Discord from 'discord.js';
import { MessageFlags } from 'discord.js';
import os from 'node-os-utils';
import path from 'path';
import process from 'process';
import { pathToFileURL } from 'url';

import { Bot } from './Bot';
import { CustomSettings, CustomSettingsList, PanelConfig } from './Global';
import { Server } from './Server';
import { AuthCommands } from './auth/AuthCommands';
import { registerSlashCommands } from './commands/registerSlashCommands';
import { RoomMonitor } from './debugging/RoomMonitor';
import { RoleManager } from './utils/RoleManager';
import { TokenManager } from './utils/TokenManager';

import { buildChampionshipSettings, resolveChampionshipBotPath } from './utils/championship';
import { loadConfig } from './utils/loadConfig';
import { log } from './utils/log';

export class ControlPanel {
  private client: Discord.Client;
  private prefix: string;
  private token: string;
  private mastersDiscordId: string[] = [];
  private moderatorIds: string[] = [];
  private adminChannelId?: string;
  private generalChannelId?: string;
  private guildId?: string;
  private maxRooms?: number;

  private bots: Bot[] = [];
  private customSettings: CustomSettingsList | undefined;

  private mem: any;
  private cpu: any;

  private monitor: RoomMonitor;
  private esmRoomsCache: { name: string; module: any }[] = [];
  private panelConfig: PanelConfig;
  private authCommands: AuthCommands;
  private tokenManager: TokenManager;
  private roleManager: RoleManager;

  constructor(private server: Server, config: PanelConfig, private fileName?: string) {
    this.panelConfig = config;
    this.prefix = config.discordPrefix;
    this.token = config.discordToken;
    this.mastersDiscordId = config.mastersDiscordId ?? [];
    this.moderatorIds = (config as any).moderatorIds ?? [];
    this.adminChannelId = config.adminChannelId;
    this.generalChannelId = config.generalChannelId;
    this.guildId = config.guildId;
    this.maxRooms = config.maxRooms;

    // Inicializa gerenciadores
    this.tokenManager = new TokenManager();
    this.tokenManager.startPeriodicCleanup();

    this.roleManager = new RoleManager();
    for (const masterId of this.mastersDiscordId) {
      this.roleManager.setUserRole(masterId, 'master');
    }
    this.roleManager.setModerators(this.moderatorIds);

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
        config.rooms.map((r) => ({
          name: r.name,
          module: { path: r.path, displayName: r.displayName },
        }))
      );
    }

    this.client.on('ready', async () => {
      log('DISCORD', `Logged in as ${this.client.user?.tag}!`);

      // Registra Slash Commands
      if (this.client.user) {
        const clientId = this.client.user.id;
        // Use guildId para teste rapido (instantaneo), ou undefined para global (ate 1h)
        const guildId = this.guildId;

        if (guildId) {
          log('DISCORD', `Registrando comandos no servidor ${guildId} (rapido)`);
        } else {
          log('DISCORD', 'Registrando comandos globalmente (pode levar ate 1 hora)');
        }

        await registerSlashCommands(this.token, clientId, guildId);
      }
    });

    this.client.on('interactionCreate', async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      try {
        await this.handleSlashCommand(interaction);
      } catch (e) {
        console.error('Error handling slash command:', e);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: 'Ocorreu um erro ao processar o comando.',
            flags: MessageFlags.Ephemeral,
          });
        }
      }
    });

    this.client.on('messageCreate', async (msg) => {
      try {
        await this.command(msg);
      } catch (e) {
        if (msg.channel && 'send' in msg.channel)
          this.logError(e, msg.channel as Discord.TextChannel);
        else log('DISCORD', `Error handling command: ${e}`);
      }
    });

    // Inicializa sistema de autenticacao
    this.authCommands = new AuthCommands();
    this.authCommands.startSessionCleanup();
    log('AUTH', 'Sistema de autenticacao inicializado');

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
      const modulePath = pathToFileURL(
        path.resolve(__dirname, '../apps/discord-bot/index.mjs')
      ).href;
      // Use runtime dynamic import via Function to avoid TypeScript compiling to require()
      const dynamicImport = new Function('s', 'return import(s)');
      const mod = await dynamicImport(modulePath);
      const listFn = (mod as any).listAvailableRooms;
      if (typeof listFn === 'function') {
        const list = await listFn();
        if (Array.isArray(list)) {
          this.esmRoomsCache = this.esmRoomsCache.concat(
            list.map((r: any) => ({ name: r.name, module: r.module || r }))
          );
        }
      }
    } catch (err) {
      log(
        'DISCORD',
        `WARN: apps/discord-bot discovery failed: ${(err && (err as Error).message) || err}`
      );
    }

    if (this.panelConfig?.rooms && Array.isArray(this.panelConfig.rooms)) {
      for (const entry of this.panelConfig.rooms) {
        const roomEntry = entry as { name: string; path: string; type?: string };
        try {
          const modPath = pathToFileURL(
            path.resolve(
              this.fileName ? path.dirname(this.fileName) : path.resolve('.'),
              roomEntry.path
            )
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
      const nameStr = `Room ${browser.link} (PID: ${browser.pid})${
        browser.remotePort ? ` (localhost:${browser.remotePort})` : ''
      }`;
      rooms.push(nameStr);
    }
    if (rooms.length === 0) return 'There are no open rooms!';
    return rooms.join('\n');
  }

  private async handleSlashCommand(
    interaction: Discord.ChatInputCommandInteraction
  ): Promise<void> {
    const commandName = interaction.commandName;

    // Comandos de autenticacao (sem necessidade de master check)
    if (
      ['register', 'linkdiscord', 'profile', 'ranking', 'top', 'authhelp', 'amistoso'].includes(
        commandName
      )
    ) {
      // Verifica canal geral se configurado (amistoso pode ser em geral)
      if (commandName === 'amistoso') {
        // Amistoso pode ser em qualquer canal
        await this.handleAmistosoSlash(interaction);
      } else if (this.generalChannelId && interaction.channelId !== this.generalChannelId) {
        await interaction.reply({
          content: `Comandos de autenticacao devem ser usados no canal <#${this.generalChannelId}>.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      } else {
        await this.authCommands.handleInteraction(interaction);
      }
      return;
    }

    // Verifica permissao baseada em roles
    const userRole = this.roleManager.getUserRole(interaction.user.id);

    // Mapeamento de comandos para permissoes necessarias
    const commandPermissions: Record<string, keyof import('./utils/RoleManager').RoleConfig> = {
      open: 'canOpenRooms',
      close: 'canCloseRooms',
      reload: 'canReload',
      exit: 'canExit',
      championship: 'canManageChampionship',
      help: 'canViewMetrics',
      info: 'canViewMetrics',
      meminfo: 'canViewMetrics',
      metrics: 'canViewMetrics',
      tokenlink: 'canOpenRooms',
    };

    const requiredPermission = commandPermissions[commandName];

    if (
      requiredPermission &&
      !this.roleManager.hasPermission(interaction.user.id, requiredPermission)
    ) {
      const roleEmoji = userRole === 'master' ? '👑' : userRole === 'moderator' ? '🛡️' : '👤';
      await interaction.reply({
        content: `${roleEmoji} Sem permissao. Seu role (${userRole}) nao pode executar este comando.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Verifica canal admin se configurado (exceto /help que funciona em qualquer canal)
    if (
      commandName !== 'help' &&
      this.adminChannelId &&
      interaction.channelId !== this.adminChannelId
    ) {
      await interaction.reply({
        content: `Comandos admin devem ser usados no canal <#${this.adminChannelId}>.`,
        flags: MessageFlags.Ephemeral,
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
      case 'championship':
        await this.handleChampionshipSlash(interaction);
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
          flags: MessageFlags.Ephemeral,
        });
    }
  }

  private async handleHelpSlash(interaction: Discord.ChatInputCommandInteraction) {
    const isAdminChannel = this.adminChannelId && interaction.channelId === this.adminChannelId;
    const isGeneralChannel =
      this.generalChannelId && interaction.channelId === this.generalChannelId;

    let description: string;

    if (isAdminChannel) {
      // Conteudo para canal admin
      description = [
        '**Comandos de Admin (Canal Admin):**',
        '`/help` - Lista de comandos disponiveis',
        '`/info` - Informacoes sobre salas abertas',
        '`/meminfo` - Uso de memoria e CPU',
        '`/metrics` - Metricas do servidor',
        '`/championship open <preset> <home> <away> <token>` - Abre campeonato',
        '`/open <bot> <token> [setting]` - Abre sala com bot',
        '`/close <pid|all>` - Fecha sala(s)',
        '`/reload` - Recarrega configuracao',
        '`/exit` - Desliga o servidor',
        '`/tokenlink` - Gera link para token Haxball',
        '',
        '💡 **Dica:** Use `/help` no canal geral para ver comandos de autenticacao',
      ].join('\n');
    } else if (isGeneralChannel) {
      // Conteudo para canal geral
      description = [
        '**Comandos de Autenticacao (Canal Geral):**',
        '`/register <nick> <senha>` - Cria nova conta CHA',
        '`/linkdiscord <nick> <senha>` - Vincula Discord a conta existente',
        '`/profile [nick]` - Ver perfil de jogador',
        '`/ranking [nick]` - Ver ranking (alias de profile)',
        '`/top [criterio]` - Top 10 jogadores (ranking ou pontos)',
        '`/authhelp` - Detalhes de autenticacao',
        '',
        '⚽ **Comandos na Sala Haxball:**',
        '`!help` - Lista de comandos dentro da sala',
        '`!login` - Faz login da sua conta',
        '`!profile [nick]` - Ver perfil',
        '`!stats` - Suas estatisticas',
        '`!top` - Top jogadores',
        '`!afk` - Marca como ausente',
        '`!bb` - BomBom (reacao)',
        '`!discord` - Link do Discord',
        '',
        '💬 **Chat:**',
        '`t <mensagem>` - Team chat (apenas seu time)',
        '`@@ <nome> <mensagem>` - Mensagem privada',
      ].join('\n');
    } else {
      // Conteudo padrao (quando nenhum canal configurado ou em outro canal)
      const channelInfo: string[] = [];
      if (this.adminChannelId) {
        channelInfo.push(`**Canal Admin:** <#${this.adminChannelId}>`);
      }
      if (this.generalChannelId) {
        channelInfo.push(`**Canal Geral:** <#${this.generalChannelId}>`);
      }

      description = [
        channelInfo.length > 0 ? channelInfo.join(' | ') + '\n' : '',
        '**Comandos de Admin:**',
        '`/help` - Lista todos os comandos',
        '`/info` - Informacoes sobre salas abertas',
        '`/meminfo` - Uso de memoria e CPU',
        '`/metrics` - Metricas do servidor',
        '`/championship open <preset> <home> <away> <token>` - Abre sala de campeonato temporaria',
        '`/open <bot> <token> [setting]` - Abre sala com bot',
        '`/close <pid|all>` - Fecha sala(s)',
        '`/reload` - Recarrega configuracao',
        '`/exit` - Desliga o servidor',
        '`/tokenlink` - Gera link para token Haxball',
        '',
        '**Comandos de Autenticacao:**',
        '`/authhelp` - Lista detalhada de comandos de autenticacao',
        '`/register <nick> <senha>` - Cria nova conta CHA',
        '`/linkdiscord <nick> <senha>` - Vincula Discord a conta existente',
        '`/profile [nick]` - Ver perfil de jogador',
        '`/ranking [nick]` - Ver ranking (alias de profile)',
        '`/top [criterio]` - Top 10 jogadores (ranking ou pontos)',
        '',
        '**Comandos na Sala Haxball:**',
        'Use `!help` dentro da sala para ver todos os comandos disponiveis',
        'Comandos: `!login`, `!profile`, `!stats`, `!ranking`, `!top`, `!afk`, `!bb`, `!discord`',
        'Chat: `t <mensagem>` (team chat), `@@ <nome> <mensagem>` (PM)',
      ].join('\n');
    }

    const embed = new Discord.EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Comandos CHA Haxball Server')
      .setDescription(description)
      .setTimestamp(Date.now());

    await interaction.reply({ embeds: [embed] });
  }

  private async handleInfoSlash(interaction: Discord.ChatInputCommandInteraction) {
    const roomList = await this.getRoomNameList();
    const embed = new Discord.EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Salas Abertas')
      .setDescription(roomList)
      .setTimestamp(Date.now());
    await interaction.reply({ embeds: [embed] });
  }

  private async handleMemInfoSlash(interaction: Discord.ChatInputCommandInteraction) {
    const memUsage = process.memoryUsage();
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

  private async handleMetricsSlash(interaction: Discord.ChatInputCommandInteraction) {
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

  private async handleOpenSlash(interaction: Discord.ChatInputCommandInteraction) {
    const botName = interaction.options.getString('bot', true);
    let token = interaction.options.getString('token', true);
    const setting = interaction.options.getString('setting') || 'default';

    const bot = this.bots.find((b) => b.name === botName);
    if (!bot) {
      await interaction.reply({
        content: `Bot '${botName}' nao encontrado.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Verifica cache de tokens
    const tokenKey = token.substring(0, 20);
    const cachedToken = this.tokenManager.getToken(tokenKey);
    const tokenInfo = this.tokenManager.getTokenInfo(tokenKey);

    if (cachedToken && tokenInfo) {
      // Token esta em cache e valido
      const hoursSinceCreation = tokenInfo.hoursSinceCreation;

      // Avisa se token precisa ser renovado logo
      if (hoursSinceCreation > 22) {
        const embed = new Discord.EmbedBuilder()
          .setColor('#FFA500')
          .setTitle('⚠️  Token Vencendo')
          .setDescription(
            `Seu token esta vencendo em breve (${(24 - hoursSinceCreation).toFixed(1)}h restantes).`
          )
          .addFields([
            {
              name: 'Obter novo token',
              value: `[Clique aqui](${this.tokenManager.getTokenLink()}) para obter um novo token`,
            },
          ])
          .setTimestamp(Date.now());

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      }

      token = cachedToken;
    } else if (tokenInfo) {
      // Token expirou no cache, precisa novo
      const tokenLink = this.tokenManager.getTokenLink();
      const embed = new Discord.EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('🔴 Token Expirado')
        .setDescription('Seu token expirou. Voce precisa de um novo token para abrir salas.')
        .addFields([
          {
            name: 'Obter novo token',
            value: `[Clique aqui](${tokenLink}) para obter um novo token`,
          },
          {
            name: 'Como fazer',
            value:
              '1. Clique no link acima\n2. Realize o CAPTCHA\n3. Copie o token gerado\n4. Envie `/open <bot> <novo_token>`',
          },
        ])
        .setTimestamp(Date.now());

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      return;
    }

    // Verifica se o token ja esta em uso
    if (this.server.isTokenInUse(token)) {
      const existingRoom = this.server.getRoomByToken(token);
      const embed = new Discord.EmbedBuilder()
        .setColor('#FF6600')
        .setTitle('⚠️  Token em Uso')
        .setDescription('Este token ja tem uma sala aberta no momento.')
        .addFields([
          {
            name: 'Sala em Uso',
            value: `PID: ${existingRoom?.pid}\nNome: ${existingRoom?.botName}\nLink: ${existingRoom?.link}`,
          },
          {
            name: 'Solucao',
            value: 'Feche a sala existente ou use um token diferente.',
          },
        ])
        .setTimestamp(Date.now());

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      return;
    }

    // Nota: Token nao e armazenado aqui - sera armazenado DEPOIS de validado

    await interaction.deferReply();

    try {
      const customSettings =
        this.customSettings && this.customSettings[setting]
          ? this.customSettings[setting]
          : undefined;
      const script = await bot.read();
      const browser = await bot.run(this.server, script, [token], customSettings);

      if (!browser) {
        await interaction.editReply({ content: 'Erro ao abrir sala: servidor retornou null' });
        return;
      }

      // Armazenar token no cache APOS sucesso
      this.tokenManager.storeToken(token, botName);

      const embed = new Discord.EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Sala Aberta')
        .setDescription(`Sala ${browser.link} aberta com sucesso!\nPID: ${browser.pid}`)
        .setTimestamp(Date.now());
      await interaction.editReply({ embeds: [embed] });
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);

      // Mensagem de erro mais clara para token invalido
      if (
        errorMsg.toLowerCase().includes('invalid token') ||
        errorMsg.toLowerCase().includes('forbidden')
      ) {
        await interaction.editReply({
          content:
            '❌ **Token Inválido ou Expirado**\nO token fornecido nao e valido ou expirou.\n\nObtenha um novo token em: https://www.haxball.com/headlesstoken',
        });
      } else {
        await interaction.editReply({ content: `Erro ao abrir sala: ${errorMsg}` });
      }
    }
  }

  private async handleAmistosoSlash(interaction: Discord.ChatInputCommandInteraction) {
    const tipo = interaction.options.getString('tipo', true);
    const tamanho = interaction.options.getString('tamanho', true);
    const tokenInput = interaction.options.getString('token');

    let token = tokenInput;

    // Se nao forneceu token, tenta pegar do cache
    if (!token) {
      // Avisa que precisa de token
      const tokenLink = this.tokenManager.getTokenLink();
      const embed = new Discord.EmbedBuilder()
        .setColor('#FFA500')
        .setTitle('🔑 Token Necessário')
        .setDescription('Voce precisa fornecer um token do Haxball para abrir um amistoso.')
        .addFields([
          {
            name: 'Como obter token',
            value: `1. [Clique aqui](${tokenLink}) para ir ao site\n2. Realize o CAPTCHA\n3. Copie o token gerado\n4. Use: \`/amistoso <tipo> <tamanho> <token>\``,
          },
        ])
        .setTimestamp(Date.now());

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      return;
    }

    // Verifica cache
    const tokenKey = token.substring(0, 20);
    const cachedToken = this.tokenManager.getToken(tokenKey);

    if (cachedToken) {
      token = cachedToken;
    }

    // Verifica se o token ja esta em uso
    if (this.server.isTokenInUse(token)) {
      const existingRoom = this.server.getRoomByToken(token);
      const embed = new Discord.EmbedBuilder()
        .setColor('#FF6600')
        .setTitle('⚠️  Token em Uso')
        .setDescription('Este token ja tem uma sala aberta no momento.')
        .addFields([
          {
            name: 'Sala em Uso',
            value: `PID: ${existingRoom?.pid}\nNome: ${existingRoom?.botName}\nLink: ${existingRoom?.link}`,
          },
          {
            name: 'Solucao',
            value: 'Feche a sala existente com `/close <pid>` ou use um token diferente.',
          },
        ])
        .setTimestamp(Date.now());

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      return;
    }

    if (this.maxRooms != null && this.server.browsers.length >= this.maxRooms) {
      await interaction.reply({
        content: `Limite de salas (${this.maxRooms}) atingido. Aguarde uma sala fechar.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply();

    try {
      // Seleciona bot baseado no tipo
      const botName = tipo === 'futsal' ? 'futsal-dinâmico' : 'real-soccer-dinâmico';
      const bot = this.bots.find((b) => b.name === botName);

      if (!bot) {
        await interaction.editReply({
          content: `Bot '${botName}' nao encontrado. Tente novo em breve.`,
        });
        return;
      }

      const script = await bot.read();
      const customSettings = {
        gameType: tipo,
        playerCount: parseInt(tamanho) * 2,
        autoBalance: true,
        autoStart: true,
      };

      const browser = await bot.run(this.server, script, [token], customSettings);

      if (!browser) {
        await interaction.editReply({
          content: 'Erro ao abrir sala de amistoso. Tente com um novo token.',
        });
        return;
      }

      // Armazenar token no cache APOS sucesso
      this.tokenManager.storeToken(token, `amistoso-${tipo}-${tamanho}`);

      const embed = new Discord.EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('⚽ Amistoso Aberto')
        .setDescription(`Sala de amistoso criada com sucesso!`)
        .addFields([
          { name: 'Tipo', value: tipo, inline: true },
          { name: 'Tamanho', value: `${tamanho}v${tamanho}`, inline: true },
          { name: 'Link', value: browser.link, inline: false },
          { name: 'Acesso', value: `Entre no seu jogo e procure por esta sala`, inline: false },
        ])
        .setTimestamp(Date.now());

      await interaction.editReply({ embeds: [embed] });
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);

      // Mensagem de erro mais clara para token invalido
      if (
        errorMsg.toLowerCase().includes('invalid token') ||
        errorMsg.toLowerCase().includes('forbidden')
      ) {
        await interaction.editReply({
          content:
            '❌ **Token Inválido ou Expirado**\nO token fornecido nao e valido ou expirou.\n\nObtenha um novo token em: https://www.haxball.com/headlesstoken',
        });
      } else {
        await interaction.editReply({
          content: `Erro ao abrir amistoso: ${errorMsg}\nTente com um novo token.`,
        });
      }
    }
  }

  private async handleChampionshipSlash(interaction: Discord.ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'close') {
      const pidStr = interaction.options.getString('pid', true);
      if (!pidStr) {
        await interaction.reply({ content: 'PID invalido.', flags: MessageFlags.Ephemeral });
        return;
      }
      await this.handleCloseSlash(interaction);
      return;
    }

    const preset = interaction.options.getString('preset', true);
    const token = interaction.options.getString('token', true);
    const home = interaction.options.getString('home', true);
    const away = interaction.options.getString('away', true);
    const allowSpectators = interaction.options.getBoolean('spectators') ?? true;
    const password = interaction.options.getString('password') || undefined;

    if (this.maxRooms != null && this.server.browsers.length >= this.maxRooms) {
      await interaction.reply({
        content: `Limite de salas (${this.maxRooms}) atingido. Feche uma sala antes de abrir outra.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    let championshipSettings;
    let roomName: string;

    try {
      const built = buildChampionshipSettings({
        preset,
        home,
        away,
        allowSpectators,
        password,
      });
      championshipSettings = built.settings;
      roomName = built.roomName;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      await interaction.reply({
        content: `Erro no preset: ${errorMsg}`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply();

    try {
      const botPath = resolveChampionshipBotPath();
      const bot = new Bot('cha-championship', botPath, roomName);
      const script = await bot.read();
      const browser = await bot.run(this.server, script, [token], championshipSettings);

      if (!browser) {
        await interaction.editReply({ content: 'Erro ao abrir sala de campeonato.' });
        return;
      }

      const embed = new Discord.EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Sala de Campeonato Aberta')
        .setDescription(
          `Sala ${browser.link} aberta com sucesso!\nPID: ${browser.pid}\nPreset: ${preset}\nTimes: ${home} x ${away}`
        )
        .setTimestamp(Date.now());
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      await interaction.editReply({ content: `Erro ao abrir sala de campeonato: ${errorMsg}` });
    }
  }

  private async handleCloseSlash(interaction: Discord.ChatInputCommandInteraction) {
    const pidStr = interaction.options.getString('pid', true);

    if (pidStr.toLowerCase() === 'all') {
      const count = this.server.browsers.length;
      await this.server.closeAll();
      await interaction.reply({ content: `${count} sala(s) fechada(s).` });
      return;
    }

    const pid = parseInt(pidStr, 10);
    if (isNaN(pid)) {
      await interaction.reply({ content: 'PID invalido.', flags: MessageFlags.Ephemeral });
      return;
    }

    const found = this.server.browsers.find((b) => b.pid === pid);
    if (!found) {
      await interaction.reply({
        content: `Sala com PID ${pid} nao encontrada.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await this.server.close(pid);
    await interaction.reply({ content: `Sala ${pid} fechada.` });
  }

  private async handleReloadSlash(interaction: Discord.ChatInputCommandInteraction) {
    if (!this.fileName) {
      await interaction.reply({
        content: 'Nenhum arquivo de config definido para reload.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      const newConf = await loadConfig(this.fileName);
      if (newConf.panel) {
        this.panelConfig = newConf.panel;
        this.loadBots(newConf.panel.bots);
        if (newConf.panel.customSettings) {
          this.loadCustomSettings(newConf.panel.customSettings);
        }
      }
      await interaction.reply({ content: 'Configuracao recarregada com sucesso.' });
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      await interaction.reply({
        content: `Erro ao recarregar: ${errorMsg}`,
        flags: MessageFlags.Ephemeral,
      });
    }
  }

  private async handleExitSlash(interaction: Discord.ChatInputCommandInteraction) {
    await interaction.reply({ content: 'Desligando...' });
    await this.server.closeAll();
    process.exit(0);
  }

  private async handleTokenLinkSlash(interaction: Discord.ChatInputCommandInteraction) {
    const embed = new Discord.EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Gerar Token Haxball')
      .setDescription('Acesse: https://www.haxball.com/headlesstoken')
      .setTimestamp(Date.now());
    await interaction.reply({ embeds: [embed] });
  }

  private async command(msg: Discord.Message): Promise<void> {
    if (!msg.channel || !('send' in msg.channel)) return;
    const channel = msg.channel as Discord.TextChannel;
    if (!msg.content.startsWith(this.prefix)) return;

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

    if (!this.mastersDiscordId.includes(msg.author.id)) return;

    if (command === 'help') {
      const channelInfo: string[] = [];
      if (this.adminChannelId) {
        channelInfo.push(`**Canal Admin:** <#${this.adminChannelId}>`);
      }
      if (this.generalChannelId) {
        channelInfo.push(`**Canal Geral:** <#${this.generalChannelId}>`);
      }

      embed
        .setTitle('Help - CHA Haxball Server')
        .setDescription(
          '⚠️ **AVISO**: Comandos com prefixo (!) estao DEPRECATED. Use Slash Commands (/) para maior seguranca.\n\n' +
            (channelInfo.length > 0 ? channelInfo.join('\n') + '\n' : '')
        )
        .addFields(
          { name: '\u200B', value: '**Comandos de Admin** (use /comando)', inline: false },
          { name: '!help', value: 'Lista de comandos ➜ `/help`', inline: true },
          { name: '!info', value: 'Informacoes do servidor ➜ `/info`', inline: true },
          { name: '!meminfo', value: 'Uso de CPU e memoria ➜ `/meminfo`', inline: true },
          { name: '!metrics', value: 'Metricas das salas ➜ `/metrics`', inline: true },
          { name: '!open', value: 'Abrir uma sala ➜ `/open`', inline: true },
          { name: '!close', value: 'Fechar uma sala ➜ `/close`', inline: true },
          { name: '!esm-rooms', value: 'Listar modulos de sala', inline: true },
          { name: '!reload', value: 'Recarregar configuracao ➜ `/reload`', inline: true },
          { name: '!exit', value: 'Desligar servidor ➜ `/exit`', inline: true },
          { name: '!tokenlink', value: 'Link para token Haxball ➜ `/tokenlink`', inline: true },
          {
            name: '\u200B',
            value: '**Comandos de Autenticacao** ⚠️ DEPRECATED - USE `/authhelp`',
            inline: false,
          },
          {
            name: '⚠️ IMPORTANTE',
            value:
              '`!register` e `!linkdiscord` expoe senhas publicamente!\nUSE `/register` e `/linkdiscord` (respostas privadas)',
            inline: false,
          },
          { name: '!authhelp', value: 'Ajuda de autenticacao ➜ `/authhelp`', inline: true }
        );
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
        embed.setDescription(
          `Maximum number of rooms (${this.maxRooms}) exceeded. Update configuration to change this.`
        );
        await msg.channel.send({ embeds: [embed] });
        return;
      }

      const bot = this.bots.find((b) => b.display === args[0] || b.name === args[0]);
      const esmRooms = await this.loadEsmRooms();
      const esmRoom = esmRooms.find((r) => r.name === args[0]);

      if (!bot && !esmRoom) {
        embed.setDescription(
          `This bot or room does not exist. Type ${this.prefix}info to see the list of available bots.`
        );
        await msg.channel.send({ embeds: [embed] });
        return;
      }

      let token = text
        .replace(args[0] || '', '')
        .trim()
        .replace(/"/g, '')
        .replace('Token obtained: ', '');
      if (!token) {
        embed.setDescription(
          `You have to define a [headless token](https://www.haxball.com/headlesstoken) as second argument: ${this.prefix}open <bot> <token>`
        );
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
          const res = await bot.run(
            this.server,
            script,
            [token, token.substring(0, token.lastIndexOf(' '))],
            settings
          );
          if (res?.pid) {
            const room = this.server.getRoom(res.pid);
            if (room) this.monitor.trackRoom(res.pid, room.room, room.botName);
          }
          message.edit({
            embeds: [
              embed.setDescription(
                `Room running! [Click here to join.](${res?.link})\nPID: ${res?.pid}\n${settingsMsg}`
              ),
            ],
          });
        } catch (err) {
          message.edit({ embeds: [embed.setDescription(`Unable to open the room!\n ${err}`)] });
        }

        return;
      }

      if (esmRoom) {
        try {
          let mod = esmRoom.module;
          if (mod && mod.path) {
            const modPath = pathToFileURL(
              path.resolve(
                this.fileName ? path.dirname(this.fileName) : path.resolve('.'),
                mod.path
              )
            ).href;
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

          const res = await this.server.openWithModule(
            mod,
            [token, token.substring(0, token.lastIndexOf(' '))],
            esmRoom.name,
            settings
          );
          if (res?.pid) {
            const room = this.server.getRoom(res.pid);
            if (room) this.monitor.trackRoom(res.pid, room.room, room.botName);
          }

          message.edit({
            embeds: [
              embed.setDescription(
                `Room running (ESM)! [Click here to join.](${res?.link})\nPID: ${res?.pid}\n${settingsMsg}`
              ),
            ],
          });
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
        {
          name: 'Custom settings list',
          value: this.customSettings
            ? Object.keys(this.customSettings).join('\n')
            : 'No custom settings have been specified.',
        }
      );
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
      const serverCPUUsage = `Server Memory: ${(serverMem.heapUsed / 1024 / 1024).toFixed(2)} MB\n`;
      const roomMessage =
        this.server.browsers.length > 0 ? `\nOpen rooms: ${this.server.browsers.length}` : '';
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
