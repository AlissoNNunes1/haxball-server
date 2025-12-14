import { loadConfig } from '../../../src/utils/loadConfig';
import { promises as fs } from 'fs';

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
  },
}));

describe('loadConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve carregar configuracao valida', async () => {
    const mockConfig = {
      server: { execPath: '/path', maxMemoryUsage: 512 },
      panel: { discordToken: 'token', discordPrefix: '!', bots: {}, mastersDiscordId: [] },
    };

    (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockConfig));

    const config = await loadConfig('test.json');
    expect(config).toEqual(mockConfig);
    expect(fs.readFile).toHaveBeenCalledWith('test.json', { encoding: 'utf-8' });
  });

  it('deve usar config.json padrao se nenhum arquivo especificado', async () => {
    const mockConfig = {
      server: { execPath: '/path', maxMemoryUsage: 512 },
      panel: { discordToken: 'token', discordPrefix: '!', bots: {}, mastersDiscordId: [] },
    };

    (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockConfig));

    await loadConfig();
    expect(fs.readFile).toHaveBeenCalled();
  });

  it('deve lancar erro se arquivo nao puder ser lido', async () => {
    const error = new Error('File not found');
    (fs.readFile as jest.Mock).mockRejectedValue(error);

    await expect(loadConfig('invalid.json')).rejects.toEqual({
      message: 'Error while loading or parsing config file',
      error: error,
    });
  });

  it('deve lancar erro se JSON nao for valido', async () => {
    (fs.readFile as jest.Mock).mockResolvedValue('{ invalid json }');

    await expect(loadConfig('test.json')).rejects.toEqual(
      expect.objectContaining({
        message: 'Error while loading or parsing config file',
      })
    );
  });

  it('deve lancar erro se configuracao nao tiver server', async () => {
    const mockConfig = {
      panel: { discordToken: 'token', discordPrefix: '!', bots: {}, mastersDiscordId: [] },
    };

    (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockConfig));

    await expect(loadConfig('test.json')).rejects.toEqual({
      message: 'Invalid configuration',
      error: null,
    });
  });

  it('deve lancar erro se configuracao nao tiver panel', async () => {
    const mockConfig = {
      server: { execPath: '/path', maxMemoryUsage: 512 },
    };

    (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockConfig));

    await expect(loadConfig('test.json')).rejects.toEqual({
      message: 'Invalid configuration',
      error: null,
    });
  });

  it('deve lancar erro se configuracao for null', async () => {
    (fs.readFile as jest.Mock).mockResolvedValue('null');

    await expect(loadConfig('test.json')).rejects.toEqual({
      message: 'Invalid configuration',
      error: null,
    });
  });

  it('deve lancar erro se configuracao nao for objeto', async () => {
    (fs.readFile as jest.Mock).mockResolvedValue('"string"');

    await expect(loadConfig('test.json')).rejects.toEqual({
      message: 'Invalid configuration',
      error: null,
    });
  });
});

//    __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
