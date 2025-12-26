/**
 * Comandos globais para todas as salas Haxball
 * Inclui comandos de autenticacao e comandos gerais
 *
 * Para usar em um bot:
 * const { processCommand } = require('./shared/config/commands.cjs');
 *
 * No onPlayerChat:
 * const handled = processCommand(room, player, message);
 * if (handled) return false;
 */

// Importa funcoes AFK globais e utilitarios extras (tags)
const {
  setPlayerAFK,
  isPlayerAFK,
  removeAFKPlayer,
  setPlayerTag,
  clearPlayerTag,
  getPlayerTag,
} = require('./utils.cjs');

// Importa handlers globais de chat
const { handleTeamChat, handlePrivateMessage } = require('../handlers/chatHandlers.cjs');

// Importa RoomAuthHandler para comandos de autenticacao
let RoomAuthHandler;
let authHandler;

try {
  const authModule = require('../../dist/auth/RoomAuthHandler');
  RoomAuthHandler = authModule.RoomAuthHandler;
  authHandler = new RoomAuthHandler();
  console.log('[COMMANDS] Sistema de autenticacao carregado');
} catch (error) {
  console.error('[COMMANDS] Erro ao carregar RoomAuthHandler:', error.message);
  console.log('[COMMANDS] Comandos de autenticacao desabilitados');
}

/**
 * Processa comandos globais
 * @param {object} room - Instancia da sala Haxball
 * @param {object} player - Jogador que enviou o comando
 * @param {string} message - Mensagem completa
 * @returns {boolean} true se comando foi processado, false caso contrario
 */
function processCommand(room, player, message) {
  if (typeof message !== 'string') return false;

  message = message.trim();

  // PROCESSA CHAT HANDLERS PRIMEIRO (t e @@)
  // Estes nao usam ! entao processam antes
  if (handleTeamChat(room, player, message)) return true;
  if (handlePrivateMessage(room, player, message)) return true;

  // TODOS os comandos Haxball usam ! (autenticacao + gerais)
  if (message.startsWith('!')) {
    const cmd = message.split(' ')[0].toLowerCase();

    // Comandos de autenticacao
    if (cmd === '!login') {
      handleLogin(room, player, message);
      return true;
    }
    if (cmd === '!logout') {
      handleLogout(room, player);
      return true;
    }
    if (cmd === '!profile') {
      handleProfile(room, player, message);
      return true;
    }
    if (cmd === '!stats') {
      handleStats(room, player);
      return true;
    }
    if (cmd === '!ranking') {
      handleRanking(room, player, message);
      return true;
    }
    if (cmd === '!top') {
      handleTop(room, player);
      return true;
    }

    // Comandos gerais
    return processGeneralCommand(room, player, message);
  }

  return false;
}

/**
 * Processa comandos de autenticacao com !
 */
function processAuthCommand(room, player, message) {
  // Funcao mantida por compatibilidade, mas agora processCommand chama diretamente
  return false;
}

/**
 * Processa comandos gerais com !
 */
function processGeneralCommand(room, player, message) {
  const args = message.substring(1).trim().split(/\s+/);
  const cmd = args[0].toLowerCase();

  // !help ou !ajuda - mostra TODOS os comandos
  if (cmd === 'help' || cmd === 'ajuda') {
    handleGeneralHelp(room, player);
    return true;
  }

  // !afk
  if (cmd === 'afk') {
    handleAFK(room, player);
    return true;
  }

  // !bb - ir para espectador
  if (cmd === 'bb') {
    handleGoSpectator(room, player);
    return true;
  }

  // !discord ou !dc - mostrar link do Discord
  if (cmd === 'discord' || cmd === 'dc') {
    handleDiscord(room, player);
    return true;
  }

  // !admin - promocao rapida (apenas para assu)
  if (cmd === 'admin') {
    if (player.name && player.name.toLowerCase() === 'assu') {
      room.setPlayerAdmin(player.id, true);
      room.sendAnnouncement('Admin concedido.', player.id, 0x00ff00, 'bold', 1);
    } else {
      room.sendAnnouncement(
        'Somente assu pode usar este comando.',
        player.id,
        0xff9900,
        'normal',
        1
      );
    }
    return true;
  }

  return false;
}

// ========== COMANDOS DE AUTENTICACAO ==========

