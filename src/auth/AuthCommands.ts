import * as Discord from 'discord.js';
import { AuthService } from '../auth/AuthService';
import { getAuthDb, initAuthDb } from '../database/auth-client';

/**
 * Gerencia comandos Discord relacionados a autenticacao e contas
 */
export class AuthCommands {
  private authService: AuthService;
  private db: any;

  constructor() {
    this.db = initAuthDb();
    this.authService = new AuthService();
  }

  /**
   * Processa comandos de autenticacao
   * Retorna true se o comando foi processado
   */
  async handleCommand(
    command: string,
    args: string[],
    msg: Discord.Message,
    channel: Discord.TextChannel
  ): Promise<boolean> {
    switch (command) {
      case 'register':
        await this.handleRegister(args, msg, channel);
        return true;

      case 'linkdiscord':
        await this.handleLinkDiscord(args, msg, channel);
        return true;

      case 'profile':
        await this.handleProfile(args, msg, channel);
        return true;

      case 'ranking':
        await this.handleRanking(args, msg, channel);
        return true;

      case 'top':
        await this.handleTop(args, msg, channel);
        return true;

      case 'authhelp':
        await this.handleAuthHelp(msg, channel);
        return true;

      default:
        return false;
    }
  }

  /**
   * Comando: !register <nick> <senha>
   * Registra nova conta vinculada ao Discord do usuario
   */
  private async handleRegister(args: string[], msg: Discord.Message, channel: Discord.TextChannel) {
    const embed = new Discord.EmbedBuilder().setColor('#0099ff').setTimestamp(Date.now());

    if (args.length < 2) {
      embed
        .setTitle('Erro: Parametros Invalidos')
        .setDescription('Uso: `!register <nick> <senha>`')
        .addFields(
          { name: 'Exemplo', value: '`!register MeuNick minhaSenha123`' },
          {
            name: 'Nota',
            value:
              'A senha deve ter entre 6 e 50 caracteres. Seu Discord sera vinculado automaticamente.',
          }
        );
      await channel.send({ embeds: [embed] });
      return;
    }

    const haxballNick = args[0];
    const password = args.slice(1).join(' '); // Permite senha com espacos
    const discordId = msg.author.id;

    try {
      const result = await this.authService.register(
        { haxballNick, password, discordId },
        this.db
      );

      if (result.success) {
        embed
          .setTitle('Conta Criada com Sucesso!')
          .setDescription(`Sua conta CIRS foi criada e vinculada ao seu Discord.`)
          .addFields(
            { name: 'Nick Haxball', value: haxballNick, inline: true },
            { name: 'Pontos Iniciais', value: '0', inline: true },
            { name: 'Ranking Inicial', value: '1000', inline: true },
            {
              name: 'Proximo Passo',
              value: 'Entre em uma sala CIRS e use o comando `/login <senha>` para autenticar.',
            }
          );
      } else {
        embed
          .setTitle('Erro ao Criar Conta')
          .setDescription(result.message)
          .setColor('#ff0000');
      }
    } catch (error) {
      embed
        .setTitle('Erro Interno')
        .setDescription('Ocorreu um erro ao processar seu registro. Tente novamente mais tarde.')
        .setColor('#ff0000');
      console.error('Erro ao registrar conta:', error);
    }

    await channel.send({ embeds: [embed] });
  }

  /**
   * Comando: !linkdiscord <nick> <senha>
   * Vincula Discord a conta existente
   */
  private async handleLinkDiscord(args: string[], msg: Discord.Message, channel: Discord.TextChannel) {
    const embed = new Discord.EmbedBuilder().setColor('#0099ff').setTimestamp(Date.now());

    if (args.length < 2) {
      embed
        .setTitle('Erro: Parametros Invalidos')
        .setDescription('Uso: `!linkdiscord <nick> <senha>`')
        .addFields({
          name: 'Exemplo',
          value: '`!linkdiscord MeuNick minhaSenha123`',
        });
      await channel.send({ embeds: [embed] });
      return;
    }

    const haxballNick = args[0];
    const password = args.slice(1).join(' ');
    const discordId = msg.author.id;

    try {
      const result = await this.authService.linkDiscord(haxballNick, password, discordId, this.db);

      if (result.success) {
        embed
          .setTitle('Discord Vinculado!')
          .setDescription(`Sua conta ${haxballNick} foi vinculada ao seu Discord com sucesso.`);
      } else {
        embed
          .setTitle('Erro ao Vincular Discord')
          .setDescription(result.message)
          .setColor('#ff0000');
      }
    } catch (error) {
      embed
        .setTitle('Erro Interno')
        .setDescription('Ocorreu um erro ao processar a vinculacao. Tente novamente mais tarde.')
        .setColor('#ff0000');
      console.error('Erro ao vincular Discord:', error);
    }

    await channel.send({ embeds: [embed] });
  }

