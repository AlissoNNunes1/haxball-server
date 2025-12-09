import { log } from '../../../src/utils/log';

describe('log', () => {
  const originalConsoleLog = console.log;

  beforeEach(() => {
    console.log = jest.fn();
  });

  afterEach(() => {
    console.log = originalConsoleLog;
  });

  it('deve registrar uma mensagem com prefixo', () => {
    log('INFO', 'Mensagem de teste');
    expect(console.log).toHaveBeenCalled();
    const call = (console.log as jest.Mock).mock.calls[0][0];
    expect(call).toContain('[INFO]');
    expect(call).toContain('Mensagem de teste');
  });

  it('deve truncar mensagens muito longas', () => {
    const longMessage = 'a'.repeat(400);
    log('WARNING', longMessage);
    expect(console.log).toHaveBeenCalled();
    const call = (console.log as jest.Mock).mock.calls[0][0];
    expect(call).toContain('...');
  });

  it('deve respeitar o tamanho maximo de log', () => {
    const longMessage = 'x'.repeat(350);
    log('ERROR', longMessage);
    expect(console.log).toHaveBeenCalled();
    const call = (console.log as jest.Mock).mock.calls[0][0];
    expect(call.length).toBeLessThan(450);
  });

  it('deve incluir timestamp no log', () => {
    log('DEBUG', 'teste com timestamp');
    expect(console.log).toHaveBeenCalled();
    const call = (console.log as jest.Mock).mock.calls[0][0];
    expect(call).toMatch(/\[\d{2}:\d{2}:\d{2}\]/);
  });

  it('deve registrar diferentes prefixos', () => {
    log('CUSTOM_PREFIX', 'mensagem');
    expect(console.log).toHaveBeenCalled();
    const call = (console.log as jest.Mock).mock.calls[0][0];
    expect(call).toContain('[CUSTOM_PREFIX]');
  });
});

//    __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
