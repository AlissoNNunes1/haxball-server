const {
  startCommunityAnnouncements,
  stopCommunityAnnouncements,
  stopAllCommunityAnnouncements,
} = require('../../shared/config/messages.cjs');

describe('messages.startCommunityAnnouncements', () => {
  let mockRoom: any;
  beforeEach(() => {
    jest.useFakeTimers();
    mockRoom = { sendAnnouncement: jest.fn(), getPlayer: jest.fn() };
  });

  afterEach(() => {
    jest.useRealTimers();
    stopAllCommunityAnnouncements();
  });

  it('is idempotent: multiple calls do not create multiple timers', () => {
    startCommunityAnnouncements(mockRoom, 1000);
    startCommunityAnnouncements(mockRoom, 1000);
    // Access internal global Map
    const key = '__CHA_COMMUNITY_ANNOUNCEMENT_TIMERS__';
    const timers = (globalThis as any)[key];
    expect(timers).toBeDefined();
    expect(timers.has(mockRoom)).toBe(true);
    expect(timers.size).toBe(1);

    // call stop - should clear the timer
    stopCommunityAnnouncements(mockRoom);
    expect(timers.has(mockRoom)).toBe(false);
    expect(timers.size).toBe(0);
  });
});
