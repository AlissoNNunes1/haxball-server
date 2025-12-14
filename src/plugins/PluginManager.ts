import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Server } from '../Server';
import { log } from '../utils/log';
import {
  CommandHandler,
  Plugin,
  PluginContext,
  PluginLoadResult,
  PluginLogger,
  PluginManifest,
  PluginStorage,
} from './types';

/**
 * Gerenciador de plugins
 * Carrega, inicializa e gerencia ciclo de vida de plugins
 */
export class PluginManager {
  private plugins: Map<string, Plugin>;
  private contexts: Map<string, PluginContext>;
  private eventBus: EventEmitter;
  private pluginsDir: string;
  private server: Server;
  private commands: Map<string, { plugin: string; handler: CommandHandler }>;

  constructor(server: Server, pluginsDir: string = './plugins') {
    this.server = server;
    this.pluginsDir = pluginsDir;
    this.plugins = new Map();
    this.contexts = new Map();
    this.commands = new Map();
    this.eventBus = new EventEmitter();
    this.eventBus.setMaxListeners(100); // Suporta muitos plugins
  }

  /**
   * Carrega todos os plugins do diretorio
   */
  async loadAll(): Promise<void> {
    log('info', `Carregando plugins de ${this.pluginsDir}...`);

    try {
      const entries = await fs.readdir(this.pluginsDir, { withFileTypes: true });

      const pluginDirs = entries.filter((entry) => entry.isDirectory());

      for (const dir of pluginDirs) {
        const pluginPath = path.join(this.pluginsDir, dir.name);
        await this.loadPlugin(pluginPath);
      }

      log('info', `${this.plugins.size} plugin(s) carregado(s)`);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        log('info', 'Diretorio de plugins nao existe, pulando...');
      } else {
        log('error', `Erro ao carregar plugins: ${error.message}`);
      }
    }
  }

  /**
   * Carrega plugin especifico
   */
  async loadPlugin(pluginPath: string): Promise<PluginLoadResult> {
    try {
      // Le manifest (package.json)
      const manifestPath = path.join(pluginPath, 'package.json');
      const manifestData = await fs.readFile(manifestPath, 'utf-8');
      const manifest: PluginManifest = JSON.parse(manifestData);

      // Verifica se ja esta carregado
      if (this.plugins.has(manifest.name)) {
        log('warn', `Plugin ${manifest.name} ja carregado`);
        return { success: false, error: new Error('Plugin ja carregado') };
      }

      // Carrega modulo principal
      const mainPath = path.join(pluginPath, manifest.main);
      const pluginModule = require(mainPath);

      // Instancia plugin
      const PluginClass = pluginModule.default || pluginModule;
      const plugin: Plugin = new PluginClass();

      // Valida interface
      if (!plugin.name || !plugin.version || typeof plugin.init !== 'function') {
        throw new Error('Plugin nao implementa interface correta');
      }

      // Verifica dependencias
      if (plugin.dependencies) {
        for (const dep of plugin.dependencies) {
          if (!this.plugins.has(dep)) {
            throw new Error(`Dependencia faltando: ${dep}`);
          }
        }
      }

      // Cria contexto
      const context = this.createContext(plugin, manifest);

      // Inicializa plugin
      await plugin.init(context);

      // Registra
      this.plugins.set(plugin.name, plugin);
      this.contexts.set(plugin.name, context);

      log('info', `Plugin ${plugin.name} v${plugin.version} carregado`);

      // Emite evento
      this.eventBus.emit('plugin:loaded', plugin);

      return { success: true, plugin };
    } catch (error: any) {
      log('error', `Erro ao carregar plugin ${pluginPath}: ${error.message}`);
      return { success: false, error };
    }
  }

  /**
   * Cria contexto para plugin
   */
  private createContext(plugin: Plugin, manifest: PluginManifest): PluginContext {
    const logger = this.createLogger(plugin.name);
    const storage = this.createStorage(plugin.name);

    const context: PluginContext = {
      server: this.server,
      events: this.eventBus,
      logger,
      config: manifest,
      storage,

      registerCommand: (name: string, handler: CommandHandler) => {
        this.commands.set(name, { plugin: plugin.name, handler });
        log('debug', `Comando !${name} registrado por ${plugin.name}`);
      },

      scheduleTask: (interval: number, task: () => void | Promise<void>) => {
        try {
          const { createNamedInterval, clearNamedTimer } = require('../../shared/config/roomTimers.cjs');
          const roomKey = `plugin:${plugin.name}`;
          const name = `task_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
          createNamedInterval(roomKey, name, async () => {
            try {
              await task();
            } catch (error: any) {
              logger.error(`Erro na tarefa agendada: ${error.message}`);
            }
          }, interval);

          return {
            cancel: () => clearNamedTimer(roomKey, name),
          };
        } catch (e) {
          const timer = setInterval(async () => {
            try {
              await task();
            } catch (error: any) {
              logger.error(`Erro na tarefa agendada: ${error.message}`);
            }
          }, interval);

          return {
            cancel: () => clearInterval(timer),
          };
        }
      },
    };

    return context;
  }

  /**
   * Cria logger isolado para plugin
   */
  private createLogger(pluginName: string): PluginLogger {
    return {
      info: (message: string, ...args: any[]) => {
        try {
          const extra = args.length ? ' ' + args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ') : '';
          log('info', `[${pluginName}] ${message}${extra}`);
        } catch (_) {
          log('info', `[${pluginName}] ${message}`);
        }
      },
      warn: (message: string, ...args: any[]) => {
        try {
          const extra = args.length ? ' ' + args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ') : '';
          log('warn', `[${pluginName}] ${message}${extra}`);
        } catch (_) {
          log('warn', `[${pluginName}] ${message}`);
        }
      },
      error: (message: string, ...args: any[]) => {
        try {
          const extra = args.length ? ' ' + args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ') : '';
          log('error', `[${pluginName}] ${message}${extra}`);
        } catch (_) {
          log('error', `[${pluginName}] ${message}`);
        }
      },
      debug: (message: string, ...args: any[]) => {
        try {
          const extra = args.length ? ' ' + args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ') : '';
          log('debug', `[${pluginName}] ${message}${extra}`);
        } catch (_) {
          log('debug', `[${pluginName}] ${message}`);
        }
      },
    };
  }

  /**
   * Cria storage isolado para plugin
   */
  private createStorage(pluginName: string): PluginStorage {
    const storageDir = path.join('./data/plugins', pluginName);
    const storageFile = path.join(storageDir, 'storage.json');

    const ensureDir = async () => {
      await fs.mkdir(storageDir, { recursive: true });
    };

    const loadData = async (): Promise<Record<string, any>> => {
      try {
        const data = await fs.readFile(storageFile, 'utf-8');
        return JSON.parse(data);
      } catch {
        return {};
      }
    };

    const saveData = async (data: Record<string, any>) => {
      await ensureDir();
      await fs.writeFile(storageFile, JSON.stringify(data, null, 2));
    };

    return {
      get: async <T>(key: string): Promise<T | null> => {
        const data = await loadData();
        return data[key] || null;
      },

      set: async <T>(key: string, value: T): Promise<void> => {
        const data = await loadData();
        data[key] = value;
        await saveData(data);
      },

      delete: async (key: string): Promise<void> => {
        const data = await loadData();
        delete data[key];
        await saveData(data);
      },

      clear: async (): Promise<void> => {
        await saveData({});
      },

      keys: async (): Promise<string[]> => {
        const data = await loadData();
        return Object.keys(data);
      },
    };
  }

  /**
   * Descarrega plugin
   */
  async unloadPlugin(pluginName: string): Promise<void> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin ${pluginName} nao encontrado`);
    }

    // Cleanup
    if (plugin.cleanup) {
      await plugin.cleanup();
    }

    // Remove comandos registrados
    for (const [cmd, data] of this.commands) {
      if (data.plugin === pluginName) {
        this.commands.delete(cmd);
      }
    }

    // Remove registros
    this.plugins.delete(pluginName);
    this.contexts.delete(pluginName);

    log('info', `Plugin ${pluginName} descarregado`);
    this.eventBus.emit('plugin:unloaded', pluginName);
  }

  /**
   * Recarrega plugin
   */
  async reloadPlugin(pluginName: string): Promise<void> {
    const context = this.contexts.get(pluginName);
    if (!context) {
      throw new Error(`Plugin ${pluginName} nao encontrado`);
    }

    const pluginPath = path.join(this.pluginsDir, pluginName);

    await this.unloadPlugin(pluginName);

    // Limpa cache do require
    delete require.cache[require.resolve(pluginPath)];

    await this.loadPlugin(pluginPath);
  }

  /**
   * Lista plugins carregados
   */
  listPlugins(): Array<{ name: string; version: string; description?: string }> {
    return Array.from(this.plugins.values()).map((plugin) => ({
      name: plugin.name,
      version: plugin.version,
      description: plugin.description,
    }));
  }

  /**
   * Obtem plugin por nome
   */
  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * Executa comando customizado
   */
  async executeCommand(command: string, args: string[], context: any): Promise<boolean> {
    const cmd = this.commands.get(command);
    if (!cmd) return false;

    try {
      await cmd.handler(args, context);
      return true;
    } catch (error: any) {
      log('error', `Erro ao executar comando !${command}: ${error.message}`);
      return false;
    }
  }

  /**
   * Dispara hook em todos os plugins
   */
  async triggerHook(hookName: string, ...args: any[]): Promise<void> {
    for (const plugin of this.plugins.values()) {
      const hook = (plugin as any)[hookName];
      if (typeof hook === 'function') {
        try {
          await hook.apply(plugin, args);
        } catch (error: any) {
          log('error', `Erro no hook ${hookName} do plugin ${plugin.name}: ${error.message}`);
        }
      }
    }
  }

  /**
   * Descarrega todos os plugins
   */
  async unloadAll(): Promise<void> {
    log('info', 'Descarregando todos os plugins...');

    const pluginNames = Array.from(this.plugins.keys());

    for (const name of pluginNames) {
      await this.unloadPlugin(name);
    }

    log('info', 'Todos os plugins descarregados');
  }

  /**
   * Retorna event bus global
   */
  getEventBus(): EventEmitter {
    return this.eventBus;
  }
}

//   __  ____ ____ _  _
// / _\/ ___) ___) )( \
//    \___ \___ ) \/ (
// \_/\_(____(____|____/
