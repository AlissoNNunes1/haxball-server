import { Message, EmbedBuilder } from 'discord.js';
import { StatsService } from './StatsService';
import { StatsCalculator } from './StatsCalculator';
import { AuthService } from '../auth/AuthService';

/**
 * Comandos Discord para estatisticas
 * Integra com AuthService para autenticacao e StatsService para dados
 */
export class StatsCommands {
  private statsService: StatsService;
  private calculator: StatsCalculator;
  private authService: AuthService;

  constructor(
    statsService: StatsService,
    calculator: StatsCalculator,
    authService: AuthService
  ) {
    this.statsService = statsService;
    this.calculator = calculator;
    this.authService = authService;
  }

  /**
   * Comando: !stats <player>
   * Mostra estatisticas gerais de jogador
   */
  async handleStats(message: Message, args: string[]): Promise<void> {
    if (args.length < 1) {
      await message.reply('Uso: !stats <player>');
      return;
    }

    const playerName = args.join(' ');

    // Busca account por nome
    const account = await this.authService.getAccountByName(playerName);
    if (!account) {
      await message.reply(`Jogador ${playerName} nao encontrado`);
      return;
    }

    // Busca agregado
    const aggregate = await this.statsService.getPlayerAggregate(account.id);
    if (!aggregate) {
      await message.reply(`Nenhuma estatistica encontrada para ${playerName}`);
      return;
    }

    // Monta embed
    const embed = new EmbedBuilder()
      .setTitle(`Estatisticas: ${playerName}`)
      .setColor(0x00ff00)
      .addFields(
        { name: 'Partidas', value: aggregate.totalMatches.toString(), inline: true },
        {
          name: 'Vitorias',
          value: `${aggregate.totalWins} (${(aggregate.winRate * 100).toFixed(1)}%)`,
          inline: true,
        },
        { name: 'Derrotas', value: aggregate.totalLosses.toString(), inline: true },
        { name: 'Gols', value: aggregate.totalGoals.toString(), inline: true },
        { name: 'Assistencias', value: aggregate.totalAssists.toString(), inline: true },
        { name: 'Defesas', value: aggregate.totalSaves.toString(), inline: true },
        {
          name: 'Media de Gols',
          value: aggregate.avgGoalsPerMatch.toFixed(2),
          inline: true,
        },
        {
          name: 'Media de Assistencias',
          value: aggregate.avgAssistsPerMatch.toFixed(2),
          inline: true,
        },
        {
          name: 'Media de Defesas',
          value: aggregate.avgSavesPerMatch.toFixed(2),
          inline: true,
        }
      );

    if (aggregate.passAccuracy !== undefined) {
      embed.addFields({
        name: 'Precisao de Passe',
        value: `${(aggregate.passAccuracy * 100).toFixed(1)}%`,
        inline: true,
      });
    }

    if (aggregate.avgSpeed !== undefined) {
      embed.addFields({
        name: 'Velocidade Media',
        value: aggregate.avgSpeed.toFixed(1),
        inline: true,
      });
    }

    if (aggregate.totalDistanceCovered !== undefined) {
      embed.addFields({
        name: 'Distancia Total',
        value: `${(aggregate.totalDistanceCovered / 1000).toFixed(2)} km`,
        inline: true,
      });
    }

    await message.reply({ embeds: [embed] });
  }

  /**
   * Comando: !mystats
   * Mostra estatisticas do proprio jogador
   */
  async handleMyStats(message: Message): Promise<void> {
    const discordId = message.author.id;

    // Busca account por Discord ID
    const account = await this.authService.getAccountByDiscordId(discordId);
    if (!account) {
      await message.reply('Voce ainda nao possui uma conta. Use !register');
      return;
    }

    // Redireciona para !stats
    await this.handleStats(message, [account.name]);
  }

