// Mensagens e utilitarios padrao para salas Haxball

function announce(room, msg, targetId = null, color = 0xfffd82, style = 'bold', sound = 0) {
  if (!room) return;
  room.sendAnnouncement(msg, targetId, color, style, sound);
  try {
    console.log('Announce: ' + msg);
  } catch (e) {}
}

function whisper(room, msg, targetId, color = 0x66c7ff, style = 'normal', sound = 0) {
  if (!room) return;
  room.sendAnnouncement(msg, targetId, color, style, sound);
  try {
    if (room.getPlayer && room.getPlayer(targetId) != null) {
      console.log('Whisper -> ' + room.getPlayer(targetId).name + ': ' + msg);
    }
  } catch (e) {}
}

function welcomeWhispers(room, player) {
  whisper(room, '', player.id, null, null, 0);
  whisper(room, '═══════════════════════════', player.id, 0x55aaff, 'bold', 1);
  whisper(room, '🎮 BEM-VINDO!', player.id, 0x00ff00, 'bold', 2);
  whisper(room, '═══════════════════════════', player.id, 0x55aaff, 'bold', 1);
  whisper(room, '', player.id, null, null, 0);
  whisper(room, '✓ Aqui voce pode jogar e se divertir!', player.id, 0xaaaaaa, 'normal', 1);
  whisper(room, '✓ Use !help para ver os comandos', player.id, 0xffaa00, 'bold', 1);
}

const {
  createInterval,
  createNamedInterval,
  createTimeout,
  clearRoomTimers,
  clearAllRoomTimers,
  hasRoomTimers,
  hasNamedTimer,
  clearNamedTimer,
} = require('./roomTimers.cjs');

// Backwards-compat map used by tests and older code.
const COMMUNITY_KEY = '__CHA_COMMUNITY_ANNOUNCEMENT_TIMERS__';
if (!globalThis[COMMUNITY_KEY]) globalThis[COMMUNITY_KEY] = new Map();

function startCommunityAnnouncements(room, intervalMs = 5 * 60 * 1000) {
  if (!room) return;
  if (hasNamedTimer(room, 'community_announcements')) return; // already running for this room
  const intervalId = createNamedInterval(
    room,
    'community_announcements',
    () => {
      announce(room, '', null, null, 0);
      announce(room, '═══════════════════════════════════', null, 0x55aaff, 'bold', 1);
      announce(room, '🏆 COMUNIDADE CHA - REAL SOCCER', null, 0x00ff00, 'bold', 2);
      announce(room, '═══════════════════════════════════', null, 0x55aaff, 'bold', 1);
      announce(
        room,
        'Entre no nosso Discord: https://discord.gg/b2km7nvHP7',
        null,
        0xffaa00,
        'bold',
        1
      );
      announce(room, 'Participe de campeonatos, ligas e eventos!', null, 0xaaaaaa, 'normal', 1);
      announce(room, '═══════════════════════════════════', null, 0x55aaff, 'bold', 1);
      announce(room, '', null, null, 0);
    },
    intervalMs
  );
  // timers are registered in the registry via createNamedInterval
  try {
    // Keep old compatibility map
    globalThis[COMMUNITY_KEY].set(room, intervalId);
  } catch (e) {}
}

function stopCommunityAnnouncements(room) {
  if (!room) return;
  clearNamedTimer(room, 'community_announcements');
  try {
    globalThis[COMMUNITY_KEY].delete(room);
  } catch (e) {}
}

function stopAllCommunityAnnouncements() {
  // Clear community announced named timers (and registry entries)
  try {
    for (const [rm] of Array.from(globalThis[COMMUNITY_KEY].entries())) {
      clearNamedTimer(rm, 'community_announcements');
    }
    globalThis[COMMUNITY_KEY].clear();
  } catch (e) {
    // fallback to full registry clear
    clearAllRoomTimers();
  }
}

