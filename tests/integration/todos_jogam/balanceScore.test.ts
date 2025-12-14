describe('Todos Jogam - Balance By Score', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // Reset global state
    delete (globalThis as any).room;
    // stub the auth-client that utils uses
    const authClientPath = require.resolve('../../../dist/database/auth-client');
    jest.isolateModules(() => {
      jest.resetModules();
      jest.doMock(authClientPath, () => ({
        getAuthDb: () => ({
          getAccountByNick: (nick: string) => {
            const map: any = { A: { points: 100, haxballNick: 'A' }, B: { points: 50, haxballNick: 'B' }, C: { points: 75, haxballNick: 'C' }, D: { points: 10, haxballNick: 'D' } };
            return map[nick] || { points: 0, haxballNick: nick };
          },
        }),
      }));
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    delete (globalThis as any).room;
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('redistributes teams using score-based balance', () => {
    // players setup
    const players = [
      { id: 1, name: 'A', team: 1 },
      { id: 2, name: 'B', team: 1 },
      { id: 3, name: 'C', team: 1 },
      { id: 4, name: 'D', team: 2 },
    ];

    const setPlayerTeamCalls: any[] = [];
    const mockRoom = {
      getPlayerList: () => players,
      getScores: () => ({ red: 3, blue: 1 }),
      setPlayerTeam: jest.fn((id: number, team: number) => setPlayerTeamCalls.push({ id, team })),
      setCustomStadium: jest.fn(() => {}),
      sendAnnouncement: jest.fn(() => {}),
      getPlayer: (id: number) => players.find((p) => p.id === id),
    } as any;

    (globalThis as any).room = mockRoom;

    // Load handler (it will register onTeamVictory handler)
    jest.isolateModules(() => {
      require('../../../bots/todos_jogam/handlers.cjs');
    });

    // Trigger team victory event (red > blue)
    mockRoom.onTeamVictory?.({ red: 3, blue: 1 });

    // advance timers for the balance score timeout (3 seconds)
    jest.advanceTimersByTime(3000);

    // Player 3 (C) should be moved from team 1 to 2 by the balance logic
    const moved = setPlayerTeamCalls.find((c) => c.id === 3 && c.team === 2);
    expect(moved).toBeDefined();
  });
});
