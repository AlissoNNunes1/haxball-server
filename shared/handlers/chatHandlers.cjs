// Handler global para chat de time e mensagens privadas
// Centraliza toda logica de comunicacao entre jogadores

const { announce, whisper } = require('../config/messages.cjs');
const { formatPlayerName, findPlayerByName } = require('./playerHandlers.cjs');

// authHandler sera passado nas funcoes que precisam
let cachedAuthHandler = null;

/**
 * Define authHandler global para uso nas funcoes de chat
 * @param {object} handler - authHandler da sala
 */
function setAuthHandler(handler) {
  cachedAuthHandler = handler;
}

/**
 * Processa mensagem de chat de time (team chat)
 * Prefixo: "t " seguido da mensagem
 * Exemplo: "t vamos atacar" envia mensagem para todos do time
 *
 * @param {object} room - Instancia da sala Haxball
 * @param {object} player - Jogador que enviou mensagem
 * @param {string} message - Mensagem completa
 * @returns {boolean} true se foi team chat processado, false caso contrario
 */
function handleTeamChat(room, player, message) {
  if (!room || !player || typeof message !== 'string') return false;

  // Verifica se e team chat
  if (!message.startsWith('t ')) return false;

  const teamMsg = message.substring(2).trim();

  if (!teamMsg) {
    whisper(room, 'Uso: t <mensagem>', player.id, 0xff0000, 'normal', 1);
    return false;
  }

  const senderName = formatPlayerName(room, player, cachedAuthHandler);

  // Espectadores tem chat proprio
  if (player.team === 0) {
    const specs = room.getPlayerList().filter((p) => p.team === 0);

    specs.forEach((spec) => {
      announce(room, `[Spec] ${senderName}: ${teamMsg}`, spec.id, 0xdee7fa, 'normal', 1);
    });

    return true;
  }

  // Chat de time (vermelho ou azul)
  const teammates = room.getPlayerList().filter((p) => p.team === player.team);
  const teamColor = player.team === 1 ? 0xe56e56 : 0x5689e5;

  teammates.forEach((teammate) => {
    announce(room, `[Team] ${senderName}: ${teamMsg}`, teammate.id, teamColor, 'normal', 1);
  });

  return true;
}

/**
 * Processa mensagem privada (PM)
 * Prefixo: "@@" seguido do nome do jogador e mensagem
 * Exemplo: "@@Lukra oi" envia mensagem privada para jogador Lukra
 * Suporta underscores: "@@Lukra_Fifa oi" encontra jogador "Lukra Fifa"
 *
 * @param {object} room - Instancia da sala Haxball
 * @param {object} player - Jogador que enviou mensagem
 * @param {string} message - Mensagem completa
 * @returns {boolean} true se foi PM processado, false caso contrario
 */
function handlePrivateMessage(room, player, message) {
  if (!room || !player || typeof message !== 'string') return false;

  // Verifica se e mensagem privada
  if (!message.startsWith('@@')) return false;

  message = message.substr(2).trim();

  // Verifica formato basico
  if (message.indexOf(' ') === -1) {
    whisper(room, 'Uso: @@<nome_jogador> <mensagem>', player.id, 0xff0000, 'normal', 1);
    whisper(room, 'Use _ no lugar de espacos no nome', player.id, 0xffaa00, 'small', 0);
    whisper(room, 'Exemplo: @@Lukra_Fifa oi mano', player.id, 0xffaa00, 'small', 0);
    return true;
  }

  // Extrai nome do destinatario e mensagem
  const match = message.match(/^(\S+)\s(.*)/);
  if (!match || match.length < 3) {
    whisper(room, 'Uso: @@<nome_jogador> <mensagem>', player.id, 0xff0000, 'normal', 1);
    return true;
  }

  const targetName = match[1];
  const pmMsg = match[2];

  if (!pmMsg || !pmMsg.trim()) {
    whisper(room, 'A mensagem nao pode estar vazia', player.id, 0xff0000, 'normal', 1);
    return true;
  }

  // Busca jogador (com suporte a underscores)
  const targetPlayer = findPlayerByName(room, targetName);

  if (!targetPlayer) {
    whisper(room, `Impossivel encontrar usuario '${targetName}'`, player.id, 0xffa220, 'normal', 1);
    whisper(room, 'Dica: Use _ no lugar de espacos', player.id, 0xffaa00, 'small', 0);
    return true;
  }

  // Impede PM para si mesmo
  if (targetPlayer.id === player.id) {
    whisper(room, 'Voce nao pode enviar PM para si mesmo!', player.id, 0xff0000, 'normal', 1);
    return true;
  }

  // Formata nomes com tags visuais
  const senderName = formatPlayerName(room, player, cachedAuthHandler);
  const targetDisplayName = formatPlayerName(room, targetPlayer, cachedAuthHandler);

  // Envia PM para remetente (confirmacao)
  whisper(
    room,
    `[PM > ${targetDisplayName}] ${senderName}: ${pmMsg}`,
    player.id,
    0xffa220,
    'normal',
    1
  );

  // Envia PM para destinatario
  whisper(room, `[PM] ${senderName}: ${pmMsg}`, targetPlayer.id, 0xffa220, 'normal', 1);

  // Log para auditoria
  console.log(`[PM] ${player.name} -> ${targetPlayer.name}: ${pmMsg}`);

  return true;
}

