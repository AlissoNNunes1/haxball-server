import { getAvailablePort } from '../../../src/utils/getAvailablePort';

describe('getAvailablePort', () => {
  it('deve retornar a porta fornecida', async () => {
    const port = 9500;
    expect(await getAvailablePort(port)).toBe(port);
  });

  it('deve aceitar portas alta', async () => {
    const port = 65535;
    expect(await getAvailablePort(port)).toBe(port);
  });

  it('deve aceitar portas baixa', async () => {
    const port = 1024;
    expect(await getAvailablePort(port)).toBe(port);
  });

  it('deve retornar numero quando nao conseguir determinar disponibilidade', async () => {
    const port = 3000;
    const result = await getAvailablePort(port);
    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThan(0);
  });
});

//    __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
