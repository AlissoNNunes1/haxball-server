// Handler global para eventos de jogador e sistema de tags visuais
// Centraliza logica de nomes, tags e busca de jogadores

const { getPlayerTag } = require('../config/utils.cjs');

/**
 * Normaliza nome do jogador para comparacao
 * Converte underscores em espacos para facilitar digitacao em comandos
 * Exemplo: "Lukra_Fifa" vira "Lukra Fifa"
 *
 * @param {string} inputName - Nome digitado pelo usuario (pode conter underscores)
 * @returns {string} Nome normalizado com espacos
 */
function normalizePlayerName(inputName) {
  if (typeof inputName !== 'string') return '';
  return inputName.replace(/_/g, ' ');
}

/**
 * Encontra jogador por nome com suporte a underscores
 * Busca primeiro por nome exato, depois por nome normalizado (com espacos)
 * Exemplo: Buscar "Lukra_Fifa" encontra jogador com nome "Lukra Fifa"
 *
 * @param {object} room - Instancia da sala Haxball
 * @param {string} playerName - Nome do jogador a buscar (pode conter underscores)
 * @returns {object|null} Jogador encontrado ou null se nao existir
 */
function findPlayerByName(room, playerName) {
  if (!room || typeof playerName !== 'string') return null;

  const normalizedName = normalizePlayerName(playerName);
  const players = room.getPlayerList();

  // Busca primeiro por nome exato, depois por nome normalizado
  return players.find((p) => p.name === playerName || p.name === normalizedName) || null;
}

/**
 * Formata nome do jogador com tag visual (se existir)
 * Adiciona prefixo visual entre colchetes antes do nome
 * Exemplo: Se jogador tem tag "VIP", retorna "[VIP] Lukra"
 *
 * @param {object} room - Instancia da sala Haxball
 * @param {object} player - Objeto do jogador
 * @returns {string} Nome formatado com tag visual ou nome simples
 */
function formatPlayerName(room, player) {
  if (!room || !player) return '';

  const tag = getPlayerTag(room, player.id);
  if (tag && typeof tag === 'string' && tag.trim()) {
    return `[${tag.trim()}] ${player.name}`;
  }

  return player.name;
}

/**
 * Handler para evento onPlayerJoin
 * Processa entrada de jogador na sala
 *
 * @param {object} room - Instancia da sala Haxball
 * @param {object} player - Jogador que entrou
 * @param {object} options - Opcoes de configuracao
 * @param {function} options.welcomeMessage - Funcao customizada de boas-vindas (opcional)
 * @param {object} options.authHandler - Handler de autenticacao (opcional)
 */
function handlePlayerJoin(room, player, options = {}) {
  if (!room || !player) return;

  console.log(`${player.name} entrou na sala`);

  // Chama funcao de boas-vindas customizada se fornecida
  if (options.welcomeMessage && typeof options.welcomeMessage === 'function') {
    options.welcomeMessage(room, player);
  }

  // Integra com sistema de autenticacao se disponivel
  if (options.authHandler) {
    // Autenticacao sera processada pelo authHandler
    // Este handler apenas registra o evento
  }
}

/**
 * Handler para evento onPlayerLeave
 * Processa saida de jogador da sala
 *
 * @param {object} room - Instancia da sala Haxball
 * @param {object} player - Jogador que saiu
 * @param {object} options - Opcoes de configuracao
 * @param {function} options.onLeave - Callback customizado (opcional)
 */
function handlePlayerLeave(room, player, options = {}) {
  if (!room || !player) return;

  console.log(`${player.name} saiu da sala`);

  // Chama callback customizado se fornecido
  if (options.onLeave && typeof options.onLeave === 'function') {
    options.onLeave(room, player);
  }
}

/**
 * Aplica tag visual ao jogador (para uso futuro)
 * NOTA: API Haxball nao permite mudar nome diretamente
 * Tag visual e aplicada atraves de formatPlayerName() em mensagens
 *
 * @param {object} room - Instancia da sala Haxball
 * @param {object} player - Jogador
 * @param {string} tag - Tag visual a aplicar
 */
function applyVisualTag(room, player, tag) {
  if (!room || !player) return;

  // Tag visual sera exibida via formatPlayerName() em mensagens
  // Aqui podemos adicionar logica futura se API Haxball suportar

  console.log(`Tag visual "${tag}" configurada para ${player.name}`);
}

module.exports = {
  normalizePlayerName,
  findPlayerByName,
  formatPlayerName,
  handlePlayerJoin,
  handlePlayerLeave,
  applyVisualTag,
};

//   __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
