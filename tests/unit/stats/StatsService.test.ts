import { initAuthDb } from '../../../src/database/auth-client';
import { StatsService } from '../../../src/stats/StatsService';
import { StatsCalculator } from '../../../src/stats/StatsCalculator';
import { BasicMatchStats, AdvancedMatchStats } from '../../../src/stats/types';

describe('StatsService', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('saveBasicStats inserts row into stats table', async () => {
    // Init in-memory DB
    const db = initAuthDb(':memory:');
    const sqlite = db.sqlite;

    const calculator = new StatsCalculator();
    const service = new StatsService(sqlite, calculator);

    const accountId = db.createAccount({ haxballNick: 'Test', passwordHash: 'x', salt: 'y', discordId: null });
    const basic: BasicMatchStats = {
      accountId,
      matchId: 1234,
      goals: 2,
      assists: 1,
      saves: 0,
      ownGoals: 0,
      touches: 5,
      timeInGame: 600,
      team: 'red',
      won: true,
    };

    await service.saveBasicStats(basic);

    const row = sqlite.prepare('SELECT * FROM stats WHERE account_id = ? AND match_id = ?').get(accountId, 1234);
    expect(row).toBeDefined();
    expect(row.goals).toBe(2);
    expect(row.touches).toBe(5);
  });

  it('updatePlayerAggregate creates aggregate record', async () => {
    const db = initAuthDb(':memory:');
    const sqlite = db.sqlite;

    const calculator = new StatsCalculator();
    const service = new StatsService(sqlite, calculator);

    const accountId = db.createAccount({ haxballNick: 'AggTest', passwordHash: 'x', salt: 'y', discordId: null });

    // Insert multiple basic stats
    const basic1: BasicMatchStats = { accountId, matchId: 1, goals: 1, assists: 0, saves: 0, ownGoals: 0, touches: 2, timeInGame: 600, team: 'red', won: true };
    const basic2: BasicMatchStats = { accountId, matchId: 2, goals: 2, assists: 1, saves: 0, ownGoals: 0, touches: 3, timeInGame: 600, team: 'red', won: false };
    await service.saveBasicStats(basic1);
    await service.saveBasicStats(basic2);

    // Insert advanced stats to enrich aggregation
    const adv1: AdvancedMatchStats = { ...basic1, passes: 5, passesCompleted: 4, interceptions: 1, tackles: 0, possessionTime: 10, distanceCovered: 100, topSpeed: 5, averageSpeed: 1, shotsOnGoal: 1, shotsOffGoal: 0, timesDispossessed: 0 } as any;
    const adv2: AdvancedMatchStats = { ...basic2, passes: 3, passesCompleted: 2, interceptions: 0, tackles: 0, possessionTime: 8, distanceCovered: 50, topSpeed: 6, averageSpeed: 1.5, shotsOnGoal: 0, shotsOffGoal: 1, timesDispossessed: 1 } as any;
    await service.saveAdvancedStats(adv1);
    await service.saveAdvancedStats(adv2);

    // Trigger update of aggregate
    await service.updatePlayerAggregate(accountId);

    // Query aggregate table
    const aggRow = sqlite.prepare('SELECT * FROM player_stats_aggregate WHERE account_id = ?').get(accountId);
    expect(aggRow).toBeDefined();
    expect(aggRow.total_matches).toBe(2);
    expect(aggRow.total_goals).toBe(3);
    expect(aggRow.total_passes).toBe(8);
  });
});
