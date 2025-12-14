const { hasNamedTimer } = require('../../../shared/config/roomTimers.cjs');
import { StatsCollector } from '../../../src/stats/StatsCollector';

describe('StatsCollector position sampling', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('registers named interval for sampling when room passed and clears on stop', () => {
    const collector = new StatsCollector(123, { enablePositionTracking: true, positionSamplingRate: 1 });
    const mockRoom = { id: 'rpos' };

    collector.startPositionSampling(() => new Map([[1, { x: 0, y: 0 }]]), mockRoom);
    expect(hasNamedTimer(mockRoom, 'stats_position_123')).toBeTruthy();

    collector.stopPositionSampling();
    expect(hasNamedTimer(mockRoom, 'stats_position_123')).toBeFalsy();
  });
});
