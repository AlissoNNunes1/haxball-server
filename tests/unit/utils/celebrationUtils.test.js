// Testes unitarios para celebrationUtils.cjs

const {
  sleep,
  avatarCelebration,
  ballWarning,
  goalCelebration,
  assistCelebration,
  offsideWarning,
  foulWarning,
} = require('../../../shared/utils/celebrationUtils.cjs');

describe('celebrationUtils', () => {
  let mockRoom;
  let mockGameState;

  beforeEach(() => {
    // Mock da sala Haxball
    mockRoom = {
      setPlayerAvatar: jest.fn(),
      setDiscProperties: jest.fn(),
    };

    // Mock do estado do jogo
    mockGameState = {
      warningCount: 0,
    };

    // Mock de timers
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('sleep', () => {
    it('deve retornar uma Promise que resolve apos o tempo especificado', async () => {
      const promise = sleep(1000);
      expect(promise).toBeInstanceOf(Promise);

      jest.advanceTimersByTime(1000);
      await promise;
    });

    it('deve resolver com tempo correto', async () => {
      const promise = sleep(500);
      jest.advanceTimersByTime(499);

      let resolved = false;
      promise.then(() => {
        resolved = true;
      });

      await Promise.resolve(); // Flush microtasks
      expect(resolved).toBe(false);

      jest.advanceTimersByTime(1);
      await promise;
      expect(resolved).toBe(true);
    });
  });

  describe('avatarCelebration', () => {
    it('deve piscar avatar do jogador com configuracao padrao', async () => {
      avatarCelebration(mockRoom, 1, '⚽');

      // Avanca tempo e verifica chamadas
      jest.advanceTimersByTime(3250);
      await Promise.resolve();

      // Verifica que setPlayerAvatar foi chamado multiplas vezes
      expect(mockRoom.setPlayerAvatar).toHaveBeenCalled();

      // Verifica padrao de piscada (avatar, null, avatar, null...)
      const calls = mockRoom.setPlayerAvatar.mock.calls;
      expect(calls.length).toBeGreaterThan(10);

      // Primeira chamada deve mostrar avatar
      expect(calls[0]).toEqual([1, '⚽']);

      // Segunda chamada deve esconder avatar
      expect(calls[1]).toEqual([1, null]);

      // Terceira chamada deve mostrar avatar novamente
      expect(calls[2]).toEqual([1, '⚽']);
    });

    it('deve respeitar duracao customizada', async () => {
      avatarCelebration(mockRoom, 2, '🎉', { duration: 1000, interval: 100 });

      jest.advanceTimersByTime(1000);
      await Promise.resolve();

      const calls = mockRoom.setPlayerAvatar.mock.calls;
      expect(calls.length).toBeGreaterThan(5);
      expect(calls.length).toBeLessThan(15);
    });

    it('deve respeitar intervalo customizado', async () => {
      avatarCelebration(mockRoom, 3, '🔥', { interval: 500 });

      // A funcao inicia imediatamente com i=0 (delay=0), entao verifica chamadas
      await Promise.resolve();
      const initialCalls = mockRoom.setPlayerAvatar.mock.calls.length;

      // Avanca para proxima piscada
      jest.advanceTimersByTime(500);
      await Promise.resolve();

      // Deve ter mais chamadas apos o intervalo
      expect(mockRoom.setPlayerAvatar.mock.calls.length).toBeGreaterThan(initialCalls);
    });

    it('deve garantir que avatar final esta visivel', async () => {
      avatarCelebration(mockRoom, 4, '⚽', { duration: 1000 });

      jest.advanceTimersByTime(1000);
      await Promise.resolve();

      const lastCall =
        mockRoom.setPlayerAvatar.mock.calls[mockRoom.setPlayerAvatar.mock.calls.length - 1];
      expect(lastCall).toEqual([4, '⚽']);
    });
  });

  describe('ballWarning', () => {
    it('deve piscar a bola com configuracao padrao', async () => {
      ballWarning(mockRoom, mockGameState, '0xff0000', 0);

      jest.advanceTimersByTime(1400);
      await Promise.resolve();

      expect(mockRoom.setDiscProperties).toHaveBeenCalled();

      const calls = mockRoom.setDiscProperties.mock.calls;
      expect(calls.length).toBeGreaterThan(5);

      // Primeira chamada deve usar cor de aviso (branco)
      expect(calls[0]).toEqual([0, { color: '0xffffff' }]);

      // Segunda chamada deve usar cor original
      expect(calls[1]).toEqual([0, { color: '0xff0000' }]);
    });

    it('deve usar cor de aviso customizada', async () => {
      ballWarning(mockRoom, mockGameState, '0x0000ff', 0, { warningColor: '0xffff00' });

      jest.advanceTimersByTime(200);
      await Promise.resolve();

      expect(mockRoom.setDiscProperties).toHaveBeenCalledWith(0, { color: '0xffff00' });
    });

    it('deve respeitar duracao customizada', async () => {
      ballWarning(mockRoom, mockGameState, '0x00ff00', 0, { duration: 1000, interval: 100 });

      jest.advanceTimersByTime(1000);
      await Promise.resolve();

      const calls = mockRoom.setDiscProperties.mock.calls;
      expect(calls.length).toBeGreaterThan(8);
      expect(calls.length).toBeLessThan(15);
    });

    it('deve verificar warningCount para evitar conflitos', async () => {
      mockGameState.warningCount = 5;

      ballWarning(mockRoom, mockGameState, '0xff0000', 3); // warningCount diferente

      jest.advanceTimersByTime(200);
      await Promise.resolve();

      // Nao deve chamar setDiscProperties porque warningCount mudou
      expect(mockRoom.setDiscProperties).not.toHaveBeenCalled();
    });

    it('deve funcionar quando warningCount coincide', async () => {
      mockGameState.warningCount = 5;

      ballWarning(mockRoom, mockGameState, '0xff0000', 5); // warningCount igual

      jest.advanceTimersByTime(200);
      await Promise.resolve();

      expect(mockRoom.setDiscProperties).toHaveBeenCalled();
    });
  });

  describe('goalCelebration', () => {
    it('deve usar avatar padrao de gol', async () => {
      goalCelebration(mockRoom, 10);

      jest.advanceTimersByTime(3000);
      await Promise.resolve();

      const calls = mockRoom.setPlayerAvatar.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      expect(calls[0]).toEqual([10, '⚽']);
    });

    it('deve aceitar avatar customizado', async () => {
      goalCelebration(mockRoom, 11, '🔥');

      jest.advanceTimersByTime(3000);
      await Promise.resolve();

      const calls = mockRoom.setPlayerAvatar.mock.calls;
      expect(calls[0]).toEqual([11, '🔥']);
    });

    it('deve usar duracao de 3 segundos', async () => {
      goalCelebration(mockRoom, 12);

      jest.advanceTimersByTime(2999);
      await Promise.resolve();

      // Nao deve ter terminado ainda
      const callsBefore = mockRoom.setPlayerAvatar.mock.calls.length;

      jest.advanceTimersByTime(1);
      await Promise.resolve();

      // Deve ter chamada final
      const callsAfter = mockRoom.setPlayerAvatar.mock.calls.length;
      expect(callsAfter).toBeGreaterThan(callsBefore);
    });
  });

  describe('assistCelebration', () => {
    it('deve usar avatar padrao de assistencia', async () => {
      assistCelebration(mockRoom, 20);

      jest.advanceTimersByTime(2000);
      await Promise.resolve();

      const calls = mockRoom.setPlayerAvatar.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      expect(calls[0]).toEqual([20, '👟']);
    });

    it('deve aceitar avatar customizado', async () => {
      assistCelebration(mockRoom, 21, '🎯');

      jest.advanceTimersByTime(2000);
      await Promise.resolve();

      const calls = mockRoom.setPlayerAvatar.mock.calls;
      expect(calls[0]).toEqual([21, '🎯']);
    });

    it('deve usar duracao de 2 segundos', async () => {
      assistCelebration(mockRoom, 22);

      jest.advanceTimersByTime(1999);
      await Promise.resolve();

      const callsBefore = mockRoom.setPlayerAvatar.mock.calls.length;

      jest.advanceTimersByTime(1);
      await Promise.resolve();

      const callsAfter = mockRoom.setPlayerAvatar.mock.calls.length;
      expect(callsAfter).toBeGreaterThan(callsBefore);
    });
  });

  describe('offsideWarning', () => {
    it('deve incrementar warningCount', () => {
      offsideWarning(mockRoom, mockGameState, '0xffffff');
      expect(mockGameState.warningCount).toBe(1);

      offsideWarning(mockRoom, mockGameState, '0xffffff');
      expect(mockGameState.warningCount).toBe(2);
    });

    it('deve usar cor laranja para impedimento', async () => {
      offsideWarning(mockRoom, mockGameState, '0xffffff');

      jest.advanceTimersByTime(200);
      await Promise.resolve();

      expect(mockRoom.setDiscProperties).toHaveBeenCalledWith(0, { color: '0xffaa00' });
    });

    it('deve usar duracao de 1 segundo', async () => {
      offsideWarning(mockRoom, mockGameState, '0xffffff');

      jest.advanceTimersByTime(1000);
      await Promise.resolve();

      expect(mockRoom.setDiscProperties).toHaveBeenCalled();
    });

    it('deve inicializar warningCount se nao existir', () => {
      const gameStateEmpty = {};
      offsideWarning(mockRoom, gameStateEmpty, '0xffffff');

      expect(gameStateEmpty.warningCount).toBe(1);
    });
  });

  describe('foulWarning', () => {
    it('deve incrementar warningCount', () => {
      foulWarning(mockRoom, mockGameState, '0xffffff');
      expect(mockGameState.warningCount).toBe(1);

      foulWarning(mockRoom, mockGameState, '0xffffff');
      expect(mockGameState.warningCount).toBe(2);
    });

    it('deve usar cor vermelha para falta', async () => {
      foulWarning(mockRoom, mockGameState, '0xffffff');

      jest.advanceTimersByTime(200);
      await Promise.resolve();

      expect(mockRoom.setDiscProperties).toHaveBeenCalledWith(0, { color: '0xff0000' });
    });

    it('deve usar duracao de 1.2 segundos', async () => {
      foulWarning(mockRoom, mockGameState, '0xffffff');

      jest.advanceTimersByTime(1200);
      await Promise.resolve();

      expect(mockRoom.setDiscProperties).toHaveBeenCalled();
    });

    it('deve inicializar warningCount se nao existir', () => {
      const gameStateEmpty = {};
      foulWarning(mockRoom, gameStateEmpty, '0xffffff');

      expect(gameStateEmpty.warningCount).toBe(1);
    });
  });

  describe('integracao - multiplas celebracoes simultaneas', () => {
    it('deve suportar celebracoes de gol e assistencia ao mesmo tempo', async () => {
      goalCelebration(mockRoom, 100);
      assistCelebration(mockRoom, 101);

      jest.advanceTimersByTime(3000);
      await Promise.resolve();

      const calls = mockRoom.setPlayerAvatar.mock.calls;

      // Deve ter chamadas para ambos os jogadores
      const player100Calls = calls.filter((call) => call[0] === 100);
      const player101Calls = calls.filter((call) => call[0] === 101);

      expect(player100Calls.length).toBeGreaterThan(0);
      expect(player101Calls.length).toBeGreaterThan(0);
    });

    it('deve suportar multiplos avisos de bola', async () => {
      offsideWarning(mockRoom, mockGameState, '0xffffff');

      jest.advanceTimersByTime(500);

      foulWarning(mockRoom, mockGameState, '0xffffff');

      jest.advanceTimersByTime(1500);
      await Promise.resolve();

      expect(mockGameState.warningCount).toBe(2);
      expect(mockRoom.setDiscProperties).toHaveBeenCalled();
    });
  });
});

/*   __  ____ ____ _  _ 
 / _\/ ___) ___) )( \
/    \___ \___ ) \/ (
\_/\_(____(____|____/ */
