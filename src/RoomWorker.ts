/**
 * Worker isolado para executar uma sala Haxball em processo separado
 * Cada sala roda em seu proprio processo Node.js para evitar conflito "Can't init twice"
 * Comunicacao com processo pai via IPC (Inter-Process Communication)
 */

import * as path from 'path';
import { initAuthDb } from './database/auth-client.js';
import { log } from './utils/log.js';

let HaxballJS: any;

// Interface para mensagens recebidas do processo pai
interface WorkerMessage {
  type: 'init' | 'close' | 'ping';
  data?: {
    script?: string;
    scriptPath?: string;
    token: string;
    name?: string;
    settings?: Record<string, any>;
    pid?: number;
  };
}

// Interface para mensagens enviadas ao processo pai
interface ParentMessage {
  type: 'ready' | 'link' | 'error' | 'closed' | 'pong';
  data?: {
    link?: string;
    pid?: number;
    error?: string;
    stack?: string;
  };
}

let room: any = null;
let roomPid: number = -1;

/**
 * Envia mensagem ao processo pai
 */
function sendToParent(message: ParentMessage): void {
  if (process.send) {
    process.send(message);
  }
}

/**
 * Inicializa o haxball.js e cria a sala
 */
async function initializeRoom(message: WorkerMessage): Promise<void> {
  try {
    const { script, scriptPath, token, name, settings, pid } = message.data || {};

    if (!token) {
      throw new Error('Token e obrigatorio');
    }

    roomPid = pid || -1;

    // Inicializar Auth DB (precisa estar disponivel para handlers de sala)
    try {
      initAuthDb();
      log('WORKER', `Auth DB inicializado no worker (PID ${process.pid})`);
    } catch (error) {
      const err = error instanceof Error ? error.message : String(error);
      log('WORKER', `AVISO: Erro ao inicializar Auth DB: ${err}`);
    }

    // Lazy import do haxball.js
    if (!HaxballJS) {
      const mod = await import('haxball.js');
      HaxballJS = (mod && (mod.default || mod)) as any;
    }

    // Inicializar haxball.js (UNICO por processo)
    const HBInit = await HaxballJS();
    log('WORKER', `haxball.js inicializado no worker (PID ${process.pid})`);

    // Configuracao da sala
    const roomConfig: any = {
      roomName: name || 'Haxball Room',
      maxPlayers: settings?.['reserved.haxball.maxPlayers']
        ? Number(settings['reserved.haxball.maxPlayers'])
        : 16,
      public: settings?.['reserved.haxball.public'] !== false,
      noPlayer: settings?.['reserved.haxball.noPlayer'] !== false,
      password: settings?.['reserved.haxball.password']
        ? String(settings['reserved.haxball.password'])
        : undefined,
      geo: settings?.['reserved.haxball.geo']
        ? JSON.parse(String(settings['reserved.haxball.geo']))
        : undefined,
      token: token,
    };

    // Remover undefined
    Object.keys(roomConfig).forEach((key) => {
      if (roomConfig[key] === undefined) {
        delete roomConfig[key];
      }
    });

    // Criar sala
    room = HBInit(roomConfig);
    log('WORKER', `Sala criada no worker (PID ${process.pid})`);

    // Setup do link handler ANTES do script carregar
    // Estrategia: Enviar link ao pai IMEDIATAMENTE quando recebido
    let linkSent = false;
    const ensureLinkSent = (link: string) => {
      if (linkSent) return;
      linkSent = true;
      log('WORKER', `Link recebido via interceptor: ${link}`);
      sendToParent({
        type: 'link',
        data: { link, pid: roomPid },
      });
    };

    // Definir handler inicial que envia ao pai
    room.onRoomLink = ensureLinkSent;

    // IMPORTANTE: Interceptar TODAS as atribuicoes futuras a onRoomLink
    // Criar um getter/setter que preserva NOSSO handler
    let userHandler: ((link: string) => void) | null = null;

    Object.defineProperty(room, 'onRoomLink', {
      configurable: false,
      enumerable: true,
      set: function (handler: any) {
        // Salvar handler do usuario
        userHandler = typeof handler === 'function' ? handler : null;
      },
      get: function () {
        // Retornar funcao combinada que chama AMBOS os handlers
        return (link: string) => {
          ensureLinkSent(link); // Sempre envia ao processo pai primeiro
          if (userHandler) {
            userHandler(link); // Depois chama handler do script
          }
        };
      },
    });

    // Aguardar para room estar COMPLETAMENTE inicializado
    // haxball.js pode nao ter todos os metodos disponiveis imediatamente
    // Usar loop com timeout para ter certeza de que sendAnnouncement esta pronto
    let maxWait = 3000; // 3 segundos total
    let waited = 0;
    const checkInterval = 100;

    while (waited < maxWait) {
      if (typeof room.sendAnnouncement === 'function') {
        log('WORKER', `room.sendAnnouncement disponivel apos ${waited}ms`);
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, checkInterval));
      waited += checkInterval;
    }

    if (typeof room.sendAnnouncement !== 'function') {
      log(
        'WORKER',
        'AVISO: room.sendAnnouncement ainda nao disponivel apos 3s, continuando mesmo assim...'
      );
    }

    // IMPORTANTE: Injetar contexto global ANTES de executar script
    // Isso garante que scripts que verificam `typeof room === 'undefined'` funcionem
    (globalThis as any).room = room;
    (globalThis as any).customSettings = settings || {};
    (globalThis as any).HBInit = (config?: any) => {
      log('WORKER', 'Script chamou HBInit - retornando room existente (mock)');
      // Aplicar configuracoes adicionais se fornecidas
      if (config) {
        if (config.roomName) log('WORKER', `Config ignorado (sala ja criada): ${config.roomName}`);
      }
      return room;
    };

    // Criar interceptador de require para injetar room em funcoes de mensagens
    // Isso garante compatibilidade com scripts que chamam whisper/announce sem room
    const Module = require('module');
    const originalRequire = Module.prototype.require;

    Module.prototype.require = function (id: string) {
      const mod = originalRequire.apply(this, [id] as any);

      // Se eh messages.cjs, envolver as funcoes para injetar room
      if (
        (id.includes('messages.cjs') || id.includes('messages')) &&
        mod &&
        typeof mod === 'object'
      ) {
        if (typeof mod.whisper === 'function') {
          const originalWhisper = mod.whisper;
          mod.whisper = function (...args: any[]) {
            // Se primeiro arg eh string (nao room), injetar room
            if (args.length > 0 && typeof args[0] === 'string' && args[0][0] !== '[object') {
              return originalWhisper(room, ...args);
            }
            return originalWhisper(...args);
          };
        }

        if (typeof mod.announce === 'function') {
          const originalAnnounce = mod.announce;
          mod.announce = function (...args: any[]) {
            // Se primeiro arg eh string (nao room), injetar room
            if (args.length > 0 && typeof args[0] === 'string' && args[0][0] !== '[object') {
              return originalAnnounce(room, ...args);
            }
            return originalAnnounce(...args);
          };
        }
      }

      return mod;
    };

    // Executar script do bot
    if (scriptPath) {
      const absolutePath = path.isAbsolute(scriptPath)
        ? scriptPath
        : path.resolve(process.cwd(), scriptPath);

      // Limpar cache
      if (require.cache[absolutePath]) {
        delete require.cache[absolutePath];
      }

      const scriptDir = path.dirname(absolutePath);
      const originalCwd = process.cwd();

      try {
        log('WORKER', `Carregando script de: ${scriptDir}`);
        log('WORKER', `Script path: ${absolutePath}`);

        // Executar script com context que tem process.chdir
        // Criar um modulo wrapper que executa com chdir
        const moduleWrapper = `
          (function() {
            const originalCwd = process.cwd();
            const scriptDir = ${JSON.stringify(scriptDir)};
            process.chdir(scriptDir);
            try {
              require(${JSON.stringify(absolutePath)});
            } finally {
              process.chdir(originalCwd);
            }
          })();
        `;
        eval(moduleWrapper);

        log('WORKER', `Script carregado com sucesso`);
      } catch (requireError) {
        const errMsg = requireError instanceof Error ? requireError.message : String(requireError);
        const errStack = requireError instanceof Error ? requireError.stack : undefined;
        log('WORKER', `ERRO ao carregar script: ${errMsg}`);
        if (errStack) log('WORKER', `Stack: ${errStack}`);
        throw requireError;
      } finally {
        // Restaurar diretorio original
        process.chdir(originalCwd);
      }
    } else if (script) {
      log('WORKER', `Executando script inline`);
      eval(script);
    }

    // Notificar processo pai que sala esta pronta
    sendToParent({
      type: 'ready',
      data: { pid: roomPid },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    log('WORKER', `ERRO ao inicializar sala: ${errorMsg}`);
    if (errorStack) {
      log('WORKER', `Stack trace: ${errorStack}`);
    }
    sendToParent({
      type: 'error',
      data: { error: errorMsg, pid: roomPid, stack: errorStack },
    });
    process.exit(1);
  }
}

/**
 * Fecha a sala e encerra o processo
 */
function closeRoom(): void {
  try {
    if (room) {
      log('WORKER', `Fechando sala (PID ${process.pid})`);
      // Haxball.js nao tem metodo explicito de close
      // O processo sera encerrado, liberando recursos
      room = null;
    }

    sendToParent({
      type: 'closed',
      data: { pid: roomPid },
    });

    // Aguardar um pouco para mensagem ser enviada
    setTimeout(() => {
      process.exit(0);
    }, 100);
  } catch (error) {
    log('WORKER', `Erro ao fechar sala: ${error}`);
    process.exit(1);
  }
}

/**
 * Handler de mensagens do processo pai
 */
process.on('message', (message: WorkerMessage) => {
  switch (message.type) {
    case 'init':
      initializeRoom(message);
      break;

    case 'close':
      closeRoom();
      break;

    case 'ping':
      sendToParent({ type: 'pong' });
      break;

    default:
      log('WORKER', `Mensagem desconhecida: ${message.type}`);
  }
});

// Handler de erros nao capturados
process.on('uncaughtException', (error) => {
  log('WORKER', `Uncaught exception: ${error.message}`);
  sendToParent({
    type: 'error',
    data: { error: error.message, pid: roomPid },
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  log('WORKER', `Unhandled rejection: ${reason}`);
  sendToParent({
    type: 'error',
    data: { error: String(reason), pid: roomPid },
  });
  process.exit(1);
});

log('WORKER', `Worker iniciado (PID ${process.pid})`);

/*
  __  ____ ____ _  _ 
 / _\/ ___) ___) )( \
/    \___ \___ ) \/ (
\_/\_(____(____|____/
*/
