const { getFutsalMap } = require('../../../shared/config/maps.cjs');

describe('Todos Jogam - Map Bucket Transitions', () => {
  beforeEach(() => {
    // Reset global room
    delete (globalThis as any).room;
  });

  afterEach(() => {
    delete (globalThis as any).room;
  });

  it('changes map when player count crosses buckets', () => {
    const players: any[] = [];
    const setCustomStadiumCalls: any[] = [];
    const announceCalls: any[] = [];

    const mockRoom = {
      getPlayerList: () => players,
      setCustomStadium: jest.fn((map: any) => setCustomStadiumCalls.push(map)),
      sendAnnouncement: jest.fn((text: any) => announceCalls.push(text)),
      getPlayer: (id: number) => players.find((p) => p.id === id),
    } as any;

    (globalThis as any).room = mockRoom;

    jest.isolateModules(() => {
      require('../../../bots/todos_jogam/handlers.cjs');
    });

    // tiny bucket (<=2)
    players.splice(0, players.length, { id: 1, name: 'A' });
    mockRoom.onGameStop?.();
    expect(setCustomStadiumCalls[0]).toEqual(getFutsalMap(2));

    // small bucket (<=6) 4 players
    players.splice(0, players.length, { id: 1, name: 'A' }, { id: 2, name: 'B' }, { id: 3, name: 'C' }, { id: 4, name: 'D' });
    mockRoom.onGameStop?.();
    expect(setCustomStadiumCalls[1]).toEqual(getFutsalMap(6));

    // mid (<=12) 8 players
    players.splice(0, players.length, { id: 1, name: 'A' }, { id: 2, name: 'B' }, { id: 3, name: 'C' }, { id: 4, name: 'D' }, { id: 5, name: 'E' }, { id: 6, name: 'F' }, { id: 7, name: 'G' }, { id: 8, name: 'H' });
    mockRoom.onGameStop?.();
    expect(setCustomStadiumCalls[2]).toEqual(getFutsalMap(12));

    // x7 (<=14) 13 players
    players.splice(0, players.length, { id: 1, name: 'A' }, { id: 2, name: 'B' }, { id: 3, name: 'C' }, { id: 4, name: 'D' }, { id: 5, name: 'E' }, { id: 6, name: 'F' }, { id: 7, name: 'G' }, { id: 8, name: 'H' }, { id: 9, name: 'I' }, { id: 10, name: 'J' }, { id: 11, name: 'K' }, { id: 12, name: 'L' }, { id: 13, name: 'M' });
    mockRoom.onGameStop?.();
    expect(setCustomStadiumCalls[3]).toEqual(getFutsalMap(14));

    // x8 (>14) 16 players
    players.splice(0, players.length, { id: 1, name: 'A' }, { id: 2, name: 'B' }, { id: 3, name: 'C' }, { id: 4, name: 'D' }, { id: 5, name: 'E' }, { id: 6, name: 'F' }, { id: 7, name: 'G' }, { id: 8, name: 'H' }, { id: 9, name: 'I' }, { id: 10, name: 'J' }, { id: 11, name: 'K' }, { id: 12, name: 'L' }, { id: 13, name: 'M' }, { id: 14, name: 'N' }, { id: 15, name: 'O' }, { id: 16, name: 'P' });
    mockRoom.onGameStop?.();
    expect(setCustomStadiumCalls[4]).toEqual(getFutsalMap(16));
  });
});
