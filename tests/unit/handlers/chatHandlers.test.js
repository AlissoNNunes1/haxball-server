// Testes unitarios para chatHandlers.cjs

const {
  handleTeamChat,
  handlePrivateMessage,
} = require('../../../shared/handlers/chatHandlers.cjs');

const { setPlayerTag } = require('../../../shared/config/utils.cjs');

describe('chatHandlers', () => {
  let mockRoom;
  let mockPlayer;
  let announceMessages;
  let whisperMessages;

  beforeEach(() => {
    announceMessages = [];
    whisperMessages = [];

    mockRoom = {
      name: 'Test Room',
      getPlayerList: jest.fn(() => [
        { id: 1, name: 'Lukra', team: 1 },
        { id: 2, name: 'Bagre', team: 1 },
        { id: 3, name: 'Player 3', team: 2 },
        { id: 4, name: 'Spec 1', team: 0 },
      ]),
      sendAnnouncement: jest.fn((msg, targetId, color, style, sound) => {
        if (targetId === null || targetId === undefined) {
          announceMessages.push({ msg, targetId: 'all', color, style, sound });
        } else {
          announceMessages.push({ msg, targetId, color, style, sound });
        }
      }),
      getPlayer: jest.fn((id) => {
        const players = [
          { id: 1, name: 'Lukra', team: 1 },
          { id: 2, name: 'Bagre', team: 1 },
          { id: 3, name: 'Player 3', team: 2 },
          { id: 4, name: 'Spec 1', team: 0 },
        ];
        return players.find((p) => p.id === id) || null;
      }),
    };

    mockPlayer = { id: 1, name: 'Lukra', team: 1 };
  });

  describe('handleTeamChat', () => {
    it('deve processar team chat valido', () => {
      const result = handleTeamChat(mockRoom, mockPlayer, 't vamos atacar');

      expect(result).toBe(true);
      expect(announceMessages.length).toBeGreaterThan(0);
      expect(announceMessages[0].msg).toContain('[Team]');
      expect(announceMessages[0].msg).toContain('Lukra');
      expect(announceMessages[0].msg).toContain('vamos atacar');
    });

    it('deve enviar apenas para jogadores do mesmo time', () => {
      handleTeamChat(mockRoom, mockPlayer, 't teste');

      const redTeamMessages = announceMessages.filter((m) => m.targetId === 1 || m.targetId === 2);
      const blueTeamMessages = announceMessages.filter((m) => m.targetId === 3);

      expect(redTeamMessages.length).toBeGreaterThan(0);
      expect(blueTeamMessages.length).toBe(0);
    });

    it('deve usar cor correta para time vermelho', () => {
      handleTeamChat(mockRoom, mockPlayer, 't teste');

      const firstMessage = announceMessages[0];
      expect(firstMessage.color).toBe(0xe56e56);
    });

    it('deve processar team chat de espectador', () => {
      const specPlayer = { id: 4, name: 'Spec 1', team: 0 };
      const result = handleTeamChat(mockRoom, specPlayer, 't teste spec');

      expect(result).toBe(true);
      expect(announceMessages[0].msg).toContain('[Spec]');
    });

    it('deve ignorar mensagem vazia', () => {
      handleTeamChat(mockRoom, mockPlayer, 't ');

      const errorMessage = announceMessages.find((m) => m.msg.includes('Uso:'));
      expect(errorMessage).toBeTruthy();
    });

    it('nao deve processar mensagem sem prefixo t', () => {
      const result = handleTeamChat(mockRoom, mockPlayer, 'mensagem normal');
      expect(result).toBe(false);
    });

    it('deve incluir tag visual no nome', () => {
      setPlayerTag(mockRoom, mockPlayer.id, 'VIP');
      handleTeamChat(mockRoom, mockPlayer, 't teste com tag');

      expect(announceMessages[0].msg).toContain('[VIP]');
      expect(announceMessages[0].msg).toContain('Lukra');
    });
  });

  describe('handlePrivateMessage', () => {
    it('deve processar PM valido', () => {
      const result = handlePrivateMessage(mockRoom, mockPlayer, '@@Bagre oi mano');

      expect(result).toBe(true);
      expect(announceMessages.length).toBe(2); // Confirmacao + PM
    });

    it('deve encontrar jogador com underscore no nome', () => {
      mockRoom.getPlayerList = jest.fn(() => [
        { id: 1, name: 'Lukra', team: 1 },
        { id: 2, name: 'Lukra Fifa', team: 2 },
      ]);

      const result = handlePrivateMessage(mockRoom, mockPlayer, '@@Lukra_Fifa teste');

      expect(result).toBe(true);
      expect(announceMessages.length).toBe(2);
    });

    it('deve retornar erro para jogador nao encontrado', () => {
      handlePrivateMessage(mockRoom, mockPlayer, '@@Inexistente teste');

      const errorMsg = announceMessages.find((m) => m.msg.includes('Impossivel encontrar'));
      expect(errorMsg).toBeTruthy();
    });

    it('deve retornar erro para PM vazio', () => {
      handlePrivateMessage(mockRoom, mockPlayer, '@@Bagre');

      const errorMsg = announceMessages.find((m) => m.msg.includes('Uso:'));
      expect(errorMsg).toBeTruthy();
    });

    it('deve impedir PM para si mesmo', () => {
      handlePrivateMessage(mockRoom, mockPlayer, '@@Lukra teste');

      const errorMsg = announceMessages.find((m) => m.msg.includes('si mesmo'));
      expect(errorMsg).toBeTruthy();
    });

    it('nao deve processar mensagem sem prefixo @@', () => {
      const result = handlePrivateMessage(mockRoom, mockPlayer, 'mensagem normal');
      expect(result).toBe(false);
    });

    it('deve incluir tags visuais em PMs', () => {
      setPlayerTag(mockRoom, mockPlayer.id, 'VIP');
      setPlayerTag(mockRoom, 2, 'PRO');

      handlePrivateMessage(mockRoom, mockPlayer, '@@Bagre teste');

      const senderMsg = announceMessages.find((m) => m.msg.includes('[VIP]'));
      expect(senderMsg).toBeTruthy();
    });
  });
});

//   __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
