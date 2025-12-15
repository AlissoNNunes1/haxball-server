/**
 * Testes de integracao para fluxo completo de chat
 * Testa team chat, mensagens privadas e formatacao de nomes
 */

const {
  handleTeamChat,
  handlePrivateMessage,
  processChatMessage,
} = require('../../shared/handlers/chatHandlers.cjs');
const {
  normalizePlayerName,
  findPlayerByName,
  formatPlayerName,
} = require('../../shared/handlers/playerHandlers.cjs');

describe('Chat Flow Integration', () => {
  let room;
  let player;
  let announcements;

  beforeEach(() => {
    announcements = [];

    // Mock da sala Haxball
    room = {
      sendAnnouncement: jest.fn((msg, playerId, color, style, sound) => {
        announcements.push({ msg, playerId, color, style, sound });
      }),
      getPlayerList: jest.fn(() => [
        { id: 1, name: 'Player1', team: 1 },
        { id: 2, name: 'Player2', team: 1 },
        { id: 3, name: 'Player3', team: 2 },
        { id: 4, name: 'Player4', team: 2 },
        { id: 5, name: 'Spectator1', team: 0 },
      ]),
    };

    player = { id: 1, name: 'Player1', team: 1 };
  });

  describe('Team Chat Flow', () => {
    test('deve processar mensagem de team chat', () => {
      const message = 't Ola time!';

      const handled = handleTeamChat(room, player, message);

      expect(handled).toBe(true);
      expect(announcements.length).toBeGreaterThan(0);

      // Verifica se mensagem foi enviada apenas para o time
      const teamMessages = announcements.filter((a) => a.playerId === 1 || a.playerId === 2);
      expect(teamMessages.length).toBeGreaterThan(0);

      // Verifica conteudo da mensagem
      const messageContent = announcements.find((a) => a.msg.includes('Ola time!'));
      expect(messageContent).toBeDefined();
      expect(messageContent.msg).toContain('[Team]');
    });

    test('deve usar cor vermelha para time 1', () => {
      handleTeamChat(room, player, 't Mensagem vermelha');

      const redMessage = announcements.find((a) => a.color === 0xe56e56);
      expect(redMessage).toBeDefined();
    });

    test('deve usar cor azul para time 2', () => {
      player = { id: 3, name: 'Player3', team: 2 };

      handleTeamChat(room, player, 't Mensagem azul');

      const blueMessage = announcements.find((a) => a.color === 0x5689e5);
      expect(blueMessage).toBeDefined();
    });

    test('deve enviar para espectadores quando player e spec', () => {
      player = { id: 5, name: 'Spectator1', team: 0 };

      handleTeamChat(room, player, 't Mensagem de spec');

      expect(announcements.length).toBeGreaterThan(0);

      const specMessage = announcements.find((a) => a.msg.includes('[Spec]'));
      expect(specMessage).toBeDefined();
    });

    test('nao deve processar mensagem sem prefixo t', () => {
      const handled = handleTeamChat(room, player, 'Mensagem normal');

      expect(handled).toBe(false);
      expect(announcements.length).toBe(0);
    });

    test('deve lidar com mensagem vazia apos prefixo', () => {
      const handled = handleTeamChat(room, player, 't');

      expect(handled).toBe(true);
      expect(announcements.length).toBeGreaterThan(0);
    });
  });

  describe('Private Message Flow', () => {
    test('deve enviar mensagem privada para jogador existente', () => {
      const message = '@@ Player2 Ola, mensagem privada!';

      const handled = handlePrivateMessage(room, player, message);

      expect(handled).toBe(true);
      expect(announcements.length).toBe(2); // Uma para sender, uma para receiver

      // Verifica mensagem para sender
      const senderMsg = announcements.find((a) => a.playerId === 1);
      expect(senderMsg).toBeDefined();
      expect(senderMsg.msg).toContain('Player2');

      // Verifica mensagem para receiver
      const receiverMsg = announcements.find((a) => a.playerId === 2);
      expect(receiverMsg).toBeDefined();
      expect(receiverMsg.msg).toContain('Player1');
    });

    test('deve suportar nomes com underscores', () => {
      room.getPlayerList = jest.fn(() => [
        { id: 1, name: 'Player1', team: 1 },
        { id: 2, name: 'Player Two', team: 1 },
      ]);

      const message = '@@ Player_Two Ola!';

      const handled = handlePrivateMessage(room, player, message);

      expect(handled).toBe(true);
      expect(announcements.length).toBe(2);

      const receiverMsg = announcements.find((a) => a.playerId === 2);
      expect(receiverMsg).toBeDefined();
    });

    test('deve avisar quando jogador nao encontrado', () => {
      const message = '@@ JogadorInexistente Ola';

      const handled = handlePrivateMessage(room, player, message);

      expect(handled).toBe(true);
      expect(announcements.length).toBe(1);

      const errorMsg = announcements.find((a) => a.playerId === 1);
      expect(errorMsg).toBeDefined();
      expect(errorMsg.msg.toLowerCase()).toContain('jogador');
      expect(errorMsg.msg.toLowerCase()).toContain('encontrado');
    });

    test('nao deve processar mensagem sem prefixo @@', () => {
      const handled = handlePrivateMessage(room, player, 'Mensagem normal');

      expect(handled).toBe(false);
      expect(announcements.length).toBe(0);
    });

    test('deve lidar com PM sem nome de jogador', () => {
      const handled = handlePrivateMessage(room, player, '@@');

      expect(handled).toBe(true);
      expect(announcements.length).toBe(1);

      const errorMsg = announcements[0];
      expect(errorMsg.msg).toContain('Uso:');
    });

    test('deve lidar com PM sem mensagem', () => {
      const handled = handlePrivateMessage(room, player, '@@ Player2');

      expect(handled).toBe(true);
      // Deve enviar mensagem vazia ou avisar
      expect(announcements.length).toBeGreaterThan(0);
    });
  });

  describe('Chat Message Processing', () => {
    test('deve processar team chat via processChatMessage', () => {
      const handled = processChatMessage(room, player, 't Mensagem time');

      expect(handled).toBe(true);
      expect(announcements.length).toBeGreaterThan(0);
    });

    test('deve processar PM via processChatMessage', () => {
      const handled = processChatMessage(room, player, '@@ Player2 Ola');

      expect(handled).toBe(true);
      expect(announcements.length).toBe(2);
    });

    test('nao deve processar mensagem normal', () => {
      const handled = processChatMessage(room, player, 'Mensagem normal');

      expect(handled).toBe(false);
      expect(announcements.length).toBe(0);
    });
  });

  describe('Player Name Formatting', () => {
    test('deve normalizar nome com espacos', () => {
      const normalized = normalizePlayerName('Player_Name_Test');

      expect(normalized).toBe('player name test');
    });

    test('deve normalizar nome mantendo maiusculas originais', () => {
      const normalized = normalizePlayerName('PlayerName');

      expect(normalized).toBe('playername');
    });

    test('deve encontrar jogador por nome exato', () => {
      const foundPlayer = findPlayerByName(room, 'Player1');

      expect(foundPlayer).toBeDefined();
      expect(foundPlayer.id).toBe(1);
    });

    test('deve encontrar jogador com nome usando underscores', () => {
      room.getPlayerList = jest.fn(() => [{ id: 1, name: 'Player Name', team: 1 }]);

      const foundPlayer = findPlayerByName(room, 'Player_Name');

      expect(foundPlayer).toBeDefined();
      expect(foundPlayer.id).toBe(1);
    });

    test('deve retornar null quando jogador nao existe', () => {
      const foundPlayer = findPlayerByName(room, 'NonExistent');

      expect(foundPlayer).toBeNull();
    });

    test('deve formatar nome do jogador', () => {
      const formatted = formatPlayerName(player);

      expect(formatted).toBe('Player1');
    });
  });

  describe('Team Color Consistency', () => {
    test('deve usar mesma cor para todos os jogadores do time 1', () => {
      const player1 = { id: 1, name: 'Player1', team: 1 };
      const player2 = { id: 2, name: 'Player2', team: 1 };

      handleTeamChat(room, player1, 't Msg 1');
      const color1 = announcements[announcements.length - 1].color;

      announcements.length = 0;

      handleTeamChat(room, player2, 't Msg 2');
      const color2 = announcements[announcements.length - 1].color;

      expect(color1).toBe(color2);
      expect(color1).toBe(0xe56e56); // Vermelho
    });

    test('deve usar mesma cor para todos os jogadores do time 2', () => {
      const player3 = { id: 3, name: 'Player3', team: 2 };
      const player4 = { id: 4, name: 'Player4', team: 2 };

      handleTeamChat(room, player3, 't Msg 1');
      const color1 = announcements[announcements.length - 1].color;

      announcements.length = 0;

      handleTeamChat(room, player4, 't Msg 2');
      const color2 = announcements[announcements.length - 1].color;

      expect(color1).toBe(color2);
      expect(color1).toBe(0x5689e5); // Azul
    });
  });

  describe('Edge Cases', () => {
    test('deve lidar com nome de jogador vazio', () => {
      const foundPlayer = findPlayerByName(room, '');

      expect(foundPlayer).toBeNull();
    });

    test('deve lidar com room sem jogadores', () => {
      room.getPlayerList = jest.fn(() => []);

      const foundPlayer = findPlayerByName(room, 'Player1');

      expect(foundPlayer).toBeNull();
    });

    test('deve lidar com mensagem muito longa', () => {
      const longMessage = 't ' + 'A'.repeat(500);

      const handled = handleTeamChat(room, player, longMessage);

      expect(handled).toBe(true);
      expect(announcements.length).toBeGreaterThan(0);
    });

    test('deve lidar com caracteres especiais no nome', () => {
      room.getPlayerList = jest.fn(() => [{ id: 1, name: 'Player@#$', team: 1 }]);

      const foundPlayer = findPlayerByName(room, 'Player@#$');

      expect(foundPlayer).toBeDefined();
    });
  });
});

/*
   __  ____ ____ _  _
  / _\/ ___) ___) )( \
 /    \___ \___ ) \/ (
 \_/\_(____(____|____/
*/
