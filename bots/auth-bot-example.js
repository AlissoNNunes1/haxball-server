/**
 * Exemplo de Bot Haxball com Sistema de Autenticacao CIRS
 * 
 * Funcionalidades:
 * - Login com /login <senha>
 * - Auto-login via Discord vinculado
 * - Comandos restritos a usuarios autenticados
 * - Balanceamento baseado em ranking
 * - Sistema de recompensas (pontos por vitoria)
 */

// Importacoes (quando integrado ao sistema)
// const { RoomAuthHandler } = require('../src/auth/RoomAuthHandler');
// const { getAuthDb } = require('../src/database/auth-client');

module.exports = {
  init: function (HBInit, customSettings) {
    console.log('[AUTH-BOT] Inicializando sala com autenticacao...');

    // Configuracao da sala
    const config = {
      roomName: customSettings.roomName || '[CIRS] Sala com Auth',
      playerName: customSettings.playerName || 'Host',
      maxPlayers: customSettings.reserved?.haxball?.maxPlayers || 12,
      public: customSettings.reserved?.haxball?.public !== false,
      token: customSettings.token,
      geo: customSettings.reserved?.haxball?.geo,
    };

    const room = HBInit(config);

    // Inicializa handler de autenticacao
    // DESCOMENTE quando integrado:
    // const authHandler = new RoomAuthHandler();
    // authHandler.registerHandlers(room);
    // const db = getAuthDb();

    // Variaveis de controle
    let gameInProgress = false;
    let scores = { red: 0, blue: 0 };

    // =================================================================
    // EVENTOS DE JOGADOR
    // =================================================================

    room.onPlayerJoin = (player) => {
      console.log(`[AUTH-BOT] Jogador entrou: ${player.name} (ID: ${player.id})`);

      room.sendAnnouncement(
        `Bem-vindo, ${player.name}!`,
        player.id,
        0x00ff00,
        'bold',
        2
      );

      room.sendAnnouncement(
        'Use /login <senha> para autenticar e ter acesso a recursos exclusivos.',
        player.id,
        0xffaa00,
        'normal',
        1
      );

      // Auto-login via Discord (se vinculado)
      // DESCOMENTE quando integrado:
      /*
      const account = db.getAccountByNick(player.name);
      if (account && account.discordId) {
        authHandler.authenticatePlayer(player.id, account.id);
        room.sendAnnouncement(
          `Auto-login realizado! Pontos: ${account.points} | Ranking: ${account.ranking}`,
          player.id,
          0x00ff00,
          'normal',
          1
        );
      }
      */
    };

    room.onPlayerLeave = (player) => {
      console.log(`[AUTH-BOT] Jogador saiu: ${player.name}`);
      // authHandler ja remove autenticacao automaticamente
    };

    // =================================================================
    // COMANDOS PERSONALIZADOS
    // =================================================================

    room.onPlayerChat = (player, message) => {
      // Comandos para usuarios autenticados
      if (message === '!myrank') {
        // DESCOMENTE quando integrado:
        /*
        if (!authHandler.isAuthenticated(player.id)) {
          room.sendAnnouncement(
            'Voce precisa fazer login primeiro. Use: /login <senha>',
            player.id,
            0xff0000
          );
          return false;
        }

        const account = authHandler.getAccount(player.id);
        room.sendAnnouncement(
          `[RANKING] ${account.haxballNick}`,
          player.id,
          0x00aaff,
          'bold'
        );
        room.sendAnnouncement(
          `Ranking: ${account.ranking} | Pontos: ${account.points} | Moedas: ${account.coins}`,
          player.id,
          0x00aaff
        );
        */
        room.sendAnnouncement(
          '[DEMO] Sistema de ranking sera ativado apos integracao.',
          player.id,
          0xff9900
        );
        return false;
      }

      if (message === '!balance') {
        // Comando admin: balancear times por ranking
        const players = room.getPlayerList().filter((p) => p.team !== 0);

        if (players.length < 2) {
          room.sendAnnouncement('Precisa de pelo menos 2 jogadores.', null, 0xff0000);
          return false;
        }

        // DESCOMENTE quando integrado:
        /*
        // Ordena por ranking
        players.sort((a, b) => {
          const accountA = authHandler.getAccount(a.id);
          const accountB = authHandler.getAccount(b.id);
          const rankA = accountA ? accountA.ranking : 1000;
          const rankB = accountB ? accountB.ranking : 1000;
          return rankB - rankA; // Decrescente
        });

        // Distribui alternadamente
        players.forEach((p, index) => {
          const team = index % 2 === 0 ? 1 : 2; // Red ou Blue
          room.setPlayerTeam(p.id, team);
        });
        */

        room.sendAnnouncement(
          '[DEMO] Balanceamento por ranking sera ativado apos integracao.',
          null,
          0xff9900
        );
        return false;
      }

      if (message === '!help') {
        room.sendAnnouncement('=== COMANDOS DISPONIVEIS ===', player.id, 0x00aaff, 'bold');
        room.sendAnnouncement('/login <senha> - Autenticar', player.id, 0x00aaff);
        room.sendAnnouncement('/profile [nick] - Ver perfil', player.id, 0x00aaff);
        room.sendAnnouncement('/stats - Ver suas estatisticas', player.id, 0x00aaff);
        room.sendAnnouncement('!myrank - Ver seu ranking', player.id, 0x00aaff);
        room.sendAnnouncement('!balance - Balancear times (admin)', player.id, 0x00aaff);
        return false;
      }

      return true; // Permite que authHandler processe outros comandos
    };

    // =================================================================
    // EVENTOS DE JOGO
    // =================================================================

    room.onGameStart = () => {
      gameInProgress = true;
      scores = { red: 0, blue: 0 };
      console.log('[AUTH-BOT] Jogo iniciado');
      room.sendAnnouncement('Jogo iniciado! Boa sorte!', null, 0x00ff00, 'bold', 2);
    };

    room.onGameStop = () => {
      gameInProgress = false;
      console.log('[AUTH-BOT] Jogo encerrado');
    };

    room.onTeamGoal = (team) => {
      if (team === 1) {
        scores.red++;
      } else if (team === 2) {
        scores.blue++;
      }

      const teamName = team === 1 ? 'Red' : 'Blue';
      const score = `${scores.red} - ${scores.blue}`;

      room.sendAnnouncement(
        `GOL! Time ${teamName}! Placar: ${score}`,
        null,
        0xffff00,
        'bold',
        2
      );

      // Recompensa jogadores do time que fez gol
      // DESCOMENTE quando integrado:
      /*
      const players = room.getPlayerList().filter((p) => p.team === team);
      players.forEach((player) => {
        if (authHandler.isAuthenticated(player.id)) {
          const accountId = authHandler.getAccountId(player.id);
          const account = db.getAccountById(accountId);
          db.updatePoints(accountId, account.points + 5, 'Gol do time');
        }
      });
      */
    };

    room.onTeamVictory = (scores) => {
      const winner = scores.red > scores.blue ? 'Red' : 'Blue';
      const winnerTeam = scores.red > scores.blue ? 1 : 2;

      room.sendAnnouncement(
        `Fim de jogo! Time ${winner} venceu!`,
        null,
        0x00ff00,
        'bold',
        2
      );

      // Recompensa time vencedor
      // DESCOMENTE quando integrado:
      /*
      const winners = room.getPlayerList().filter((p) => p.team === winnerTeam);
      winners.forEach((player) => {
        if (authHandler.isAuthenticated(player.id)) {
          const accountId = authHandler.getAccountId(player.id);
          const account = db.getAccountById(accountId);
          db.updatePoints(accountId, account.points + 50, 'Vitoria');
          room.sendAnnouncement(
            `+50 pontos por vitoria! Total: ${account.points + 50}`,
            player.id,
            0xffff00
          );
        }
      });
      */

      console.log(`[AUTH-BOT] Time ${winner} venceu!`);
    };

    // =================================================================
    // INICIALIZACAO
    // =================================================================

    console.log('[AUTH-BOT] Sala criada com sucesso!');
    console.log(`[AUTH-BOT] Nome: ${config.roomName}`);
    console.log(`[AUTH-BOT] Link: https://www.haxball.com/play?c=${room.roomLink || 'N/A'}`);

    return room;
  },
};

//   __  ____ ____ _  _
// / _\/ ___) ___) )( \
//    \___ \___ ) \/ (
// \_/\_(____(____|____/
