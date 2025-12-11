import { Message, EmbedBuilder } from 'discord.js';
import { BalanceService } from './BalanceService';
import { BalanceAlgorithm } from './BalanceAlgorithm';
import { Position } from './types';

/**
 * Comandos Discord para sistema de balanceamento
 * Gerencia requisicoes de balance, consultas de rating e estatisticas
 */
export class BalanceCommands {
  private balanceService: BalanceService;
  private balanceAlgorithm: BalanceAlgorithm;
  private prefix: string;

  constructor(balanceService: BalanceService, balanceAlgorithm: BalanceAlgorithm, prefix: string) {
    this.balanceService = balanceService;
    this.balanceAlgorithm = balanceAlgorithm;
    this.prefix = prefix;
  }

  /**
   * Processa comando do Discord
   */
  async handleCommand(message: Message): Promise<void> {
    const content = message.content.trim();
    if (!content.startsWith(this.prefix)) return;

    const args = content.slice(this.prefix.length).trim().split(/\s+/);
    const command = args[0].toLowerCase();

    try {
      switch (command) {
        case 'balance':
          await this.handleBalance(message, args.slice(1));
          break;
        case 'rating':
        case 'elo':
          await this.handleRating(message, args.slice(1));
          break;
        case 'topelo':
          await this.handleTopElo(message, args.slice(1));
          break;
        case 'stats':
          await this.handleStats(message, args.slice(1));
          break;
        case 'decay':
          await this.handleDecay(message, args.slice(1));
          break;
        case 'balancehelp':
          await this.handleBalanceHelp(message);
          break;
        default:
          break;
      }
    } catch (error) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('Erro')
        .setDescription(error instanceof Error ? error.message : 'Erro desconhecido');

      await message.reply({ embeds: [errorEmbed] });
    }
  }

  /**
   * Comando: balance <nick1> <nick2> ... [estrategia]
   * Balanceia jogadores em dois times
   */
  private async handleBalance(message: Message, args: string[]): Promise<void> {
    if (args.length < 2) {
      await message.reply('Uso: `balance <nick1> <nick2> ... [greedy|genetic]`');
      return;
    }

    // Extrai estrategia (ultimo argumento se for estrategia valida)
    let strategy: 'greedy' | 'genetic' = 'greedy';
    let nicknames = [...args];

    const lastArg = args[args.length - 1].toLowerCase();
    if (lastArg === 'greedy' || lastArg === 'genetic') {
      strategy = lastArg;
      nicknames = args.slice(0, -1);
    }

    // Busca jogadores no banco
    const players = await this.findPlayersByNicknames(nicknames);

    if (players.length < 2) {
      await message.reply('Pelo menos 2 jogadores validos sao necessarios');
      return;
    }

    // Configura algoritmo com estrategia escolhida
    this.balanceAlgorithm['config'].strategy = strategy;

    // Balanceia times
    const result = this.balanceAlgorithm.balanceTeams(players);

    // Cria embed com resultado
    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('Times Balanceados')
      .setDescription(`Estrategia: ${strategy}`)
      .addFields(
        {
          name: `Time 1 (Rating: ${result.team1.averageRating})`,
          value: result.team1.players
            .map((p) => `${p.nick} - ${p.assignedPosition} (${this.getRatingForPosition(p)})`)
            .join('\n'),
          inline: false,
        },
        {
          name: `Time 2 (Rating: ${result.team2.averageRating})`,
          value: result.team2.players
            .map((p) => `${p.nick} - ${p.assignedPosition} (${this.getRatingForPosition(p)})`)
            .join('\n'),
          inline: false,
        },
        {
          name: 'Metricas',
          value: `Diferenca: ${result.ratingDifference}\nJustica: ${result.fairnessScore}/100`,
          inline: false,
        }
      );

    await message.reply({ embeds: [embed] });
  }

  /**
   * Helper: busca jogadores por nicknames
   */
  private async findPlayersByNicknames(nicknames: string[]) {
    // TODO: Implementar busca por nickname no banco
    // Por ora, retorna lista vazia
    return [];
  }

  /**
   * Helper: retorna rating da posicao atribuida
   */
  private getRatingForPosition(player: any): number {
    if (!player.assignedPosition) return player.rating.overall;

    const pos = player.assignedPosition.toLowerCase();
    return player.rating[pos] || player.rating.overall;
  }

  /**
   * Comando: rating <nick> [posicao]
   * Mostra rating do jogador (geral ou por posicao)
   */
  private async handleRating(message: Message, args: string[]): Promise<void> {
    if (args.length === 0) {
      await message.reply('Uso: `rating <nick> [gk|def|mid|ata]`');
      return;
    }

    const nick = args[0];
    const position = args[1]?.toUpperCase() as Position | undefined;

    // Busca jogador (TODO: implementar busca real)
    // const player = await this.balanceService.getPlayerForBalance(accountId);

    await message.reply('Funcionalidade em implementacao');
  }

  /**
   * Comando: topelo [posicao] [limite]
   * Mostra ranking dos melhores jogadores
   */
  private async handleTopElo(message: Message, args: string[]): Promise<void> {
    const position = (args[0]?.toUpperCase() as Position) || Position.MID;
    const limit = parseInt(args[1]) || 10;

    if (limit > 25) {
      await message.reply('Limite maximo: 25 jogadores');
      return;
    }

    const topPlayers = await this.balanceService.getTopPlayersByPosition(position, limit);

    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle(`Top ${limit} - ${position}`)
      .setDescription(
        topPlayers
          .map(
            (p, i) =>
              `${i + 1}. **${p.nick}** - ${p.rating} (${p.gamesPlayed} jogos)`
          )
          .join('\n')
      );

    await message.reply({ embeds: [embed] });
  }

  /**
   * Comando: stats
   * Mostra estatisticas globais do sistema
   */
  private async handleStats(message: Message, args: string[]): Promise<void> {
    const stats = await this.balanceService.getGlobalRatingStats();

    const embed = new EmbedBuilder()
      .setColor('#0099FF')
      .setTitle('Estatisticas Globais - Sistema Elo')
      .addFields(
        { name: 'Total de Jogadores', value: stats.totalPlayers.toString(), inline: true },
        {
          name: 'Rating Medio',
          value: stats.averageRating.toString(),
          inline: true,
        },
        {
          name: 'Rating Mediano',
          value: stats.medianRating.toString(),
          inline: true,
        },
        { name: 'Maior Rating', value: stats.topRating.toString(), inline: true },
        { name: 'Menor Rating', value: stats.bottomRating.toString(), inline: true }
      );

    await message.reply({ embeds: [embed] });
  }

  /**
   * Comando: decay [dias]
   * Aplica decay em jogadores inativos (admin only)
   */
  private async handleDecay(message: Message, args: string[]): Promise<void> {
    // TODO: Verificar permissoes de admin

    const days = parseInt(args[0]) || 30;

    if (days < 7 || days > 365) {
      await message.reply('Dias deve estar entre 7 e 365');
      return;
    }

    const decayedCount = await this.balanceService.applyDecayToInactivePlayers(days);

    const embed = new EmbedBuilder()
      .setColor('#FFA500')
      .setTitle('Decay Aplicado')
      .setDescription(`${decayedCount} jogadores inativos por ${days}+ dias tiveram decay aplicado`);

    await message.reply({ embeds: [embed] });
  }

  /**
   * Comando: balancehelp
   * Mostra ajuda dos comandos de balance
   */
  private async handleBalanceHelp(message: Message): Promise<void> {
    const embed = new EmbedBuilder()
      .setColor('#0099FF')
      .setTitle('Comandos de Balanceamento')
      .setDescription('Sistema Elo Hibrido com ratings por posicao')
      .addFields(
        {
          name: `${this.prefix}balance <nick1> <nick2> ... [estrategia]`,
          value: 'Balanceia jogadores em dois times. Estrategia: greedy (padrao) ou genetic',
          inline: false,
        },
        {
          name: `${this.prefix}rating <nick> [posicao]`,
          value: 'Mostra rating do jogador. Posicoes: GK, DEF, MID, ATA',
          inline: false,
        },
        {
          name: `${this.prefix}topelo [posicao] [limite]`,
          value: 'Ranking dos melhores jogadores por posicao (max 25)',
          inline: false,
        },
        {
          name: `${this.prefix}stats`,
          value: 'Estatisticas globais do sistema Elo',
          inline: false,
        },
        {
          name: `${this.prefix}decay [dias]`,
          value: 'Aplica decay em inativos (admin only, padrao 30 dias)',
          inline: false,
        }
      )
      .setFooter({ text: 'Sistema desenvolvido por ASSH' });

    await message.reply({ embeds: [embed] });
  }
}

//   __  ____ ____ _  _
// / _\/ ___) ___) )( \
//    \___ \___ ) \/ (
// \_/\_(____(____|____/