  /**
   * Comando: !compare <player1> <player2>
   * Compara estatisticas de dois jogadores
   */
  async handleCompare(message: Message, args: string[]): Promise<void> {
    if (args.length < 2) {
      await message.reply('Uso: !compare <player1> <player2>');
      return;
    }

    const player1Name = args[0];
    const player2Name = args.slice(1).join(' ');

    // Busca accounts
    const account1 = await this.authService.getAccountByName(player1Name);
    const account2 = await this.authService.getAccountByName(player2Name);

    if (!account1) {
      await message.reply(`Jogador ${player1Name} nao encontrado`);
      return;
    }

    if (!account2) {
      await message.reply(`Jogador ${player2Name} nao encontrado`);
      return;
    }

    // Busca agregados
    const agg1 = await this.statsService.getPlayerAggregate(account1.id);
    const agg2 = await this.statsService.getPlayerAggregate(account2.id);

    if (!agg1 || !agg2) {
      await message.reply('Nao ha estatisticas suficientes para comparacao');
      return;
    }

    // Calcula diferenca
    const comparison = this.calculator.comparePlayer(agg1, agg2);

    // Monta embed
    const embed = new EmbedBuilder()
      .setTitle(`Comparacao: ${player1Name} vs ${player2Name}`)
      .setColor(0xffaa00)
      .addFields(
        {
          name: 'Partidas',
          value: `${agg1.totalMatches} vs ${agg2.totalMatches} (${this.formatDiff(comparison.totalMatches)})`,
          inline: false,
        },
        {
          name: 'Taxa de Vitoria',
          value: `${(agg1.winRate * 100).toFixed(1)}% vs ${(agg2.winRate * 100).toFixed(1)}% (${this.formatDiff(comparison.winRate * 100, true)}%)`,
          inline: false,
        },
        {
          name: 'Gols Totais',
          value: `${agg1.totalGoals} vs ${agg2.totalGoals} (${this.formatDiff(comparison.totalGoals)})`,
          inline: true,
        },
        {
          name: 'Assistencias Totais',
          value: `${agg1.totalAssists} vs ${agg2.totalAssists} (${this.formatDiff(comparison.totalAssists)})`,
          inline: true,
        },
        {
          name: 'Defesas Totais',
          value: `${agg1.totalSaves} vs ${agg2.totalSaves} (${this.formatDiff(comparison.totalSaves)})`,
          inline: true,
        },
        {
          name: 'Media de Gols',
          value: `${agg1.avgGoalsPerMatch.toFixed(2)} vs ${agg2.avgGoalsPerMatch.toFixed(2)} (${this.formatDiff(comparison.avgGoalsPerMatch, true)})`,
          inline: true,
        },
        {
          name: 'Media de Assistencias',
          value: `${agg1.avgAssistsPerMatch.toFixed(2)} vs ${agg2.avgAssistsPerMatch.toFixed(2)} (${this.formatDiff(comparison.avgAssistsPerMatch, true)})`,
          inline: true,
        },
        {
          name: 'Media de Defesas',
          value: `${agg1.avgSavesPerMatch.toFixed(2)} vs ${agg2.avgSavesPerMatch.toFixed(2)} (${this.formatDiff(comparison.avgSavesPerMatch, true)})`,
          inline: true,
        }
      );

    if (agg1.passAccuracy !== undefined && agg2.passAccuracy !== undefined) {
      embed.addFields({
        name: 'Precisao de Passe',
        value: `${(agg1.passAccuracy * 100).toFixed(1)}% vs ${(agg2.passAccuracy * 100).toFixed(1)}% (${this.formatDiff((comparison.passAccuracy || 0) * 100, true)}%)`,
        inline: true,
      });
    }

    await message.reply({ embeds: [embed] });
  }

  /**
   * Formata diferenca numerica com sinal
   */
  private formatDiff(value: number, decimal: boolean = false): string {
    const formatted = decimal ? value.toFixed(2) : Math.round(value).toString();
    return value >= 0 ? `+${formatted}` : formatted;
  }