async function handleLogin(room, player, message) {
  const args = message.split(' ');
  if (args.length < 2) {
    room.sendAnnouncement('[AUTH] Uso: !login <senha>', player.id, 0xff9900, 'bold', 2);
    return;
  }

  const password = args.slice(1).join(' ');

  try {
    const result = await authHandler.login(player, password);

    if (result.success) {
      room.sendAnnouncement(
        '✓ SENHA CORRETA! Login realizado com sucesso!',
        player.id,
        0x00ff00,
        'bold',
        2
      );

      if (result.account) {
        room.sendAnnouncement(
          `Bem-vindo, [${result.account.ranking}] ${result.account.haxballNick}!`,
          player.id,
          0x00ff00,
          'bold',
          1
        );

        // Define tag de ranking (nao altera avatar)
        try {
          setPlayerTag(room, player.id, `[${result.account.ranking}]`);
        } catch (err) {
          console.error('[COMMANDS] Erro ao definir tag:', err.message);
        }

        room.sendAnnouncement(
          `Pontos: ${result.account.points} | Ranking: ${result.account.ranking} | Moedas: ${result.account.coins}`,
          player.id,
          0x55ff55,
          'normal',
          1
        );

        // Mensagem global
        const eloTag = `[${result.account.ranking}]`;
        room.sendAnnouncement(
          `${eloTag} ${player.name} autenticou-se com sucesso!`,
          null,
          0xaaffaa,
          'normal',
          1
        );

        // Auto-admin para assu
        if (player.name && player.name.toLowerCase() === 'assu') {
          try {
            room.setPlayerAdmin(player.id, true);
            room.sendAnnouncement(
              'Admin concedido automaticamente para assu.',
              player.id,
              0x55ff55,
              'bold',
              1
            );
          } catch (err) {
            console.error('[COMMANDS] Erro ao promover assu para admin:', err.message);
          }
        }
      }
    } else {
      room.sendAnnouncement('❌ SENHA INCORRETA! Tente novamente.', player.id, 0xff0000, 'bold', 2);

      room.sendAnnouncement(
        'Verifique sua senha e tente novamente. Esqueceu? Contate um admin no Discord.',
        player.id,
        0xff9900,
        'small',
        1
      );
    }
  } catch (error) {
    console.error('[COMMANDS] Erro ao fazer login:', error);
    room.sendAnnouncement(
      '❌ Erro ao fazer login. Tente novamente.',
      player.id,
      0xff0000,
      'bold',
      2
    );
  }
}

function handleLogout(room, player) {
  try {
    authHandler.logout(player);
    room.sendAnnouncement('✓ Logout realizado com sucesso!', player.id, 0x00ff00, 'bold', 2);
    try {
      // Limpa tag ao desconectar para evitar tags obsoletas
      clearPlayerTag(room, player.id);
    } catch (err) {
      console.error('[COMMANDS] Erro ao limpar tag do player:', err.message);
    }
  } catch (error) {
    console.error('[COMMANDS] Erro ao fazer logout:', error);
  }
}

async function handleProfile(room, player, message) {
  const args = message.split(' ');
  const targetNick = args.length > 1 ? args.slice(1).join(' ') : player.name;

  try {
    const profile = await authHandler.getProfile(targetNick);

    if (profile) {
      room.sendAnnouncement(
        `═══ Perfil de ${profile.haxballNick} ═══`,
        player.id,
        0x55aaff,
        'bold',
        2
      );
      room.sendAnnouncement(
        `Ranking: ${profile.ranking} | Pontos: ${profile.points}`,
        player.id,
        0xaaaaaa,
        'normal',
        1
      );
      room.sendAnnouncement(
        `Vitorias: ${profile.wins || 0} | Derrotas: ${profile.losses || 0} | Empates: ${
          profile.draws || 0
        }`,
        player.id,
        0xaaaaaa,
        'normal',
        1
      );
      room.sendAnnouncement(
        `Gols: ${profile.goals || 0} | Assistencias: ${profile.assists || 0} | Defesas: ${
          profile.saves || 0
        }`,
        player.id,
        0xaaaaaa,
        'normal',
        1
      );
    } else {
      room.sendAnnouncement(
        `Perfil de ${targetNick} nao encontrado.`,
        player.id,
        0xff9900,
        'normal',
        1
      );
    }
  } catch (error) {
    console.error('[COMMANDS] Erro ao buscar perfil:', error);
    room.sendAnnouncement('❌ Erro ao buscar perfil.', player.id, 0xff0000, 'normal', 1);
  }
}

async function handleStats(room, player) {
  try {
    const isAuth = authHandler.isAuthenticated(player.id);

    if (!isAuth) {
      room.sendAnnouncement(
        'Voce precisa fazer login primeiro! Use: !login <senha>',
        player.id,
        0xff9900,
        'bold',
        2
      );
      return;
    }

    // Unificar com /profile: reusar a logica de exibir perfil (evita duplicacao)
    await handleProfile(room, player, `/profile ${player.name}`);
  } catch (error) {
    console.error('[COMMANDS] Erro ao buscar stats:', error);
  }
}

