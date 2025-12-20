/**
 * Exemplo de uso do novo handlePlayerChat
 * Extrai toda logica de processamento de chat para handler compartilhado
 *
 * COMO USAR EM UMA SALA:
 * 1. Importar handlePlayerChat e createSwapCommand
 * 2. Configurar customCommands (opcoes de sala)
 * 3. Atribuir ao room.onPlayerChat
 *
 * BENEFICIOS:
 * - Zero duplicacao de codigo entre salas
 * - Garantido cancelamento de msg original + envio formatado
 * - Comandos reutilizaveis (swap, etc)
 * - Callbacks para comportamento custom (global commands, validacoes)
 */

// ============================================================
// EXEMPLO 1: Uso basico com tag e comando swap
// ============================================================

const { handlePlayerChat, createSwapCommand, setAuthHandler } = require('./chatHandlers.cjs');
const { processCommand } = require('../config/commands.cjs');

// Somewhere in handlers.cjs setup:
setAuthHandler(authHandler);

// Definir customCommands da sala
const customCommands = {
  ...createSwapCommand(), // Inclui comando swap padrao
  // Adicionar outros comandos especificos da sala
  hello: (room, player, args) => {
    room.sendChat(`Ola ${player.name}!`);
  },
  time: (room, player, args) => {
    room.sendChat(`Horario atual: ${new Date().toLocaleTimeString('pt-BR')}`);
  },
};

// ATRIBUIR AO HANDLER
room.onPlayerChat = (player, message) => {
  return handlePlayerChat(room, player, message, {
    processGlobalCommand: (room, player, message) => processCommand(room, player, message),
    customCommands: customCommands,
    tag: '[STADIUM]', // Prefix que aparece em todas as msgs
  });
};

// ============================================================
// EXEMPLO 2: Com validacoes customizadas (sala mutada, etc)
// ============================================================

let roomMuted = false;
let choosePositionMode = false;

room.onPlayerChat = (player, message) => {
  return handlePlayerChat(room, player, message, {
    processGlobalCommand: (room, player, message) => processCommand(room, player, message),
    customCommands: customCommands,
    tag: '[FUTSAL]',
    // Validacao customizada: bloquear chat se sala mutada
    shouldBlockChat: (room, player, message) => {
      // Permitir admins sempre
      if (player.admin) return false;

      // Bloquear chat normal se sala mutada
      if (roomMuted && !message.startsWith('!')) return false;

      // Permitir chat se em choosePositionMode apenas posicoes
      if (choosePositionMode && !message.startsWith('!')) {
        const positions = ['G', 'LD', 'LE', 'Z', 'MD', 'AE', 'AD'];
        const isPositionChoice = positions.includes(message.toUpperCase());
        if (!isPositionChoice) return false; // Bloqueia
      }

      return true; // Permite por padrao
    },
  });
};

// ============================================================
// EXEMPLO 3: Formatacao completamente customizada
// ============================================================

room.onPlayerChat = (player, message) => {
  return handlePlayerChat(room, player, message, {
    processGlobalCommand: (room, player, message) => processCommand(room, player, message),
    customCommands: customCommands,
    // Custom formatter: emoji por team + badge admin
    formatMessage: (room, player, message) => {
      const emoji = player.team === 1 ? '🔴' : player.team === 2 ? '🔵' : '👁️';
      const badge = player.admin ? ' 👑' : '';
      const displayName = (player.name || 'Unnamed') + badge;
      return `${emoji} ${displayName}: ${message}`;
    },
  });
};

// ============================================================
// EXEMPLO 4: Comandos reutilizaveis customizados
// ============================================================

// Criar helper para comandos que reusamos
function createAdminCommands() {
  return {
    mute: (room, player, args) => {
      if (!player.admin) {
        room.sendChat('Comando apenas de Admin');
        return;
      }
      roomMuted = true;
      room.sendChat('Sala foi mutada por: ' + player.name);
    },
    unmute: (room, player, args) => {
      if (!player.admin) {
        room.sendChat('Comando apenas de Admin');
        return;
      }
      roomMuted = false;
      room.sendChat('Sala foi desmutada por: ' + player.name);
    },
  };
}

