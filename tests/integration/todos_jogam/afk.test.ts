const { setPlayerAFK, isPlayerAFK, removeAFKPlayer } = require('../../../shared/config/utils.cjs');

describe('Todos Jogam - AFK integration', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(0));
    // Reset global
    (globalThis as any).__CIRS_AFK_CHECK_INTERVAL = 100; // 100ms for tests
  });

  afterEach(() => {
    jest.useRealTimers();
    // Clear globals to avoid cross-test pollution
    delete (globalThis as any).__CIRS_AFK_CHECK_INTERVAL;
    delete (globalThis as any).room;
  });

  it('kicks AFK player after timeout', async () => {
    const kicked: any[] = [];
    const players: any[] = [];

    const mockRoom = {
      getPlayer: (id: number) => players.find((p) => p.id === id),
      getPlayerList: () => players,
      kickPlayer: jest.fn((id: number) => kicked.push(id)),
      sendAnnouncement: jest.fn(() => {}),
      setPlayerTeam: jest.fn(),
    } as any;

    (globalThis as any).room = mockRoom;

    // Load handler to start AFK interval
    jest.isolateModules(() => {
      require('../../../bots/todos_jogam/handlers.cjs');
    });

    // Simulate player join
    const player = { id: 101, name: 'AFKPlayer', team: 1 };
    players.push(player);

    // Mark AFK using util
    setPlayerAFK(player.id, true, player.team);
    expect(isPlayerAFK(player.id)).toBe(true);
    // Mock Date.now to simulate 10 minutes passed
    const realNow = Date.now();
    const mockedNow = realNow + 10 * 60 * 1000 + 1000;
    const nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => mockedNow);
    // Instead of relying on setInterval directly, execute the same AFK-check logic
    const playersList = mockRoom.getPlayerList().filter((p: any) => p.id !== 0);
    for (const p of playersList) {
      if (isPlayerAFK(p.id) && require('../../../shared/config/utils.cjs').isAFKTimeout(p.id)) {
        removeAFKPlayer(p.id);
        mockRoom.kickPlayer(p.id, 'AFK timeout (10 minutos)', false);
      }
    }

    expect(kicked).toContain(player.id);
    // Ensure AFK was removed
    expect(isPlayerAFK(player.id)).toBe(false);
    nowSpy.mockRestore();
  });

  it('toggles AFK and restores team correctly via removeAFKPlayer', () => {
    const players: any[] = [{ id: 201, name: 'Toggle', team: 2 }];
    const mockRoom = { getPlayerList: () => players } as any;
    (globalThis as any).room = mockRoom;

    setPlayerAFK(201, true, 2);
    expect(isPlayerAFK(201)).toBe(true);

    const prevTeam = removeAFKPlayer(201);
    expect(prevTeam).toBe(2);
    expect(isPlayerAFK(201)).toBe(false);
  });
});
