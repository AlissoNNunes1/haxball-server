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
    return true;
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
  const teamColor = player.team === 1 ? 0xed6a5a : 0x5995ed;

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

module.exports = {
  handleTeamChat,
  handlePrivateMessage,
  handleGlobalChat,
  handleFormattedGlobalChat,
  processChatMessage,
  setAuthHandler,
};

//   __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