  /**
   * Comando: !top <metric> [limit]
   * Mostra top jogadores por metrica
   */
  async handleTop(message: Message, args: string[]): Promise<void> {
    if (args.length < 1) {
      await message.reply(
        'Uso: !top <metric> [limit]\nMetricas: goals, assists, saves, winrate, matches'
      );
      return;
    }

    const metric = args[0].toLowerCase();
    const limit = args.length > 1 ? parseInt(args[1], 10) : 10;

    if (isNaN(limit) || limit < 1 || limit > 25) {
      await message.reply('Limite deve ser entre 1 e 25');
      return;
    }

    // Mapeia metrica para campo do agregado
    let field: keyof import('./types').PlayerStatsAggregate;
    let title: string;

    switch (metric) {
      case 'goals':
        field = 'totalGoals';
        title = 'Top Artilheiros';
        break;
      case 'assists':
        field = 'totalAssists';
        title = 'Top Assistentes';
        break;
      case 'saves':
        field = 'totalSaves';
        title = 'Top Defensores';
        break;
      case 'winrate':
        field = 'winRate';
        title = 'Melhor Taxa de Vitoria';
        break;
      case 'matches':
        field = 'totalMatches';
        title = 'Mais Partidas';
        break;
      default:
        await message.reply(
          'Metrica invalida. Use: goals, assists, saves, winrate ou matches'
        );
        return;
    }

    // Busca top
    const topPlayers = await this.statsService.getTopPlayers(field, limit);

    if (topPlayers.length === 0) {
      await message.reply('Nenhuma estatistica encontrada');
      return;
    }

    // Monta embed
    const embed = new EmbedBuilder().setTitle(title).setColor(0xffd700);

    for (let i = 0; i < topPlayers.length; i++) {
      const player = topPlayers[i];
      const account = await this.authService.getAccountById(player.accountId);
      const playerName = account ? account.name : `ID ${player.accountId}`;

      let value: string;

      switch (metric) {
        case 'goals':
          value = `${player.totalGoals} gols (${player.avgGoalsPerMatch.toFixed(2)}/partida)`;
          break;
        case 'assists':
          value = `${player.totalAssists} assists (${player.avgAssistsPerMatch.toFixed(2)}/partida)`;
          break;
        case 'saves':
          value = `${player.totalSaves} defesas (${player.avgSavesPerMatch.toFixed(2)}/partida)`;
          break;
        case 'winrate':
          value = `${(player.winRate * 100).toFixed(1)}% (${player.totalWins}/${player.totalMatches})`;
          break;
        case 'matches':
          value = `${player.totalMatches} partidas (${player.totalWins}V ${player.totalLosses}D)`;
          break;
        default:
          value = '';
      }

      embed.addFields({
        name: `${i + 1}. ${playerName}`,
        value,
        inline: false,
      });
    }

    await message.reply({ embeds: [embed] });
  }

  /**
   * Comando: !recent <player> [limit]
   * Mostra partidas recentes de jogador
   */
  async handleRecent(message: Message, args: string[]): Promise<void> {
    if (args.length < 1) {
      await message.reply('Uso: !recent <player> [limit]');
      return;
    }

    const playerName = args[0];
    const limit = args.length > 1 ? parseInt(args[1], 10) : 5;

    if (isNaN(limit) || limit < 1 || limit > 10) {
      await message.reply('Limite deve ser entre 1 e 10');
      return;
    }

    // Busca account
    const account = await this.authService.getAccountByName(playerName);
    if (!account) {
      await message.reply(`Jogador ${playerName} nao encontrado`);
      return;
    }

    // Busca stats recentes
    const recentStats = await this.statsService.getAdvancedStats({
      accountIds: [account.id],
      limit,
    });

    if (recentStats.length === 0) {
      await message.reply(`Nenhuma partida encontrada para ${playerName}`);
      return;
    }

    // Monta embed
    const embed = new EmbedBuilder()
      .setTitle(`Ultimas partidas: ${playerName}`)
      .setColor(0x00aaff);

    for (const stat of recentStats) {
      const result = stat.won ? 'V' : 'D';
      const teamColor = stat.team === 'red' ? 'V' : stat.team === 'blue' ? 'A' : '?';

      embed.addFields({
        name: `Match #${stat.matchId} [${result}] Time ${teamColor}`,
        value: `Gols: ${stat.goals} | Assists: ${stat.assists} | Defesas: ${stat.saves}\nPasses: ${stat.passesCompleted}/${stat.passes} | Distancia: ${(stat.distanceCovered / 1000).toFixed(2)}km`,
        inline: false,
      });
    }

    await message.reply({ embeds: [embed] });
  }
}

//   __  ____ ____ _  _
// / _\/ ___) ___) )( \
//    \___ \___ ) \/ (
// \_/\_(____(____|____/
