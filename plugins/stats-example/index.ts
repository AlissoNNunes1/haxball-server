import { Plugin, PluginContext, RoomInfo, PlayerInfo } from '../../src/plugins/types';

/**
 * Plugin de exemplo - Stats Simples
 * Demonstra uso basico da API de plugins
 */
export default class StatsExamplePlugin implements Plugin {
  name = 'stats-example';
  version = '1.0.0';
  description = 'Plugin de exemplo que rastreia stats basicas de salas';
  author = 'CIRS Team';

  private context!: PluginContext;
  private roomStats: Map<number, RoomStats>;

  constructor() {
    this.roomStats = new Map();
  }

  async init(context: PluginContext): Promise<void> {
    this.context = context;

    context.logger.info('Plugin Stats Example inicializado');

    // Registra comando customizado
    context.registerCommand('roomstats', this.handleRoomStatsCommand.bind(this));

    // Agenda tarefa periodica
    context.scheduleTask(60000, this.logStats.bind(this)); // A cada minuto

    // Escuta eventos globais
    context.events.on('system:metric', (metric: any) => {
      context.logger.debug(`Metrica recebida: ${JSON.stringify(metric)}`);
    });

    // Carrega dados persistentes
    const savedStats = await context.storage.get<any>('totalRooms');
    if (savedStats) {
      context.logger.info(`Total historico de salas: ${savedStats}`);
    }
  }

  async onRoomOpen(room: RoomInfo): Promise<void> {
    this.context.logger.info(`Sala ${room.botName} aberta (PID ${room.pid})`);

    this.roomStats.set(room.pid, {
      botName: room.botName,
      openedAt: room.openedAt,
      playerJoins: 0,
      playerLeaves: 0,
      goals: 0,
      peakPlayers: 0,
    });

    // Atualiza storage
    const totalRooms = (await this.context.storage.get<number>('totalRooms')) || 0;
    await this.context.storage.set('totalRooms', totalRooms + 1);
  }

  async onRoomClose(room: RoomInfo): Promise<void> {
    const stats = this.roomStats.get(room.pid);

    if (stats) {
      const duration = Date.now() - stats.openedAt.getTime();
      const durationMin = Math.floor(duration / 60000);

      this.context.logger.info(
        `Sala ${room.botName} fechada. Duracao: ${durationMin}min, Jogadores: ${stats.playerJoins}, Gols: ${stats.goals}`
      );

      this.roomStats.delete(room.pid);
    }
  }

  async onPlayerJoin(player: PlayerInfo, room: RoomInfo): Promise<void> {
    const stats = this.roomStats.get(room.pid);
    if (stats) {
      stats.playerJoins++;
      stats.peakPlayers = Math.max(stats.peakPlayers, room.playerCount);
    }
  }

  async onPlayerLeave(player: PlayerInfo, room: RoomInfo): Promise<void> {
    const stats = this.roomStats.get(room.pid);
    if (stats) {
      stats.playerLeaves++;
    }
  }

  async onTeamGoal(team: number, room: RoomInfo): Promise<void> {
    const stats = this.roomStats.get(room.pid);
    if (stats) {
      stats.goals++;
    }
  }

  private async handleRoomStatsCommand(args: string[], context: any): Promise<void> {
    if (this.roomStats.size === 0) {
      await context.reply('Nenhuma sala aberta no momento');
      return;
    }

    let response = '**Stats de Salas Abertas:**\n\n';

    for (const [pid, stats] of this.roomStats) {
      const duration = Date.now() - stats.openedAt.getTime();
      const durationMin = Math.floor(duration / 60000);

      response += `**${stats.botName}** (PID ${pid})\n`;
      response += `- Duracao: ${durationMin} minutos\n`;
      response += `- Jogadores: ${stats.playerJoins} entradas, ${stats.playerLeaves} saidas\n`;
      response += `- Pico: ${stats.peakPlayers} jogadores\n`;
      response += `- Gols: ${stats.goals}\n\n`;
    }

    await context.reply(response);
  }

  private async logStats(): Promise<void> {
    if (this.roomStats.size === 0) return;

    this.context.logger.info(`${this.roomStats.size} sala(s) ativa(s)`);

    for (const [pid, stats] of this.roomStats) {
      this.context.logger.debug(
        `[${pid}] ${stats.botName}: ${stats.playerJoins} joins, ${stats.goals} goals`
      );
    }
  }

  async cleanup(): Promise<void> {
    this.context.logger.info('Plugin Stats Example descarregado');
    this.roomStats.clear();
  }
}

interface RoomStats {
  botName: string;
  openedAt: Date;
  playerJoins: number;
  playerLeaves: number;
  goals: number;
  peakPlayers: number;
}

//   __  ____ ____ _  _
// / _\/ ___) ___) )( \
//    \___ \___ ) \/ (
// \_/\_(____(____|____/