/**
 * Processa chat global (mensagens normais)
 * Adiciona tag visual ao nome do jogador se existir
 *
 * @param {object} room - Instancia da sala Haxball
 * @param {object} player - Jogador que enviou mensagem
 * @param {string} message - Mensagem
 * @returns {boolean} sempre false (nao bloqueia processamento)
 */
function handleGlobalChat(room, player, message) {
  if (!room || !player) return false;

  // Chat global e processado normalmente pelo Haxball
  // Esta funcao existe apenas para futuras customizacoes

  const displayName = formatPlayerName(room, player, cachedAuthHandler);
  console.log(`[Chat] ${displayName}: ${message}`);

  return false; // Nao bloqueia processamento do chat
}

/**
 * Formata e envia chat global com tag e nome, cancelando mensagem padrao
 * @param {object} room - Instancia da sala Haxball
 * @param {object} player - Jogador que enviou
 * @param {string} message - Mensagem
 * @returns {boolean} true se tratado
 */
function handleFormattedGlobalChat(room, player, message) {
  if (!room || !player || typeof message !== 'string') return false;

  const trimmed = message.trim();
  if (!trimmed) return true;

  try {
    const displayName = formatPlayerName(room, player, cachedAuthHandler) || player.name;
    room.sendChat(`${displayName}: ${trimmed}`);
    console.log(`[Chat] ${displayName}: ${trimmed}`);
  } catch (error) {
    console.error('[Chat] Erro ao formatar mensagem:', error.message);
    // Fallback: envia mensagem simples sem tag
    room.sendChat(`${player.name}: ${trimmed}`);
  }
  return true;
}

/**
 * Processa todos os tipos de chat
 * Funcao helper que chama handlers especificos
 *
 * @param {object} room - Instancia da sala Haxball
 * @param {object} player - Jogador que enviou mensagem
 * @param {string} message - Mensagem completa
 * @returns {boolean} true se mensagem foi processada, false caso contrario
 */
function processChatMessage(room, player, message) {
  if (!room || !player || typeof message !== 'string') return false;

  // Tenta processar team chat
  if (handleTeamChat(room, player, message)) return true;

  // Tenta processar mensagem privada
  if (handlePrivateMessage(room, player, message)) return true;

  // Chat global (nao bloqueia)
  handleGlobalChat(room, player, message);

  return false;
}

