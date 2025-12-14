import * as Discord from 'discord.js';
import { MessageFlags } from 'discord.js';
import { AuthService } from '../auth/AuthService';
import { initAuthDb } from '../database/auth-client';

/**
 * Gerencia comandos Discord relacionados a autenticacao e contas
 * Suporta Slash Commands com mensagens ephemeral para senhas
 */
export class AuthCommands {
  private authService: AuthService;
  private db: any;

  constructor() {
    this.db = initAuthDb();
    this.authService = new AuthService();
  }

  /**
   * Retorna a instancia do banco de autenticacao
   */
  getAuthDatabase(): any {
    return this.db;
  }

  /**
   * Processa Slash Commands de autenticacao
   * Retorna true se o comando foi processado
   */
  async handleInteraction(interaction: Discord.ChatInputCommandInteraction): Promise<boolean> {
    const command = interaction.commandName;

    switch (command) {
      case 'register':
        await this.handleRegisterSlash(interaction);
        return true;

      case 'linkdiscord':
        await this.handleLinkDiscordSlash(interaction);
        return true;

      case 'profile':
        await this.handleProfileSlash(interaction);
        return true;

      case 'ranking':
        await this.handleRankingSlash(interaction);
        return true;

      case 'top':
        await this.handleTopSlash(interaction);
        return true;

      case 'authhelp':
        await this.handleAuthHelpSlash(interaction);
        return true;

      default:
        return false;
    }
  }

  // ============================================================================
  // SLASH COMMANDS (com ephemeral para senhas)
  // ============================================================================

  /**
   * Slash Command: /register
   */
  private async handleRegisterSlash(interaction: Discord.ChatInputCommandInteraction) {
    const haxballNick = interaction.options.getString('nick', true);
    const password = interaction.options.getString('senha', true);
    const discordId = interaction.user.id;

    const embed = new Discord.EmbedBuilder().setColor('#0099ff').setTimestamp(Date.now());

    try {
      const result = await this.authService.register({ haxballNick, password, discordId }, this.db);

      if (result.success) {
        embed
          .setTitle('\u2713 Conta Criada com Sucesso!')
          .setDescription(`Sua conta CIRS foi criada e vinculada ao seu Discord.`)
          .setColor('#00ff00')
          .addFields(
            { name: 'Nick Haxball', value: haxballNick, inline: true },
            { name: 'Pontos Iniciais', value: '0', inline: true },
            { name: 'Ranking Inicial', value: '1000', inline: true },
            {
              name: 'Proximo Passo',
              value: 'Entre em uma sala CIRS e use `/login <senha>` para autenticar.',
            }
          );
      } else {
        embed
          .setTitle('\u274c Erro ao Criar Conta')
          .setDescription(result.message)
          .setColor('#ff0000');
      }
    } catch (error) {
      embed
        .setTitle('\u274c Erro Interno')
        .setDescription('Ocorreu um erro ao processar seu registro. Tente novamente mais tarde.')
        .setColor('#ff0000');
      console.error('Erro ao registrar conta:', error);
    }

    // EPHEMERAL: Apenas o usuario ve a resposta (senha nao fica publica)
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }

  /**
   * Slash Command: /linkdiscord
   */
  private async handleLinkDiscordSlash(interaction: Discord.ChatInputCommandInteraction) {
    const haxballNick = interaction.options.getString('nick', true);
    const password = interaction.options.getString('senha', true);
    const discordId = interaction.user.id;

    const embed = new Discord.EmbedBuilder().setColor('#0099ff').setTimestamp(Date.now());

    try {
      const result = await this.authService.linkDiscord(haxballNick, password, discordId, this.db);

      if (result.success) {
        embed
          .setTitle('\u2713 Discord Vinculado com Sucesso!')
          .setDescription(`Seu Discord foi vinculado a conta ${haxballNick}.`)
          .setColor('#00ff00')
          .addFields(
            { name: 'Nick Haxball', value: haxballNick, inline: true },
            { name: 'Discord', value: `<@${discordId}>`, inline: true }
          );
      } else {
        embed
          .setTitle('\u274c Erro ao Vincular Discord')
          .setDescription(result.message)
          .setColor('#ff0000');
      }
    } catch (error) {
      embed
        .setTitle('\u274c Erro Interno')
        .setDescription('Ocorreu um erro ao vincular seu Discord. Tente novamente mais tarde.')
        .setColor('#ff0000');
      console.error('Erro ao vincular Discord:', error);
    }

    // EPHEMERAL: Apenas o usuario ve a resposta (senha nao fica publica)
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }

