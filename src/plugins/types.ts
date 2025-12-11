import { Server } from '../Server';
import { EventEmitter } from 'events';

/**
 * Interface para plugins do sistema
 * Define contrato padrao para extensoes modulares
 */
export interface Plugin {
  /** Nome unico do plugin */
  name: string;

  /** Versao semantica do plugin */
  version: string;

  /** Descricao breve da funcionalidade */
  description?: string;

  /** Autor do plugin */
  author?: string;

  /** Dependencias de outros plugins */
  dependencies?: string[];

  /**
   * Inicializa o plugin
   * Chamado quando plugin e carregado
   */
  init(context: PluginContext): void | Promise<void>;

  /**
   * Cleanup antes de descarregar plugin
   * Opcional, usado para liberar recursos
   */
  cleanup?(): void | Promise<void>;

  /**
   * Hook: Sala aberta
   */
  onRoomOpen?(room: RoomInfo): void | Promise<void>;

  /**
   * Hook: Sala fechada
   */
  onRoomClose?(room: RoomInfo): void | Promise<void>;

  /**
   * Hook: Comando Discord recebido
   */
  onCommand?(command: string, args: string[], context: CommandContext): void | Promise<void>;

  /**
   * Hook: Jogador entrou na sala
   */
  onPlayerJoin?(player: PlayerInfo, room: RoomInfo): void | Promise<void>;

  /**
   * Hook: Jogador saiu da sala
   */
  onPlayerLeave?(player: PlayerInfo, room: RoomInfo): void | Promise<void>;

  /**
   * Hook: Gol marcado
   */
  onTeamGoal?(team: number, room: RoomInfo): void | Promise<void>;

  /**
   * Hook: Sistema iniciando
   */
  onSystemStart?(): void | Promise<void>;

  /**
   * Hook: Sistema parando
   */
  onSystemStop?(): void | Promise<void>;
}

/**
 * Contexto fornecido ao plugin durante inicializacao
 */
export interface PluginContext {
  /** Servidor principal */
  server: Server;

  /** Event bus global */
  events: EventEmitter;

  /** Logger especifico do plugin */
  logger: PluginLogger;

  /** Configuracao do plugin */
  config: any;

  /** API para registrar comandos customizados */
  registerCommand(name: string, handler: CommandHandler): void;

  /** API para agendar tarefas periodicas */
  scheduleTask(interval: number, task: () => void | Promise<void>): TaskHandle;

  /** API para armazenar dados persistentes */
  storage: PluginStorage;
}

/**
 * Logger isolado por plugin
 */
export interface PluginLogger {
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}

/**
 * Storage persistente por plugin
 */
export interface PluginStorage {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
}

/**
 * Handler de comando customizado
 */
export type CommandHandler = (
  args: string[],
  context: CommandContext
) => void | Promise<void>;

/**
 * Contexto de comando Discord
 */
export interface CommandContext {
  userId: string;
  channelId: string;
  guildId: string;
  message: any; // Discord.Message
  reply(content: string): Promise<void>;
}

/**
 * Handle para tarefa agendada
 */
export interface TaskHandle {
  cancel(): void;
}

/**
 * Informacoes de sala
 */
export interface RoomInfo {
  pid: number;
  botName: string;
  token: string;
  playerCount: number;
  maxPlayers: number;
  openedAt: Date;
}

/**
 * Informacoes de jogador
 */
export interface PlayerInfo {
  id: number;
  name: string;
  auth: string;
  conn: string;
  team: number;
  admin: boolean;
}

/**
 * Metadados do plugin (package.json)
 */
export interface PluginManifest {
  name: string;
  version: string;
  description?: string;
  author?: string;
  main: string;
  dependencies?: Record<string, string>;
  pluginDependencies?: string[];
}

/**
 * Resultado de carregamento de plugin
 */
export interface PluginLoadResult {
  success: boolean;
  plugin?: Plugin;
  error?: Error;
}

//   __  ____ ____ _  _
// / _\/ ___) ___) )( \
//    \___ \___ ) \/ (
// \_/\_(____(____|____/
