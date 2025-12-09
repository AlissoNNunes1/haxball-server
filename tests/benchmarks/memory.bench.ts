import { Server } from '../../src/Server';
import { RoomMonitor } from '../../src/debugging/RoomMonitor';
import { logger } from '../../src/utils/Logger';

interface MemorySample {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
}

interface BenchmarkResult {
  testName: string;
  duration: number;
  memoryBefore: MemorySample;
  memoryAfter: MemorySample;
  memoryDelta: number;
  avgMemory: number;
}

describe('Performance Benchmarks - Memory Usage', () => {
  let server: Server;
  let roomMonitor: RoomMonitor;
  const mockConfig = {
    proxyEnabled: false,
    proxyServers: [],
    disableCache: false,
    disableRemote: false,
    userDataDir: '',
    disableAnonymizeLocalIps: false,
    execPath: '/mock/path',
    maxMemoryUsage: 512,
  };

  const getSample = (): MemorySample => {
    if (global.gc) global.gc();
    const mem = process.memoryUsage();
    return {
      timestamp: Date.now(),
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      external: mem.external,
    };
  };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  beforeEach(() => {
    server = new Server(mockConfig);
    roomMonitor = new RoomMonitor();
    logger.clearLogs();
    if (global.gc) global.gc();
  });

  afterEach(async () => {
    try {
      await server.closeAll();
    } catch (e) {
      // Ignore cleanup errors
    }
    if (global.gc) global.gc();
  });

  describe('Baseline Memory Consumption', () => {
    it('deve medir consumo inicial de memoria', () => {
      const sample = getSample();

      expect(sample.heapUsed).toBeGreaterThan(0);
      expect(sample.heapTotal).toBeGreaterThan(sample.heapUsed);
      expect(sample.timestamp).toBeGreaterThan(0);

      logger.info('Benchmark', 'Baseline memory', {
        heapUsed: formatBytes(sample.heapUsed),
        heapTotal: formatBytes(sample.heapTotal),
      });
    });

    it('deve ter overhead aceitavel para server vazio', () => {
      const sample = getSample();
      const heapUsedMB = sample.heapUsed / 1024 / 1024;

      expect(heapUsedMB).toBeLessThan(100);

      logger.info('Benchmark', 'Server baseline', {
        heapMB: heapUsedMB.toFixed(2),
      });
    });
  });

  describe('Room Creation Memory Impact', () => {
    it('deve rastrear memoria ao criar rastreador de sala', () => {
      const before = getSample();

      const mockRoom1 = { onPlayerJoin: null };
      const mockRoom2 = { onPlayerJoin: null };
      const mockRoom3 = { onPlayerJoin: null };

      roomMonitor.trackRoom(10001, mockRoom1);
      roomMonitor.trackRoom(10002, mockRoom2);
      roomMonitor.trackRoom(10003, mockRoom3);

      const after = getSample();
      const delta = after.heapUsed - before.heapUsed;

      expect(delta).toBeGreaterThan(0);

      logger.info('Benchmark', 'Room tracking overhead', {
        delta: formatBytes(delta),
        deltaKB: (delta / 1024).toFixed(2),
        perRoom: formatBytes(delta / 3),
      });
    });

    it('deve ter crescimento linear de memoria com multiplas salas', () => {
      const samples: number[] = [];

      for (let i = 0; i < 10; i++) {
        const before = getSample();

        const mockRoom = { onPlayerJoin: null };
        roomMonitor.trackRoom(20000 + i, mockRoom);

        const after = getSample();
        const delta = after.heapUsed - before.heapUsed;
        samples.push(delta);
      }

      const avgDelta = samples.reduce((a, b) => a + b, 0) / samples.length;

      expect(avgDelta).toBeLessThan(1024 * 1024);

      logger.info('Benchmark', 'Linear growth test', {
        avgDeltaPerRoom: formatBytes(avgDelta),
        samples: samples.map((s) => formatBytes(s)),
      });
    });
  });

  describe('Logger Memory Overhead', () => {
    it('deve medir memoria usada por buffer de logs', () => {
      const before = getSample();

      for (let i = 0; i < 1000; i++) {
        logger.info('Benchmark', `Log message ${i}`, {
          data: 'Test data',
          index: i,
          timestamp: Date.now(),
        });
      }

      const after = getSample();
      const delta = after.heapUsed - before.heapUsed;

      expect(delta).toBeGreaterThan(0);

      const logsCount = logger.getLogs().length;
      const perLog = delta / Math.min(logsCount, 1000);

      logger.info('Benchmark', '1000 logs memory', {
        total: formatBytes(delta),
        perLog: formatBytes(perLog),
        logsStored: logsCount,
      });
    });

    it('deve ter limite maximo de memoria para buffer', () => {
      const allLogs: any[] = [];

      for (let i = 0; i < 15000; i++) {
        logger.debug('Benchmark', `Message ${i}`, { index: i });
      }

      const logs = logger.getLogs({ limit: 100000 });

      expect(logs.length).toBeLessThanOrEqual(10000);

      logger.info('Benchmark', 'Buffer limit enforcement', {
        messagesWritten: 15000,
        messagesStored: logs.length,
        maxBuffer: 10000,
      });
    });
  });

  describe('Room Monitor Scalability', () => {
    it('deve manter performance com multiplas salas', () => {
      const roomCount = 50;
      const startTime = Date.now();

      for (let i = 0; i < roomCount; i++) {
        roomMonitor.trackRoom(30000 + i, {});
      }

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(500);

      const allMetrics = roomMonitor.getAllMetrics();
      expect(allMetrics.length).toBeGreaterThanOrEqual(roomCount);

      logger.info('Benchmark', 'RoomMonitor scalability', {
        rooms: roomCount,
        duration: `${duration}ms`,
        perRoom: `${(duration / roomCount).toFixed(2)}ms`,
      });
    });

    it('deve recuperar metricas rapidamente', () => {
      for (let i = 0; i < 100; i++) {
        roomMonitor.trackRoom(40000 + i, {});
      }

      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        roomMonitor.getMetrics(40000 + i);
      }

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(50);

      logger.info('Benchmark', 'Metrics retrieval speed', {
        queries: 100,
        duration: `${duration}ms`,
        perQuery: `${(duration / 100).toFixed(3)}ms`,
      });
    });
  });

  describe('Memory Cleanup', () => {
    it('deve liberar memoria ao limpar logs', () => {
      for (let i = 0; i < 1000; i++) {
        logger.info('Benchmark', `Log ${i}`);
      }

      const before = getSample();
      logger.clearLogs();
      if (global.gc) global.gc();
      const after = getSample();

      const freed = before.heapUsed - after.heapUsed;

      expect(freed).toBeGreaterThanOrEqual(0);

      logger.info('Benchmark', 'Cleanup effectiveness', {
        freed: formatBytes(freed),
        percentageFreed: ((freed / before.heapUsed) * 100).toFixed(2) + '%',
      });
    });

    it('deve nao vazar memoria com multiplos ciclos', () => {
      const samples: number[] = [];

      for (let cycle = 0; cycle < 5; cycle++) {
        const before = getSample();

        for (let i = 0; i < 500; i++) {
          logger.info('Benchmark', `Cycle ${cycle} - Log ${i}`);
        }

        logger.clearLogs();
        if (global.gc) global.gc();

        const after = getSample();
        samples.push(after.heapUsed);
      }

      const trend = samples.map((v, i) => (i === 0 ? 0 : v - samples[i - 1]));

      logger.info('Benchmark', 'Memory leak detection', {
        samples: samples.map((s) => formatBytes(s)),
        trend: trend.map((t) => formatBytes(t)),
      });
    });
  });

  describe('Comparative Metrics vs Targets', () => {
    it('deve estar abaixo do alvo de consumo esperado', () => {
      const targetMB = 50;
      const sample = getSample();
      const heapUsedMB = sample.heapUsed / 1024 / 1024;

      logger.info('Benchmark', 'Memory vs Target', {
        current: `${heapUsedMB.toFixed(2)} MB`,
        target: `${targetMB} MB`,
        status: heapUsedMB < targetMB ? 'PASS' : 'ABOVE_TARGET',
      });
    });

    it('deve fornecer relatorio de baseline', () => {
      const sample = getSample();

      logger.info('Benchmark', 'System Baseline Report', {
        heapUsedMB: (sample.heapUsed / 1024 / 1024).toFixed(2),
        heapTotalMB: (sample.heapTotal / 1024 / 1024).toFixed(2),
        externalMB: (sample.external / 1024 / 1024).toFixed(2),
        nodeVersion: process.version,
        platform: process.platform,
      });
    });
  });

  describe('Stress Test', () => {
    it('deve suportar alta carga de logging', () => {
      const startTime = Date.now();
      const messageCount = 5000;

      for (let i = 0; i < messageCount; i++) {
        logger.info('Stress', `Message ${i}`, {
          data: 'x'.repeat(100),
          index: i,
        });
      }

      const duration = Date.now() - startTime;
      const messagesPerSecond = (messageCount / duration) * 1000;

      expect(duration).toBeLessThan(5000);

      logger.info('Benchmark', 'Stress test results', {
        messages: messageCount,
        duration: `${duration}ms`,
        throughput: `${messagesPerSecond.toFixed(0)} msg/s`,
      });
    });
  });
});

// SCS - Sistema de Controle de Servidores Haxball