  /**
   * Slash Command: /profile
   */
  private async handleProfileSlash(interaction: Discord.ChatInputCommandInteraction) {
    const embed = new Discord.EmbedBuilder().setColor('#0099ff').setTimestamp(Date.now());

    let haxballNick = interaction.options.getString('nick');

    if (!haxballNick) {
      // Busca conta vinculada ao Discord do usuario
      const account = this.db.getAccountByDiscordId(interaction.user.id);
      if (!account) {
        embed
          .setTitle('\u274c Erro')
          .setDescription(
            'Voce nao tem uma conta vinculada. Use `/register` para criar uma ou especifique um nick.'
          )
          .setColor('#ff9900');
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        return;
      }
      haxballNick = account.haxballNick;
    }

    try {
      const profile = await this.authService.getPublicProfile(haxballNick!, this.db);

      if (!profile) {
        embed
          .setTitle('\u274c Perfil Nao Encontrado')
          .setDescription(`Nao existe conta com o nick ${haxballNick}.`)
          .setColor('#ff9900');
      } else {
        const memberSince = new Intl.DateTimeFormat('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }).format(profile.createdAt);

        embed
          .setTitle(`Perfil de ${profile.haxballNick}`)
          .setColor('#00aaff')
          .addFields(
            { name: 'Pontos', value: profile.points.toString(), inline: true },
            { name: 'Ranking', value: profile.ranking.toString(), inline: true },
            { name: 'Moedas', value: profile.coins.toString(), inline: true },
            { name: 'Membro desde', value: memberSince, inline: false }
          );

        if (profile.lastLogin) {
          const lastLogin = new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }).format(profile.lastLogin);
          embed.addFields({ name: 'Ultimo Login', value: lastLogin, inline: false });
        }
      }
    } catch (error) {
      embed
        .setTitle('\u274c Erro')
        .setDescription('Erro ao buscar perfil. Tente novamente.')
        .setColor('#ff0000');
      console.error('Erro ao buscar perfil:', error);
    }

    await interaction.reply({ embeds: [embed] });
  }

  /**
   * Slash Command: /ranking
   */
  private async handleRankingSlash(interaction: Discord.ChatInputCommandInteraction) {
    // Por enquanto, redireciona para /profile
    await this.handleProfileSlash(interaction);
  }

  /**
   * Slash Command: /top
   */
  private async handleTopSlash(interaction: Discord.ChatInputCommandInteraction) {
    const embed = new Discord.EmbedBuilder().setColor('#0099ff').setTimestamp(Date.now());

    const criterion = interaction.options.getString('criterio') || 'ranking';

    try {
      const topPlayers =
        criterion === 'pontos'
          ? this.db.getTopPlayersByPoints(10)
          : this.db.getTopPlayersByRanking(10);

      if (topPlayers.length === 0) {
        embed
          .setTitle(`\u274c Top 10 por ${criterion}`)
          .setDescription('Nenhum jogador encontrado.')
          .setColor('#ff9900');
      } else {
        const label = criterion === 'pontos' ? 'pontos' : 'ranking';
        const lines = topPlayers.map((p: any, i: number) => {
          const value = criterion === 'pontos' ? p.points : p.ranking;
          return `${i + 1}. ${p.haxballNick} - ${value} ${label}`;
        });

        embed
          .setTitle(`\u2B50 Top 10 por ${criterion}`)
          .setDescription(lines.join('\n'))
          .setColor('#ffaa00');
      }
    } catch (error) {
      embed
        .setTitle('\u274c Erro')
        .setDescription('Erro ao buscar top jogadores.')
        .setColor('#ff0000');
      console.error('Erro ao buscar top:', error);
    }

    await interaction.reply({ embeds: [embed] });
  }

  /**
   * Slash Command: /authhelp
   */
  private async handleAuthHelpSlash(interaction: Discord.ChatInputCommandInteraction) {
    const embed = new Discord.EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Sistema de Autenticacao CIRS')
      .setDescription('Comandos disponiveis para gerenciar sua conta')
      .setTimestamp(Date.now())
      .addFields(
        {
          name: '/register <nick> <senha>',
          value: 'Registra nova conta vinculada ao seu Discord',
        },
        {
          name: '/linkdiscord <nick> <senha>',
          value: 'Vincula seu Discord a uma conta existente',
        },
        {
          name: '/profile [nick]',
          value: 'Ver perfil de um jogador (ou o seu proprio)',
        },
        {
          name: '/ranking [nick]',
          value: 'Ver ranking de um jogador',
        },
        {
          name: '/top [criterio]',
          value: 'Ver top 10 jogadores (por ranking ou pontos)',
        },
        {
          name: 'Comandos na Sala Haxball',
          value: '`!login <senha>` - Autenticar\n`!profile` - Ver seu perfil\n`!logout` - Sair',
        },
        {
          name: '\u2713 Seguranca',
          value:
            'Comandos com senha usam mensagens privadas (ephemeral). Apenas voce ve a resposta!',
        }
      );

    await interaction.reply({ embeds: [embed] });
  }

  /**
   * Inicia limpeza periodica de sessoes expiradas
   */
  startSessionCleanup() {
    const handle = setInterval(() => {
      try {
        const expiredTime = new Date();
        expiredTime.setHours(expiredTime.getHours() - 24); // Sessoes com mais de 24 horas
        const cleaned = this.db.cleanupExpiredSessions(expiredTime);
        if (cleaned > 0) {
          console.log(`[AUTH] Limpeza de sessoes: ${cleaned} sessoes expiradas removidas`);
        }
      } catch (error) {
        console.error('[AUTH] Erro ao limpar sessoes expiradas:', error);
      }
    }, 3600000); // A cada 1 hora
    try {
      if (handle && typeof (handle as any).unref === 'function') (handle as any).unref();
    } catch (e) {}
  }
}

//   __  ____ ____ _  _
// / _\/ ___) ___) )( \
//    \___ \___ ) \/ (
// \_/\_(____(____|____/