/**
 * Handler principal para processamento de chat com suporte a comandos e formatacao
 * Centraliza toda logica de processamento de mensagens incluindo:
 * - Processamento de comandos globais (commands.cjs)
 * - Comandos locais (!swap, etc)
 * - Formatacao [TAG] Nome: mensagem
 * - Cancelamento de mensagem original + envio via sendChat
 *
 * Exemplo de uso:
 * room.onPlayerChat = (player, message) => {
 *   return handlePlayerChat(room, player, message, {
 *     processGlobalCommand: (room, player, message) => processCommand(room, player, message),
 *     customCommands: {
 *       'hello': (room, player, args) => room.sendChat('Ola ' + player.name),
 *       'swap': (room, player, args) => { ... }
 *     },
 *     tag: '[STADIUM]'
 *   });
 * };
 *
 * @param {object} room - Instancia da sala Haxball
 * @param {object} player - Jogador que enviou mensagem
 * @param {string} message - Mensagem do jogador
 * @param {object} options - Opcoes de configuracao
 * @param {function} options.processGlobalCommand - Callback para processar comandos globais (commands.cjs)
 * @param {object} options.customCommands - Map de comandos customizados {cmd: callback}
 * @param {string} options.tag - Tag para formatar mensagens (ex: '[STADIUM]')
 * @param {function} options.shouldBlockChat - Callback para validar se chat deve ser bloqueado
 * @param {function} options.formatMessage - Callback custom para formatar mensagem
 * @returns {boolean} true se bloqueou a mensagem, false caso contrario
 */
function handlePlayerChat(room, player, message, options = {}) {
  if (!room || !player || typeof message !== 'string') return false;

  // Normaliza entrada
  message = message.trim();
  if (!message) return false;

  // Extrair opcoes com defaults
  const processGlobalCommand = options.processGlobalCommand || (() => false);
  const customCommands = options.customCommands || {};
  const tag = options.tag || '';
  const shouldBlockChat = options.shouldBlockChat || (() => false);
  const formatMessage = options.formatMessage || null;

  // Bloquear chat se necessario (ex: sala mutada)
  if (shouldBlockChat(room, player, message)) return false;

  // PROCESSA COMANDOS GLOBAIS PRIMEIRO (commands.cjs - autenticacao, etc)
  if (processGlobalCommand(room, player, message)) return false;

  // Determina se e comando (comeca com !)
  const isCommand = message.startsWith('!');

  if (isCommand) {
    // Extrai comando e argumentos
    const content = message.substring(1).trim();
    const parts = content.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    // Processa comandos customizados da sala
    if (customCommands[cmd]) {
      try {
        customCommands[cmd](room, player, args, message);
      } catch (error) {
        console.error(`[Chat] Erro ao processar comando !${cmd}:`, error.message);
      }
      return false; // Bloqueia mensagem original
    }

    // Comando desconhecido - deixa passar
    return false;
  }

  // Chat normal - formata e envia via sendChat
  try {
    let formattedMessage;

    if (formatMessage) {
      // Usar callback custom de formatacao
      formattedMessage = formatMessage(room, player, message);
    } else {
      // Formatacao padrao: [TAG] Nome: mensagem
      const displayName = formatPlayerName(room, player, cachedAuthHandler) || player.name;
      formattedMessage = tag ? `${tag} ${displayName}: ${message}` : `${displayName}: ${message}`;
    }

    // Envia mensagem formatada e bloqueia original
    room.sendChat(formattedMessage);
    console.log(`[Chat] ${formattedMessage}`);
  } catch (error) {
    console.error('[Chat] Erro ao formatar/enviar mensagem:', error.message);
    // Fallback: envia simples
    const fallback = tag ? `${tag} ${player.name}: ${message}` : `${player.name}: ${message}`;
    room.sendChat(fallback);
  }

  return false; // Bloqueia mensagem original (ja enviamos formatada)
}

/**
 * Cria um conjunto de comandos swap padrao
 * Uso: mergeObjects(customCommands, createSwapCommand())
 *
 * @returns {object} Map com comando 'swap'
 */
function createSwapCommand() {
  return {
    swap: (room, player, args) => {
      if (!player.admin) {
        room.sendChat('Comando apenas de Admin');
        return;
      }

      const players = room.getPlayerList().filter((p) => p.id !== 0);
      if (players.length === 0) return;

      players.forEach((p) => {
        if (p.team === 1) {
          room.setPlayerTeam(p.id, 2);
        } else if (p.team === 2) {
          room.setPlayerTeam(p.id, 1);
        }
      });

      room.sendChat('Times foram trocados');
    },
  };
}

module.exports = {
  handleTeamChat,
  handlePrivateMessage,
  handleGlobalChat,
  handleFormattedGlobalChat,
  processChatMessage,
  handlePlayerChat,
  createSwapCommand,
  setAuthHandler,
};

//   __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