function startRegistrationReminders(room, authHandler, intervalMs = 5 * 60 * 1000, getAuthDb) {
  if (!room || !authHandler) return;
  // avoid registering duplicate reminders
  if (hasNamedTimer(room, 'registration_reminders')) return; // already running
  const intervalId = createNamedInterval(
    room,
    'registration_reminders',
    () => {
      try {
        const players = room.getPlayerList();
        players.forEach((player) => {
          if (player.id === 0) return; // Ignora host

          // Verifica se jogador esta autenticado
          const isAuth = authHandler.isAuthenticated(player.id);

          if (!isAuth) {
            // Verifica se jogador tem conta cadastrada
            let hasAccount = false;
            try {
              if (getAuthDb && typeof getAuthDb === 'function') {
                const db = getAuthDb();
                const account = db.getAccountByNick(player.name);
                hasAccount = !!account;
              }
            } catch (err) {
              console.error('[MESSAGES] Erro ao verificar conta:', err.message);
            }

            if (hasAccount) {
              // Tem conta mas nao esta logado - pedir login
              whisper(room, '', player.id, null, null, 0);
              whisper(room, '═══════════════════════════════════', player.id, 0x55aaff, 'bold', 1);
              whisper(room, '🔑 FACA LOGIN NA SUA CONTA!', player.id, 0xffaa00, 'bold', 2);
              whisper(room, '═══════════════════════════════════', player.id, 0x55aaff, 'bold', 1);
              whisper(room, 'Sua conta foi encontrada!', player.id, 0x00ff00, 'normal', 1);
              whisper(room, 'Use: !login <senha>', player.id, 0xffff00, 'bold', 1);
              whisper(room, '', player.id, null, null, 0);
              whisper(
                room,
                '✓ Acesse suas estatisticas e ranking',
                player.id,
                0xaaaaaa,
                'small',
                1
              );
              whisper(room, '✓ Participe de campeonatos oficiais', player.id, 0xaaaaaa, 'small', 1);
              whisper(room, '✓ Ganhe moedas e recompensas', player.id, 0xaaaaaa, 'small', 1);
              whisper(room, '', player.id, null, null, 0);
              whisper(
                room,
                'Esqueceu a senha? Contate admin no Discord',
                player.id,
                0xff9900,
                'small',
                1
              );
              whisper(room, '═══════════════════════════════════', player.id, 0x55aaff, 'bold', 1);
            } else {
              // Nao tem conta - pedir registro
              whisper(room, '', player.id, null, null, 0);
              whisper(room, '═══════════════════════════════════', player.id, 0x55aaff, 'bold', 1);
              whisper(room, '📋 REGISTRE-SE NA COMUNIDADE CHA!', player.id, 0xffaa00, 'bold', 2);
              whisper(room, '═══════════════════════════════════', player.id, 0x55aaff, 'bold', 1);
              whisper(room, 'Entre no Discord e crie sua conta:', player.id, 0xaaaaaa, 'normal', 1);
              whisper(room, '🔗 https://discord.gg/b2km7nvHP7', player.id, 0x00ff00, 'bold', 1);
              whisper(room, '', player.id, null, null, 0);
              whisper(
                room,
                '✓ Acompanhe seu ranking e estatisticas',
                player.id,
                0xaaaaaa,
                'small',
                1
              );
              whisper(
                room,
                '✓ Participe de campeonatos e eventos',
                player.id,
                0xaaaaaa,
                'small',
                1
              );
              whisper(room, '✓ Ganhe moedas e premios exclusivos', player.id, 0xaaaaaa, 'small', 1);
              whisper(room, '', player.id, null, null, 0);
              whisper(
                room,
                'Use !discord para ver o link novamente',
                player.id,
                0xff9900,
                'small',
                1
              );
              whisper(room, '═══════════════════════════════════', player.id, 0x55aaff, 'bold', 1);
            }
          }
        });
      } catch (error) {
        console.error('[MESSAGES] Erro ao enviar lembretes de registro:', error);
      }
    },
    intervalMs
  );

  // created via createInterval, registry does the storing
}

function stopRegistrationReminders(room) {
  if (!room) return;
  clearNamedTimer(room, 'registration_reminders');
}

function stopAllRegistrationReminders() {
  clearAllRoomTimers();
}

function matchStartAnnouncement(room) {
  announce(room, '', null, null, 0);
  announce(room, '═══════════════════════════════════', null, 0x00ff00);
  announce(room, '🎮 PARTIDA INICIADA!', null, 0x00ff00);
  announce(room, 'Jogo limpo e respeito sempre!', null, 0xffaa00);
  announce(room, '═══════════════════════════════════', null, 0x00ff00);
  announce(room, '', null, null, 0);
}

function matchGoalAnnouncement(room, teamName, scorer) {
  const color = teamName === 'VERMELHO' ? 0xff0000 : 0x0000ff;
  announce(room, '', null, null, 0);
  announce(room, '═══════════════════════════', null, color);
  announce(room, `⚽ GOOOOL DO TIME ${teamName}!`, null, color);
  if (scorer) announce(room, `Gol de ${scorer}!`, null, 0xffff00);
  announce(room, '═══════════════════════════', null, color);
  announce(room, '', null, null, 0);
}

function matchVictoryAnnouncement(room, winnerName, score) {
  const color = winnerName === 'VERMELHO' ? 0xff0000 : 0x0000ff;
  announce(room, '', null, null, 0);
  announce(room, '=================================', null, 0xffaa00);
  announce(room, `🏆 TIME ${winnerName} VENCEU!`, null, color);
  announce(room, `Placar final: ${score}`, null, 0xffffff);
  announce(room, '=================================', null, 0xffaa00);
}

module.exports = {
  announce,
  whisper,
  welcomeWhispers,
  startCommunityAnnouncements,
  stopCommunityAnnouncements,
  stopAllCommunityAnnouncements,
  startRegistrationReminders,
  stopRegistrationReminders,
  stopAllRegistrationReminders,
  matchStartAnnouncement,
  matchGoalAnnouncement,
  matchVictoryAnnouncement,
};
