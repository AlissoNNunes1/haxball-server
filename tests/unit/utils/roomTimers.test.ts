const {
  createNamedInterval,
  createNamedTimeout,
  hasNamedTimer,
  clearNamedTimer,
  createInterval,
  clearRoomTimers,
  hasRoomTimers,
  clearAllRoomTimers,
} = require('../../../shared/config/roomTimers.cjs');

describe('roomTimers registry', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // clear global registry
    try {
      clearAllRoomTimers();
    } catch (e) {}
  });
  afterEach(() => {
    jest.useRealTimers();
    try {
      clearAllRoomTimers();
    } catch (e) {}
  });

  it('createNamedInterval is idempotent and can be cleared', () => {
    const room = { id: 'r1' };
    const fn = jest.fn();
    const h1 = createNamedInterval(room, 'ann', fn, 1000);
    expect(h1).toBeDefined();
    expect(hasNamedTimer(room, 'ann')).toBeTruthy();

    const h2 = createNamedInterval(room, 'ann', fn, 1000);
    expect(h2).toBeNull();

    clearNamedTimer(room, 'ann');
    expect(hasNamedTimer(room, 'ann')).toBeFalsy();
  });

  it('createInterval registers and clearRoomTimers clears them', () => {
    const room = { id: 'r2' };
    const fn = jest.fn();
    const h = createInterval(room, fn, 1000);
    expect(h).toBeDefined();
    expect(hasRoomTimers(room)).toBeTruthy();

    clearRoomTimers(room);
    expect(hasRoomTimers(room)).toBeFalsy();
  });
});