  /**
   * Comando: !profile [nick]
   * Mostra perfil publico do jogador
   */
  private async handleProfile(args: string[], msg: Discord.Message, channel: Discord.TextChannel) {
    const embed = new Discord.EmbedBuilder().setColor('#0099ff').setTimestamp(Date.now());

    let haxballNick: string | undefined;

    if (args.length === 0) {
      // Busca por Discord ID
      const account = this.db.getAccountByDiscordId(msg.author.id);
      if (!account) {
        embed
          .setTitle('Perfil Nao Encontrado')
          .setDescription(
            'Voce nao tem uma conta vinculada. Use `!register <nick> <senha>` para criar uma.'
          )
          .setColor('#ff9900');
        await channel.send({ embeds: [embed] });
        return;
      }
      haxballNick = account.haxballNick;
    } else {
      haxballNick = args[0];
    }

    try {
      const profile = await this.authService.getPublicProfile(haxballNick, this.db);

      if (!profile) {
        embed
          .setTitle('Perfil Nao Encontrado')
          .setDescription(`Nao existe conta com o nick ${haxballNick}.`)
          .setColor('#ff9900');
      } else {
        const memberSince = new Intl.DateTimeFormat('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }).format(profile.createdAt);

        const lastLoginStr = profile.lastLogin
          ? new Intl.DateTimeFormat('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }).format(profile.lastLogin)
          : 'Nunca';

        embed
          .setTitle(`Perfil: ${profile.haxballNick}`)
          .addFields(
            { name: 'Pontos', value: profile.points.toString(), inline: true },
            { name: 'Ranking', value: profile.ranking.toString(), inline: true },
            { name: 'Moedas', value: profile.coins.toString(), inline: true },
            { name: 'Membro desde', value: memberSince, inline: true },
            { name: 'Ultimo login', value: lastLoginStr, inline: true }
          );
      }
    } catch (error) {
      embed
        .setTitle('Erro Interno')
        .setDescription('Ocorreu um erro ao buscar o perfil.')
        .setColor('#ff0000');
      console.error('Erro ao buscar perfil:', error);
    }

    await channel.send({ embeds: [embed] });
  }

  /**
   * Comando: !ranking [nick]
   * Mostra posicao no ranking geral
   */
  private async handleRanking(args: string[], msg: Discord.Message, channel: Discord.TextChannel) {
    const embed = new Discord.EmbedBuilder().setColor('#0099ff').setTimestamp(Date.now());

    let haxballNick: string | undefined;

    if (args.length === 0) {
      const account = this.db.getAccountByDiscordId(msg.author.id);
      if (!account) {
        embed
          .setTitle('Ranking Nao Encontrado')
          .setDescription('Voce nao tem uma conta vinculada.')
          .setColor('#ff9900');
        await channel.send({ embeds: [embed] });
        return;
      }
      haxballNick = account.haxballNick;
    } else {
      haxballNick = args[0];
    }

    try {
      const account = this.db.getAccountByNick(haxballNick);

      if (!account) {
        embed
          .setTitle('Ranking Nao Encontrado')
          .setDescription(`Nao existe conta com o nick ${haxballNick}.`)
          .setColor('#ff9900');
      } else {
        embed.setTitle(`Ranking: ${account.haxballNick}`).addFields(
          { name: 'Ranking Geral', value: account.ranking.toString(), inline: true },
          { name: 'Pontos', value: account.points.toString(), inline: true }
        );

        // Busca ratings por posicao se existir
        const ratings = this.db.sqlite
          .prepare('SELECT * FROM player_ratings WHERE account_id = ? LIMIT 1')
          .get(account.id) as any;

        if (ratings) {
          embed.addFields(
            { name: 'Goleiro (GK)', value: ratings.gk.toFixed(0), inline: true },
            { name: 'Defesa (DEF)', value: ratings.def.toFixed(0), inline: true },
            { name: 'Meio (MID)', value: ratings.mid.toFixed(0), inline: true },
            { name: 'Ataque (ATA)', value: ratings.ata.toFixed(0), inline: true }
          );
        }
      }
    } catch (error) {
      embed
        .setTitle('Erro Interno')
        .setDescription('Ocorreu um erro ao buscar o ranking.')
        .setColor('#ff0000');
      console.error('Erro ao buscar ranking:', error);
    }

    await channel.send({ embeds: [embed] });
  }

  /**
   * Comando: !top [pontos|ranking]
   * Mostra top 10 jogadores
   */
  private async handleTop(args: string[], msg: Discord.Message, channel: Discord.TextChannel) {
    const embed = new Discord.EmbedBuilder().setColor('#0099ff').setTimestamp(Date.now());

    const criterion = args[0]?.toLowerCase() === 'pontos' ? 'pontos' : 'ranking';

    try {
      const topPlayers =
        criterion === 'pontos'
          ? this.db.getTopPlayersByPoints(10)
          : this.db.getTopPlayersByRanking(10);

      if (topPlayers.length === 0) {
        embed
          .setTitle(`Top 10 por ${criterion}`)
          .setDescription('Ainda nao ha jogadores cadastrados.')
          .setColor('#ff9900');
      } else {
        const lines = topPlayers.map((player: any, index: number) => {
          const value = criterion === 'pontos' ? player.points : player.ranking;
          return `**${index + 1}.** ${player.haxballNick} - ${value}`;
        });

        embed.setTitle(`Top 10 por ${criterion}`).setDescription(lines.join('\n'));
      }
    } catch (error) {
      embed
        .setTitle('Erro Interno')
        .setDescription('Ocorreu um erro ao buscar o ranking.')
        .setColor('#ff0000');
      console.error('Erro ao buscar top:', error);
    }

    await channel.send({ embeds: [embed] });
  }

  /**
   * Comando: !authhelp
   * Mostra comandos de autenticacao
   */
  private async handleAuthHelp(msg: Discord.Message, channel: Discord.TextChannel) {
    const embed = new Discord.EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Comandos de Autenticacao CIRS')
      .setDescription('Sistema de contas unificadas')
      .setTimestamp(Date.now())
      .addFields(
        {
          name: '!register <nick> <senha>',
          value: 'Registra nova conta vinculada ao seu Discord',
        },
        {
          name: '!linkdiscord <nick> <senha>',
          value: 'Vincula seu Discord a uma conta existente',
        },
        {
          name: '!profile [nick]',
          value: 'Mostra perfil publico (seu perfil se nao especificar nick)',
        },
        {
          name: '!ranking [nick]',
          value: 'Mostra posicao no ranking (seu ranking se nao especificar nick)',
        },
        {
          name: '!top [pontos|ranking]',
          value: 'Mostra top 10 jogadores (padrao: ranking)',
        },
        {
          name: 'Login na Sala',
          value: 'Dentro da sala Haxball, use: `/login <senha>`',
        }
      );

    await channel.send({ embeds: [embed] });
  }

  /**
   * Limpa sessoes expiradas periodicamente
   */
  startSessionCleanup(intervalMs = 3600000) {
    // 1 hora
    setInterval(async () => {
      try {
        const count = await this.authService.cleanupExpiredSessions(this.db);
        if (count > 0) {
          console.log(`[AUTH] Limpas ${count} sessoes expiradas`);
        }
      } catch (error) {
        console.error('Erro ao limpar sessoes:', error);
      }
    }, intervalMs);
  }
}

//   __  ____ ____ _  _
// / _\/ ___) ___) )( \
//    \___ \___ ) \/ (
// \_/\_(____(____|____/