const allCommands = {
  ...createSwapCommand(),
  ...createAdminCommands(),
  hello: (room, player, args) => {
    room.sendChat(`Ola ${player.name}!`);
  },
};

room.onPlayerChat = (player, message) => {
  return handlePlayerChat(room, player, message, {
    processGlobalCommand: (room, player, message) => processCommand(room, player, message),
    customCommands: allCommands,
    tag: '[CHAMPIONSHIP]',
    shouldBlockChat: (room, player, message) => {
      return !player.admin && roomMuted && !message.startsWith('!');
    },
  });
};

// ============================================================
// MIGRACAO A PARTIR DO HANDLER ANTIGO
// ============================================================

/**
 * ANTES (hardcoded em handlers.cjs):
 *
 * room.onPlayerChat = function (player, message) {
 *   if (typeof message !== 'string') return false;
 *   message = message.trim();
 *
 *   const commandHandled = processCommand(room, player, message);
 *   if (commandHandled) return false;
 *
 *   const isCommandPrompt = message.startsWith('!');
 *   const incoming = isCommandPrompt ? message.substr(1).trim() : message;
 *   let args = incoming.split(/\s+/);
 *
 *   // Validacoes
 *   if ((choosePositionMode && !isCommandPrompt) || (sala_mutada && !player.admin))
 *     return false;
 *
 *   // Processamento de comando
 *   if (isCommandPrompt) {
 *     const cmd = args[0].toLowerCase();
 *     if (cmd == 'swap') {
 *       if (player.admin) {
 *         const players = room.getPlayerList().filter((p) => p.id != 0);
 *         players.forEach((p) => {
 *           if (p.team == 1) room.setPlayerTeam(p.id, 2);
 *           if (p.team == 2) room.setPlayerTeam(p.id, 1);
 *         });
 *         announce('Times foram trocados');
 *       }
 *     }
 *   }
 *
 *   // Formatacao
 *   const displayName = formatPlayerName(room, player, authHandler) || player.name;
 *   room.sendChat(`${displayName}: ${message}`);
 *   console.log(`[Chat] ${displayName}: ${message}`);
 *   return false;
 * };
 *
 * DEPOIS (com handlePlayerChat):
 *
 * room.onPlayerChat = (player, message) => {
 *   return handlePlayerChat(room, player, message, {
 *     processGlobalCommand: (room, player, message) => processCommand(room, player, message),
 *     customCommands: {
 *       ...createSwapCommand(),
 *     },
 *     tag: '[STADIUM]',
 *     shouldBlockChat: (room, player, message) => {
 *       return !player.admin && sala_mutada && !message.startsWith('!');
 *     },
 *   });
 * };
 *
 * VANTAGENS:
 * ✓ 90% menos codigo duplicado
 * ✓ Logica centralizada em chatHandlers.cjs
 * ✓ Facil adicionar novos comandos
 * ✓ Garantido funcionar igual em todas salas
 * ✓ Melhor manutencao
 */

// ============================================================
// API DE EXPORTACAO PARA REUTILIZAR CONJUNTOS DE COMANDOS
// ============================================================

/**
 * Exportar comandos da sala para reutilizacao
 * Permitir que outras salas herde comandos base
 */

function createRealSoccerCommands() {
  return {
    ...createSwapCommand(),
    formacao: (room, player, args) => {
      if (!player.admin) {
        room.sendChat('Comando apenas de Admin');
        return;
      }
      if (args.length < 2) {
        room.sendChat('Uso: !formacao <red|blue> <formation>');
        return;
      }
      const team = args[0].toLowerCase();
      const formation = args[1].toLowerCase();
      // Logica de formacao aqui
      room.sendChat(`Formacao do time ${team} alterada para ${formation}`);
    },
  };
}

function createFutsalCommands() {
  return {
    ...createSwapCommand(),
    // Futsals podem ter seus proprios comandos
  };
}

module.exports = {
  createRealSoccerCommands,
  createFutsalCommands,
};

//   __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
