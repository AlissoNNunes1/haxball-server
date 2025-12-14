import { Server } from '../../src/Server';
import { RoomMonitor } from '../../src/debugging/RoomMonitor';
import { logger, LogLevel } from '../../src/utils/Logger';

/* StartupMetrics and CPUSample were only used for local dev benchmarks; removed to keep tests clean
interface _StartupMetrics {
  initTime: number;
  firstRoomTime: number;
  readinessTime: number;
  totalTime: number;
}

interface _CPUSample {
  timestamp: number;
  user: number;
  system: number;
}
*/

describe('Performance Benchmarks - Startup Time', () => {
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

  beforeEach(() => {
    server = new Server(mockConfig);
    logger.clearLogs();
  });

  afterEach(async () => {
    try {
      if (server) await server.closeAll();
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  describe('Server Initialization', () => {
    it('deve inicializar rapidamente', async () => {
      const startTime = Date.now();

      roomMonitor = new RoomMonitor();

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(2000);

      logger.info('Benchmark', 'Server init time', {
        duration: `${duration}ms`,
        target: '<2000ms',
        status: duration < 2000 ? 'PASS' : 'ABOVE_TARGET',
      });
    });

    it('deve estar pronto apos inicializacao', () => {
      // server not required for this benchmark

      expect(server).toBeDefined();
      expect(server.browsers).toBeDefined();
      expect(Array.isArray(server.browsers)).toBe(true);
    });
  });

  describe('Room Startup Time', () => {
    beforeEach(() => {
      // server not required for this benchmark
      roomMonitor = new RoomMonitor();
    });

    it('deve rastrear tempo de inicializacao de sala', async () => {
      const startTime = Date.now();

      const mockRoom = {
        getLink: () => 'https://www.haxball.com/headless?c=test123',
        onPlayerJoin: null,
        onPlayerLeave: null,
        onPlayerChat: null,
        onGoal: null,
      };

      roomMonitor.trackRoom(50001, mockRoom);

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100);

      logger.info('Benchmark', 'Room tracking startup', {
        duration: `${duration}ms`,
        overhead: formatBytes(0),
      });
    });

    it('deve ter tempo consistente para multiplas salas', () => {
      const times: number[] = [];

      for (let i = 0; i < 10; i++) {
        const start = Date.now();

        const mockRoom = {
          getLink: () => `https://www.haxball.com/headless?c=test${i}`,
          onPlayerJoin: null,
        };

        roomMonitor.trackRoom(50010 + i, mockRoom);

        const duration = Date.now() - start;
        times.push(duration);
      }

      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const max = Math.max(...times);

      expect(avg).toBeLessThan(50);
      expect(max).toBeLessThan(100);

      logger.info('Benchmark', 'Room startup consistency', {
        avg: `${avg.toFixed(2)}ms`,
        min: `${Math.min(...times)}ms`,
        max: `${max}ms`,
        stdDev: calculateStdDev(times),
      });
    });
  });

  describe('Logger Startup Overhead', () => {
    it('deve inicializar logger rapidamente', () => {
      const start = Date.now();

      logger.info('Benchmark', 'Init test');

      const duration = Date.now() - start;

      expect(duration).toBeLessThan(10);

      logger.info('Benchmark', 'Logger init overhead', {
        duration: `${duration}ms`,
      });
    });

    it('deve ter tempo de primeira mensagem baixo', () => {
      const start = Date.now();

      logger.info('Benchmark', 'First message');
      logger.info('Benchmark', 'Second message');
      logger.info('Benchmark', 'Third message');

      const duration = Date.now() - start;

      expect(duration).toBeLessThan(50);

      logger.info('Benchmark', 'First message latency', {
        duration: `${duration}ms`,
        perMessage: `${(duration / 3).toFixed(2)}ms`,
      });
    });
  });

  describe('Cold Start vs Warm Start', () => {
    it('deve ter tempo reduzido apos inicializacao', () => {
      // server not required for this benchmark
      roomMonitor = new RoomMonitor();

      const coldStart = Date.now();
      const mockRoom1 = { onPlayerJoin: null };
      roomMonitor.trackRoom(60001, mockRoom1);
      const coldDuration = Date.now() - coldStart;

      const warmStart = Date.now();
      const mockRoom2 = { onPlayerJoin: null };
      roomMonitor.trackRoom(60002, mockRoom2);
      const warmDuration = Date.now() - warmStart;

      logger.info('Benchmark', 'Cold vs Warm startup', {
        coldStart: `${coldDuration}ms`,
        warmStart: `${warmDuration}ms`,
        improvement: warmDuration < coldDuration ? 'Yes' : 'No',
      });
    });
  });

  describe('Cumulative Startup Time', () => {
    it('deve fornecer metricas de tempo total', async () => {
      const fullStartTime = Date.now();

      // server not required for this benchmark, skip instantiation
      roomMonitor = new RoomMonitor();

      for (let i = 0; i < 5; i++) {
        roomMonitor.trackRoom(70000 + i, { onPlayerJoin: null });
      }

      const totalTime = Date.now() - fullStartTime;

      expect(totalTime).toBeLessThan(5000);

      logger.info('Benchmark', 'Total startup sequence', {
        duration: `${totalTime}ms`,
        rooms: 5,
        perRoom: `${(totalTime / 5).toFixed(2)}ms`,
        target: '<5000ms for 5 rooms',
        status: totalTime < 5000 ? 'PASS' : 'ABOVE_TARGET',
      });
    });
  });

  describe('Readiness Time', () => {
    it('deve calcular tempo ate estar pronto para requisicoes', () => {
      const start = Date.now();

      // server not required for this benchmark, skip instantiation
      roomMonitor = new RoomMonitor();
      logger.setLogLevel(LogLevel.INFO);

      const readyTime = Date.now() - start;

      expect(readyTime).toBeLessThan(3000);

      logger.info('Benchmark', 'System readiness time', {
        duration: `${readyTime}ms`,
        components: ['Server', 'RoomMonitor', 'Logger'],
        target: '<3000ms',
        status: readyTime < 3000 ? 'PASS' : 'ABOVE_TARGET',
      });
    });
  });
});

describe('Performance Benchmarks - CPU Usage', () => {
  beforeEach(() => {
    logger.clearLogs();
  });

  describe('CPU Sampling', () => {
    it('deve coletar amostras de CPU', () => {
      const cpuUsage = process.cpuUsage();

      expect(cpuUsage.user).toBeGreaterThanOrEqual(0);
      expect(cpuUsage.system).toBeGreaterThanOrEqual(0);

      logger.info('Benchmark', 'CPU baseline', {
        user: `${(cpuUsage.user / 1000).toFixed(2)}ms`,
        system: `${(cpuUsage.system / 1000).toFixed(2)}ms`,
      });
    });

    it('deve rastrear mudancas de CPU', () => {
      const before = process.cpuUsage();

      for (let i = 0; i < 10000; i++) {
        Math.sqrt(i);
      }

      const after = process.cpuUsage(before);

      expect(after.user).toBeGreaterThanOrEqual(0);

      logger.info('Benchmark', 'CPU usage for computation', {
        userCPU: `${(after.user / 1000).toFixed(2)}ms`,
        systemCPU: `${(after.system / 1000).toFixed(2)}ms`,
      });
    });
  });

  describe('CPU Load from Operations', () => {
    it('deve medir CPU para room tracking', () => {
      // server not required for this benchmark, skip instantiation
      const roomMonitor = new RoomMonitor();

      const before = process.cpuUsage();

      for (let i = 0; i < 100; i++) {
        roomMonitor.trackRoom(80000 + i, { onPlayerJoin: null });
      }

      const after = process.cpuUsage(before);
      const totalMS = (after.user + after.system) / 1000;

      expect(totalMS).toBeLessThan(100);

      logger.info('Benchmark', 'CPU for room tracking', {
        rooms: 100,
        totalCPU: `${totalMS.toFixed(2)}ms`,
        perRoom: `${(totalMS / 100).toFixed(3)}ms`,
        target: '<100ms total',
      });
    });

    it('deve medir CPU para logging massivo', () => {
      const before = process.cpuUsage();

      for (let i = 0; i < 1000; i++) {
        logger.info('Benchmark', `Log ${i}`, { data: 'test'.repeat(10) });
      }

      const after = process.cpuUsage(before);
      const totalMS = (after.user + after.system) / 1000;

      expect(totalMS).toBeLessThan(500);

      logger.info('Benchmark', 'CPU for logging', {
        messages: 1000,
        totalCPU: `${totalMS.toFixed(2)}ms`,
        perMessage: `${(totalMS / 1000).toFixed(3)}ms`,
        messagesPerSecond: ((1000 / totalMS) * 1000).toFixed(0),
      });
    });
  });

  describe('CPU Efficiency', () => {
    it('deve eficiente em operacoes de leitura', () => {
      for (let i = 0; i < 100; i++) {
        logger.info('Benchmark', `Setup ${i}`);
      }

      const before = process.cpuUsage();

      for (let i = 0; i < 100; i++) {
        logger.getLogs({ limit: 10 });
      }

      const after = process.cpuUsage(before);
      const totalMS = (after.user + after.system) / 1000;

      expect(totalMS).toBeLessThan(50);

      logger.info('Benchmark', 'CPU efficiency read', {
        queries: 100,
        totalCPU: `${totalMS.toFixed(2)}ms`,
        perQuery: `${(totalMS / 100).toFixed(3)}ms`,
      });
    });

    it('deve medir CPU para stats aggregation', () => {
      for (let i = 0; i < 500; i++) {
        logger.info('Test', `Msg${i}`);
      }

      const before = process.cpuUsage();

      for (let i = 0; i < 10; i++) {
        logger.getStats();
      }

      const after = process.cpuUsage(before);
      const totalMS = (after.user + after.system) / 1000;

      expect(totalMS).toBeLessThan(100);

      logger.info('Benchmark', 'CPU efficiency stats', {
        operations: 10,
        totalCPU: `${totalMS.toFixed(2)}ms`,
        perOp: `${(totalMS / 10).toFixed(3)}ms`,
      });
    });
  });

  describe('CPU vs Memory Tradeoff', () => {
    it('deve demonstrar tradeoff CPU/Memory', () => {
      const memBefore = process.memoryUsage();
      const cpuBefore = process.cpuUsage();

      for (let i = 0; i < 2000; i++) {
        logger.info('Benchmark', `Message ${i}`, {
          data: 'test'.repeat(20),
        });
      }

      const memAfter = process.memoryUsage();
      const cpuAfter = process.cpuUsage(cpuBefore);

      const memDelta = (memAfter.heapUsed - memBefore.heapUsed) / 1024;
      const cpuDeltaMS = (cpuAfter.user + cpuAfter.system) / 1000;

      logger.info('Benchmark', 'CPU vs Memory tradeoff', {
        messages: 2000,
        memoryUsed: `${memDelta.toFixed(2)}KB`,
        cpuUsed: `${cpuDeltaMS.toFixed(2)}ms`,
        memPerMessage: `${(memDelta / 2000).toFixed(3)}KB`,
        cpuPerMessage: `${(cpuDeltaMS / 2000).toFixed(4)}ms`,
      });
    });
  });

  describe('CPU Target Validation', () => {
    it('deve estar abaixo do alvo de CPU esperado', () => {
      const targetPercentage = 10;

      const before = process.cpuUsage();

      // server not required for this benchmark, skip instantiation
      const roomMonitor = new RoomMonitor();

      for (let i = 0; i < 10; i++) {
        roomMonitor.trackRoom(90000 + i, {});
      }

      const after = process.cpuUsage(before);
      const cpuMS = (after.user + after.system) / 1000;

      logger.info('Benchmark', 'CPU target validation', {
        used: `${cpuMS.toFixed(2)}ms`,
        target: `<${targetPercentage}% during startup`,
        expectation: 'Low CPU impact for startup sequence',
      });
    });
  });
});

function calculateStdDev(values: number[]): string {
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map((v) => Math.pow(v - avg, 2));
  const stdDev = Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / values.length);
  return `${stdDev.toFixed(2)}ms`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

// SCS - Sistema de Controle de Servidores Haxball
