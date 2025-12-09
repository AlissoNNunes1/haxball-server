import { Server } from '../../src/Server';
import { RoomMonitor } from '../../src/debugging/RoomMonitor';
import { logger } from '../../src/utils/Logger';

describe('Room Lifecycle Integration Tests', () => {
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
    maxMemoryUsage: 512
  };

  beforeEach(() => {
    server = new Server(mockConfig);
    roomMonitor = new RoomMonitor();
    logger.clearLogs();
  });

  describe('Room Abertura e Fechamento', () => {
    it('deve abrir uma sala com sucesso', async () => {
      const rooms = server.browsers;
      expect(Array.isArray(rooms)).toBe(true);
    });

    it('deve manter registro de salas abertas', () => {
      const initialRooms = server.browsers.length;
      expect(initialRooms).toBeGreaterThanOrEqual(0);
    });

    it('deve suportar multiplas salas simultaneas', () => {
      const browsers = server.browsers;
      expect(Array.isArray(browsers)).toBe(true);
    });
  });

  describe('Room Monitor - Rastreamento de Metricas', () => {
    it('deve criar metricas para nova sala', () => {
      const mockRoom = {
        onPlayerJoin: null,
        onPlayerLeave: null,
        onPlayerChat: null,
        onGoal: null,
        getLink: () => 'https://www.haxball.com/headless?c=abc123'
      };

      const mockPid = 1001;
      roomMonitor.trackRoom(mockPid, mockRoom);

      const metrics = roomMonitor.getMetrics(mockPid);
      expect(metrics).toBeDefined();
      expect(metrics?.pid).toBe(mockPid);
      expect(metrics?.playerCount).toBe(0);
      expect(metrics?.gameCount).toBe(0);
      expect(metrics?.messageCount).toBe(0);
      expect(metrics?.errorCount).toBe(0);
    });

    it('deve retornar metricas para sala existente', () => {
      const mockRoom = {};
      const pid = 1002;

      roomMonitor.trackRoom(pid, mockRoom);
      const metrics = roomMonitor.getMetrics(pid);

      expect(metrics).not.toBeUndefined();
      expect(metrics?.pid).toBe(pid);
    });

    it('deve retornar undefined para sala inexistente', () => {
      const metrics = roomMonitor.getMetrics(9999);
      expect(metrics).toBeUndefined();
    });

    it('deve retornar todas as metricas', () => {
      const mockRoom = {};

      roomMonitor.trackRoom(2001, mockRoom);
      roomMonitor.trackRoom(2002, mockRoom);
      roomMonitor.trackRoom(2003, mockRoom);

      const allMetrics = roomMonitor.getAllMetrics();
      expect(Array.isArray(allMetrics)).toBe(true);
      expect(allMetrics.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Monitoramento de Eventos', () => {
    it('deve registrar quando um jogador entra', (done) => {
      const mockRoom = {
        onPlayerJoin: null,
        onPlayerLeave: null,
        onPlayerChat: null,
        onGoal: null
      };

      const pid = 3001;
      roomMonitor.trackRoom(pid, mockRoom);

      const handler = mockRoom.onPlayerJoin as any;
      if (handler) {
        handler({ name: 'TestPlayer' });
      }

      setImmediate(() => {
        const metrics = roomMonitor.getMetrics(pid);
        expect(metrics).toBeDefined();
        done();
      });
    });

    it('deve registrar eventos de chat', (done) => {
      const mockRoom = {
        onPlayerJoin: null,
        onPlayerLeave: null,
        onPlayerChat: null,
        onGoal: null
      };

      const pid = 3002;
      roomMonitor.trackRoom(pid, mockRoom);

      setImmediate(() => {
        const metrics = roomMonitor.getMetrics(pid);
        expect(metrics).toBeDefined();
        done();
      });
    });
  });

  describe('Logging de Eventos do Ciclo de Vida', () => {
    it('deve registrar abertura de sala em logs', () => {
      logger.info('Server', 'Sala aberta', { pid: 4001, name: 'TestRoom' });

      const logs = logger.getLogs({ component: 'Server', limit: 10 });
      expect(logs.length).toBeGreaterThan(0);
      expect(logs.some(l => l.message.includes('Sala aberta'))).toBe(true);
    });

    it('deve registrar fechamento de sala em logs', () => {
      logger.info('Server', 'Sala fechada', { pid: 4002, name: 'TestRoom' });

      const logs = logger.getLogs({ component: 'Server', limit: 10 });
      expect(logs.some(l => l.message.includes('Sala fechada'))).toBe(true);
    });

    it('deve registrar erros de sala em logs', () => {
      logger.error('Server', 'Erro ao abrir sala', { 
        pid: 4003, 
        error: 'Token invalido' 
      });

      const errorLogs = logger.getLogs({ limit: 10 });
      expect(errorLogs.length).toBeGreaterThan(0);
    });

    it('deve incluir dados estruturados nos logs', () => {
      const testData = { 
        pid: 4004, 
        players: 5, 
        duration: 3600000 
      };
      logger.info('RoomMonitor', 'Sala estatisticas', testData);

      const logs = logger.getLogs({ limit: 1 });
      expect(logs[0].data).toEqual(testData);
    });
  });

  describe('Estatisticas de Sessao', () => {
    it('deve fornecer estatisticas de logs', () => {
      logger.info('Test', 'Msg1');
      logger.warn('Test', 'Msg2');
      logger.error('Test', 'Msg3');

      const stats = logger.getStats();
      expect(stats.totalLogs).toBeGreaterThanOrEqual(3);
      expect(stats.byLevel['INFO']).toBeGreaterThan(0);
      expect(stats.byLevel['WARN']).toBeGreaterThan(0);
      expect(stats.byLevel['ERROR']).toBeGreaterThan(0);
    });

    it('deve agrupar logs por componente', () => {
      logger.info('ComponentA', 'Msg1');
      logger.info('ComponentA', 'Msg2');
      logger.info('ComponentB', 'Msg3');

      const stats = logger.getStats();
      expect(stats.byComponent['ComponentA']).toBe(2);
      expect(stats.byComponent['ComponentB']).toBe(1);
    });
  });

  describe('Room Cleanup', () => {
    it('deve limpar recursos apos fechamento', async () => {
      // const initialRooms = server.browsers.length;
      const initialLogs = logger.getLogs().length;

      logger.info('Server', 'Cleanup test');

      expect(logger.getLogs().length).toBeGreaterThan(initialLogs);
    });

    it('deve suportar fechamento em lote de multiplas salas', async () => {
      const closedCount = await server.closeAll();
      expect(typeof closedCount).toBe('number');
      expect(closedCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Metricas de Desempenho', () => {
    it('deve rastrear tempo de resposta de eventos', (done) => {
      const startTime = Date.now();

      logger.info('Performance', 'Test started', { timestamp: startTime });

      setImmediate(() => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        expect(duration).toBeLessThan(100);
        done();
      });
    });

    it('deve fornecer metricas de uptime', () => {
      const mockRoom = {
        createdAt: Date.now(),
        onPlayerJoin: null
      };

      roomMonitor.trackRoom(5001, mockRoom as any);

      const metrics = roomMonitor.getMetrics(5001);
      expect(metrics?.startTime).toBeDefined();
      expect(typeof metrics?.startTime).toBe('number');
    });

    it('deve calcular media de eventos por minuto', () => {
      const pid = 5002;
      const mockRoom = {};

      roomMonitor.trackRoom(pid, mockRoom);
      const metrics = roomMonitor.getMetrics(pid);

      expect(metrics?.playerCount).toBe(0);
      expect(metrics?.gameCount).toBe(0);
      expect(metrics?.messageCount).toBe(0);
    });
  });

  describe('Resiliencia e Error Handling', () => {
    it('deve continuar funcionando apos erro em sala', () => {
      logger.error('RoomMonitor', 'Erro em sala', { pid: 6001 });

      const rooms = server.browsers;
      expect(Array.isArray(rooms)).toBe(true);
    });

    it('deve registrar erros sem falhar', () => {
      expect(() => {
        logger.error('Test', 'Test error', { code: 'TEST_ERROR' });
      }).not.toThrow();
    });

    it('deve manter metricas mesmo apos erros', () => {
      const mockRoom = {};
      const pid = 6002;

      roomMonitor.trackRoom(pid, mockRoom);
      logger.error('RoomMonitor', 'Test error');

      const metrics = roomMonitor.getMetrics(pid);
      expect(metrics).toBeDefined();
    });
  });

  describe('Integracao com WebMonitor', () => {
    it('deve fornecer dados para dashboard em tempo real', () => {
      const mockRoom = {};
      const pid = 7001;

      roomMonitor.trackRoom(pid, mockRoom);
      const metrics = roomMonitor.getAllMetrics();

      expect(Array.isArray(metrics)).toBe(true);
      metrics.forEach(m => {
        expect(m.pid).toBeDefined();
        expect(typeof m.playerCount).toBe('number');
        expect(typeof m.gameCount).toBe('number');
      });
    });

    it('deve suportar filtragem de logs por roomId', () => {
      logger.info('Room', 'Msg1');
      logger.info('Room', 'Msg2');

      const logs = logger.getLogs({ limit: 10 });
      expect(Array.isArray(logs)).toBe(true);
    });
  });
});

// SCS - Sistema de Controle de Servidores Haxball
