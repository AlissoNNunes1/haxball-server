import { Logger, LogLevel, LogEntry } from '../../src/utils/Logger';

describe('Logger', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = Logger.getInstance();
    logger.clearLogs();
    logger.setLogLevel(LogLevel.DEBUG);
  });

  describe('Logging Basico', () => {
    it('deve criar entry com DEBUG', () => {
      logger.debug('TestComponent', 'Test message');
      const logs = logger.getLogs({ limit: 1 });

      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe(LogLevel.DEBUG);
      expect(logs[0].message).toBe('Test message');
      expect(logs[0].component).toBe('TestComponent');
    });

    it('deve criar entry com INFO', () => {
      logger.info('Server', 'Server started');
      const logs = logger.getLogs({ limit: 1 });

      expect(logs[0].level).toBe(LogLevel.INFO);
      expect(logs[0].message).toBe('Server started');
    });

    it('deve criar entry com WARN', () => {
      logger.warn('Memory', 'High memory usage');
      const logs = logger.getLogs({ limit: 1 });

      expect(logs[0].level).toBe(LogLevel.WARN);
    });

    it('deve criar entry com ERROR', () => {
      logger.error('Database', 'Connection failed');
      const logs = logger.getLogs({ limit: 1 });

      expect(logs[0].level).toBe(LogLevel.ERROR);
    });

    it('deve incluir dados adicionais', () => {
      logger.info('Room', 'Player joined', { playerId: 123, name: 'Player1' });
      const logs = logger.getLogs({ limit: 1 });

      expect(logs[0].data).toEqual({ playerId: 123, name: 'Player1' });
    });

    it('deve incluir timestamp', () => {
      logger.info('Test', 'Message');
      const logs = logger.getLogs({ limit: 1 });

      expect(logs[0].timestamp).toBeDefined();
      expect(logs[0].timestamp).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
    });
  });

  describe('Filtros', () => {
    beforeEach(() => {
      logger.debug('Comp1', 'Debug msg');
      logger.info('Comp1', 'Info msg');
      logger.warn('Comp2', 'Warn msg');
      logger.error('Comp2', 'Error msg');
    });

    it('deve filtrar por nivel', () => {
      const logs = logger.getLogs({ level: LogLevel.INFO });

      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('Info msg');
    });

    it('deve filtrar por componente', () => {
      const logs = logger.getLogs({ component: 'Comp1' });

      expect(logs).toHaveLength(2);
      expect(logs.every((l: LogEntry) => l.component === 'Comp1')).toBe(true);
    });

    it('deve filtrar por roomId', () => {
      logger.clearLogs();
      logger.info('Room', 'Msg1', { roomId: 1 });
      logger.info('Room', 'Msg2', { roomId: 2 });

      const entry1 = logger.getLogs({ limit: 2 })[0];
      const entry2 = logger.getLogs({ limit: 2 })[1];

      entry1.roomId = 1;
      entry2.roomId = 2;

      const filtered = logger.getLogs({ roomId: 1 });
      expect(filtered.some((l: LogEntry) => l.roomId === 1)).toBe(true);
    });

    it('deve respeitar limite', () => {
      const logs = logger.getLogs({ limit: 2 });

      expect(logs).toHaveLength(2);
    });
  });

  describe('Log Level Filtering', () => {
    it('deve ignorar DEBUG quando level e INFO', () => {
      logger.setLogLevel(LogLevel.INFO);
      logger.debug('Test', 'Debug msg');
      logger.info('Test', 'Info msg');

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe(LogLevel.INFO);
    });

    it('deve apenas mostrar ERROR quando level e ERROR', () => {
      logger.setLogLevel(LogLevel.ERROR);
      logger.debug('Test', 'Debug');
      logger.info('Test', 'Info');
      logger.warn('Test', 'Warn');
      logger.error('Test', 'Error');

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs.every((l: LogEntry) => [LogLevel.ERROR].includes(l.level))).toBe(true);
    });

    it('deve apenas mostrar ERROR quando level e ERROR', () => {
      logger.setLogLevel(LogLevel.ERROR);
      logger.debug('Test', 'Debug');
      logger.info('Test', 'Info');
      logger.warn('Test', 'Warn');
      logger.error('Test', 'Error');

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe(LogLevel.ERROR);
    });
  });

  describe('Subscribers', () => {
    it('deve notificar subscribers de novos logs', (done) => {
      const callback = jest.fn();
      logger.subscribe(callback);

      logger.info('Test', 'Message');

      setImmediate(() => {
        expect(callback).toHaveBeenCalled();
        expect(callback.mock.calls[0][0].message).toBe('Message');
        done();
      });
    });

    it('deve suportar multiplos subscribers', (done) => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      logger.subscribe(callback1);
      logger.subscribe(callback2);

      logger.info('Test', 'Message');

      setImmediate(() => {
        expect(callback1).toHaveBeenCalled();
        expect(callback2).toHaveBeenCalled();
        done();
      });
    });

    it('deve permitir unsubscribe', (done) => {
      const callback = jest.fn();
      const unsubscribe = logger.subscribe(callback);

      logger.info('Test', 'Message 1');

      unsubscribe();
      logger.info('Test', 'Message 2');

      setImmediate(() => {
        expect(callback).toHaveBeenCalledTimes(1);
        done();
      });
    });
  });

  describe('Estatisticas', () => {
    beforeEach(() => {
      logger.debug('Comp1', 'Msg');
      logger.info('Comp1', 'Msg');
      logger.warn('Comp2', 'Msg');
      logger.error('Comp2', 'Msg');
    });

    it('deve contar total de logs', () => {
      const stats = logger.getStats();

      expect(stats.totalLogs).toBe(4);
    });

    it('deve agrupar por nivel', () => {
      const stats = logger.getStats();

      expect(stats.byLevel).toEqual({
        DEBUG: 1,
        INFO: 1,
        WARN: 1,
        ERROR: 1,
      });
    });

    it('deve agrupar por componente', () => {
      const stats = logger.getStats();

      expect(stats.byComponent['Comp1']).toBe(2);
      expect(stats.byComponent['Comp2']).toBe(2);
    });
  });

  describe('Max Logs Limit', () => {
    it('deve manter apenas maxLogs logs', () => {
      for (let i = 0; i < 10100; i++) {
        logger.info('Test', `Message ${i}`);
      }

      const logs = logger.getLogs();
      expect(logs.length).toBeLessThanOrEqual(10000);
    });
  });

  describe('Clear Logs', () => {
    it('deve limpar todos os logs', () => {
      logger.info('Test', 'Msg1');
      logger.info('Test', 'Msg2');

      expect(logger.getLogs()).toHaveLength(2);

      logger.clearLogs();

      expect(logger.getLogs()).toHaveLength(0);
    });
  });
});

// SCS - Sistema de Controle de Servidores Haxball
