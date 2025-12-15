// Testes unitarios para playerHandlers.cjs

const {
  normalizePlayerName,
  findPlayerByName,
  formatPlayerName,
} = require('../../../shared/handlers/playerHandlers.cjs');

const { setPlayerTag, clearPlayerTag } = require('../../../shared/config/utils.cjs');

describe('playerHandlers', () => {
  describe('normalizePlayerName', () => {
    it('deve converter underscores em espacos', () => {
      expect(normalizePlayerName('Lukra_Fifa')).toBe('Lukra Fifa');
    });

    it('deve manter nome sem underscores inalterado', () => {
      expect(normalizePlayerName('Lukra')).toBe('Lukra');
    });

    it('deve converter multiplos underscores', () => {
      expect(normalizePlayerName('Lukra_Fifa_Pro')).toBe('Lukra Fifa Pro');
    });

    it('deve retornar string vazia para entrada invalida', () => {
      expect(normalizePlayerName(null)).toBe('');
      expect(normalizePlayerName(undefined)).toBe('');
    });
  });

  describe('findPlayerByName', () => {
    let mockRoom;

    beforeEach(() => {
      mockRoom = {
        getPlayerList: jest.fn(() => [
          { id: 1, name: 'Lukra', team: 1 },
          { id: 2, name: 'Lukra Fifa', team: 2 },
          { id: 3, name: 'Bagre 123', team: 1 },
        ]),
      };
    });

    it('deve encontrar jogador por nome exato', () => {
      const player = findPlayerByName(mockRoom, 'Lukra');
      expect(player).toBeTruthy();
      expect(player.name).toBe('Lukra');
    });

    it('deve encontrar jogador com espacos usando underscores', () => {
      const player = findPlayerByName(mockRoom, 'Lukra_Fifa');
      expect(player).toBeTruthy();
      expect(player.name).toBe('Lukra Fifa');
    });

    it('deve encontrar jogador com espacos e numeros', () => {
      const player = findPlayerByName(mockRoom, 'Bagre_123');
      expect(player).toBeTruthy();
      expect(player.name).toBe('Bagre 123');
    });

    it('deve retornar null para jogador nao encontrado', () => {
      const player = findPlayerByName(mockRoom, 'Inexistente');
      expect(player).toBeNull();
    });

    it('deve retornar null para entrada invalida', () => {
      expect(findPlayerByName(null, 'Lukra')).toBeNull();
      expect(findPlayerByName(mockRoom, null)).toBeNull();
    });
  });

  describe('formatPlayerName', () => {
    let mockRoom;
    let mockPlayer;

    beforeEach(() => {
      mockRoom = { name: 'Test Room' };
      mockPlayer = { id: 1, name: 'Lukra' };
    });

    afterEach(() => {
      // Limpa tags apos cada teste
      clearPlayerTag(mockRoom, mockPlayer.id);
    });

    it('deve retornar nome simples sem tag', () => {
      const formatted = formatPlayerName(mockRoom, mockPlayer);
      expect(formatted).toBe('Lukra');
    });

    it('deve retornar nome com tag visual', () => {
      setPlayerTag(mockRoom, mockPlayer.id, 'VIP');
      const formatted = formatPlayerName(mockRoom, mockPlayer);
      expect(formatted).toBe('[VIP] Lukra');
    });

    it('deve remover espacos da tag', () => {
      setPlayerTag(mockRoom, mockPlayer.id, ' S1 ');
      const formatted = formatPlayerName(mockRoom, mockPlayer);
      expect(formatted).toBe('[S1] Lukra');
    });

    it('deve retornar string vazia para entrada invalida', () => {
      expect(formatPlayerName(null, mockPlayer)).toBe('');
      expect(formatPlayerName(mockRoom, null)).toBe('');
    });
  });
});

//   __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