async function handleRanking(room, player, message) {
  const args = message.split(' ');
  const targetNick = args.length > 1 ? args.slice(1).join(' ') : player.name;

  try {
    const ranking = await authHandler.getRanking(targetNick);

    if (ranking) {
      room.sendAnnouncement(
        `${targetNick} - Ranking: ${ranking.position}º | Elo: ${ranking.ranking} | Pontos: ${ranking.points}`,
        player.id,
        0x55aaff,
        'bold',
        2
      );
    } else {
      room.sendAnnouncement(
        `Jogador ${targetNick} nao encontrado no ranking.`,
        player.id,
        0xff9900,
        'normal',
        1
      );
    }
  } catch (error) {
    console.error('[COMMANDS] Erro ao buscar ranking:', error);
  }
}

async function handleTop(room, player) {
  try {
    const top10 = await authHandler.getTop10();

    if (top10 && top10.length > 0) {
      room.sendAnnouncement(`═══ TOP 10 JOGADORES ═══`, player.id, 0xffaa00, 'bold', 2);

      top10.forEach((p, index) => {
        const medal =
          index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}º`;
        room.sendAnnouncement(
          `${medal} ${p.haxballNick} - Ranking: ${p.ranking} | Pontos: ${p.points}`,
          player.id,
          0xaaaaaa,
          'normal',
          1
        );
      });
    } else {
      room.sendAnnouncement('Ranking vazio no momento.', player.id, 0xff9900, 'normal', 1);
    }
  } catch (error) {
    console.error('[COMMANDS] Erro ao buscar top 10:', error);
  }
}

function handleAuthHelp(room, player) {
  room.sendAnnouncement('═══ COMANDOS DE AUTENTICACAO ═══', player.id, 0x55aaff, 'bold', 2);
  room.sendAnnouncement(
    '!login <senha> - Fazer login na sua conta',
    player.id,
    0xaaaaaa,
    'normal',
    1
  );
  room.sendAnnouncement('/logout - Desconectar da sua conta', player.id, 0xaaaaaa, 'normal', 1);
  room.sendAnnouncement(
    '!profile [nick] - Ver perfil de jogador',
    player.id,
    0xaaaaaa,
    'normal',
    1
  );
  room.sendAnnouncement(
    '/stats - Ver suas estatisticas (precisa estar logado)',
    player.id,
    0xaaaaaa,
    'normal',
    1
  );
  room.sendAnnouncement(
    '/ranking [nick] - Ver posicao no ranking',
    player.id,
    0xaaaaaa,
    'normal',
    1
  );
  room.sendAnnouncement('/top - Ver top 10 jogadores', player.id, 0xaaaaaa, 'normal', 1);
  room.sendAnnouncement(
    'Para registrar uma conta, use !register no Discord',
    player.id,
    0xff9900,
    'small',
    1
  );
}

// ========== COMANDOS GERAIS ==========

function handleGeneralHelp(room, player) {
  room.sendAnnouncement('═══ COMANDOS DISPONIVEIS ═══', player.id, 0x55aaff, 'bold', 2);

  // Comandos de autenticacao
  room.sendAnnouncement('--- Autenticacao ---', player.id, 0xffaa00, 'bold', 1);
  room.sendAnnouncement(
    '!login <senha> - Fazer login na sua conta',
    player.id,
    0xaaaaaa,
    'normal',
    1
  );
  room.sendAnnouncement('!logout - Desconectar da sua conta', player.id, 0xaaaaaa, 'normal', 1);
  room.sendAnnouncement(
    '!profile [nick] - Ver perfil de jogador',
    player.id,
    0xaaaaaa,
    'normal',
    1
  );
  room.sendAnnouncement(
    '!stats - Ver suas estatisticas (precisa estar logado)',
    player.id,
    0xaaaaaa,
    'normal',
    1
  );
  room.sendAnnouncement(
    '!ranking [nick] - Ver posicao no ranking',
    player.id,
    0xaaaaaa,
    'normal',
    1
  );
  room.sendAnnouncement('!top - Ver top 10 jogadores', player.id, 0xaaaaaa, 'normal', 1);

  // Comandos de chat
  room.sendAnnouncement('--- Chat ---', player.id, 0xffaa00, 'bold', 1);
  room.sendAnnouncement('t <mensagem> - Chat da equipe', player.id, 0xaaaaaa, 'normal', 1);
  room.sendAnnouncement(
    '@@ <nome> <mensagem> - Mensagem privada',
    player.id,
    0xaaaaaa,
    'normal',
    1
  );

  // Comandos gerais
  room.sendAnnouncement('--- Comandos Gerais ---', player.id, 0xffaa00, 'bold', 1);
  room.sendAnnouncement('!help - Mostra esta lista de comandos', player.id, 0xaaaaaa, 'normal', 1);
  room.sendAnnouncement(
    '!afk - Alternar entre time e espectadores',
    player.id,
    0xaaaaaa,
    'normal',
    1
  );
  room.sendAnnouncement('!bb - Sair da sala', player.id, 0xaaaaaa, 'normal', 1);
  room.sendAnnouncement(
    '!discord ou !dc - Link do Discord da comunidade',
    player.id,
    0xaaaaaa,
    'normal',
    1
  );

  room.sendAnnouncement(
    'Para registrar uma conta, use /register no Discord',
    player.id,
    0xff9900,
    'small',
    1
  );
}

function handleDiscord(room, player) {
  room.sendAnnouncement('', player.id, null, null, 0);
  room.sendAnnouncement('═══════════════════════════════════', player.id, 0x55aaff, 'bold', 2);
  room.sendAnnouncement('🔗 DISCORD DA COMUNIDADE CHA', player.id, 0x00ff00, 'bold', 2);
  room.sendAnnouncement('═══════════════════════════════════', player.id, 0x55aaff, 'bold', 2);
  room.sendAnnouncement('', player.id, null, null, 0);
  room.sendAnnouncement('Entre no nosso Discord:', player.id, 0xaaaaaa, 'normal', 1);
  room.sendAnnouncement('https://discord.gg/b2km7nvHP7', player.id, 0xffaa00, 'bold', 1);
  room.sendAnnouncement('', player.id, null, null, 0);
  room.sendAnnouncement('✓ Registre sua conta com /register', player.id, 0xaaaaaa, 'small', 1);
  room.sendAnnouncement('✓ Participe de campeonatos e eventos', player.id, 0xaaaaaa, 'small', 1);
  room.sendAnnouncement('✓ Acompanhe rankings e estatisticas', player.id, 0xaaaaaa, 'small', 1);
  room.sendAnnouncement('✓ Interaja com a comunidade', player.id, 0xaaaaaa, 'small', 1);
  room.sendAnnouncement('', player.id, null, null, 0);
  room.sendAnnouncement('═══════════════════════════════════', player.id, 0x55aaff, 'bold', 2);
}

function handleAFK(room, player) {
  if (isPlayerAFK(player.id)) {
    // Jogador ja esta em AFK, sair do estado AFK
    const prevTeam = removeAFKPlayer(player.id);

    // Tenta recolocar no time anterior se houver vaga
    if (prevTeam && prevTeam !== 0) {
      const players = room.getPlayerList();
      const targetTeamCount = players.filter((p) => p.team === prevTeam).length;
      const maxPerTeam = Math.ceil((room.getPlayerList().length || 16) / 2);

      if (targetTeamCount < maxPerTeam) {
        room.setPlayerTeam(player.id, prevTeam);
        room.sendAnnouncement(
          `${player.name} voltou para o time ${prevTeam === 1 ? 'vermelho' : 'azul'}`,
          null,
          0x00ff00,
          'normal',
          1
        );
      } else {
        room.sendAnnouncement(
          `${player.name} saiu do estado AFK, mas nao havia vaga no seu time.`,
          player.id,
          0xff9900,
          'normal',
          1
        );
      }
    } else {
      room.sendAnnouncement(`${player.name} saiu do estado AFK.`, player.id, 0x00ff00, 'normal', 1);
    }
  } else {
    // Colocar jogador em estado AFK e mover para espectadores
    const prevTeam = player.team || 0;
    setPlayerAFK(player.id, true, prevTeam);
    try {
      room.setPlayerTeam(player.id, 0);
    } catch (err) {
      // Ignorar erro ao mover
    }
    room.sendAnnouncement(
      `${player.name} entrou em AFK. Sera kickado se ficar inativo por 10 minutos!`,
      null,
      0xffaa00,
      'bold',
      1
    );
  }
}

function handleGoSpectator(room, player) {
  // Kick do jogador da sala
  room.sendAnnouncement(`${player.name} saiu da sala`, null, 0xaaaaaa, 'normal', 1);
  room.kickPlayer(player.id, 'Saiu da sala usando !bb', false);
}

// ========== EXPORTACAO ==========

module.exports = {
  processCommand,
  processAuthCommand,
  processGeneralCommand,
  authHandler, // Exporta authHandler para uso em lembretes de registro
};

//   __  ____ ____ _  _
// / _\/ ___) ___) )( \
//    \___ \___ ) \/ (
// \_/\_(____(____|____/
