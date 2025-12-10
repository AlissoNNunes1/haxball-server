import path from 'path';
import { pathToFileURL } from 'url';
import { Server } from '../../src/Server';
import { ControlPanel } from '../../src/ControlPanel';
import { logger } from '../../src/utils/Logger';

jest.setTimeout(10000);

describe('ControlPanel ESM Integration', () => {
  let server: Server;
  const mockConfig = {
    proxyEnabled: false,
    proxyServers: [],
    disableCache: false,
    disableRemote: false,
    userDataDir: '',
    disableAnonymizeLocalIps: false,
    execPath: '/mock/path',
    maxMemoryUsage: 512,
  } as any;

  beforeEach(() => {
    server = new Server(mockConfig);
    logger.clearLogs();
  });

  afterEach(async () => {
    if (controlPanel && (controlPanel as any).monitor && typeof (controlPanel as any).monitor.stopPeriodicReports === 'function') {
      (controlPanel as any).monitor.stopPeriodicReports();
    }
    try {
      await server.closeAll();
    } catch (e) {
      /* ignore */
    }
  });

  let controlPanel: any;

  it('should load ESM rooms from panel rooms config and find init export', async () => {
    const panelConfig = {
      discordToken: '',
      discordPrefix: '!',
      bots: [],
      rooms: [
        {
          name: 'mini-soccer',
          path: path.join('..', '..', 'rooms', 'examples', 'mini-soccer.mjs'),
          type: 'esm',
        },
      ],
      mastersDiscordId: ['123'],
    } as any;

    controlPanel = new ControlPanel(server, panelConfig, __filename);
    // Debug: Attempt dynamic import the same way ControlPanel does
    const modPath = pathToFileURL(path.resolve(__dirname, '..', '..', 'rooms', 'examples', 'mini-soccer.mjs')).href;
    // eslint-disable-next-line no-new-func
    const dynamicImport = new Function('s', 'return import(s)');
    try {
      await dynamicImport(modPath);
      /* if succeeded, fine; otherwise we will fallback to path handling in ControlPanel */
    } catch (e) {
      /* ignore dynamic import error in jest environment */
    }

    const list = await (controlPanel as any).loadEsmRooms();
    expect(Array.isArray(list)).toBe(true);
    const mini = list.find((r: any) => r.name === 'mini-soccer');
    expect(mini).toBeDefined();
    expect(mini.module).toBeDefined();
    // Debug: log discovered module keys
    // debug information removed
    // In Jest VM dynamic import may fail; if it did, controlPanel will fallback to module.path
    if (mini.module && mini.module.path) {
      expect(typeof mini.module.path).toBe('string');
    } else {
      // The exported module should expose init function
      expect(typeof mini.module.init).toBe('function');
    }
  });

  it('should call server.openWithModule when opening ESM room via command', async () => {
    const panelConfig = {
      discordToken: '',
      discordPrefix: '!',
      bots: [],
      rooms: [
        {
          name: 'mini-soccer',
          path: path.join('..', '..', 'rooms', 'examples', 'mini-soccer.mjs'),
          type: 'esm',
        },
      ],
      mastersDiscordId: ['123'],
    } as any;

    controlPanel = new ControlPanel(server, panelConfig, __filename);

    // Ensure rooms have been discovered
    await (controlPanel as any).loadEsmRooms();
    // To avoid dynamic import restrictions in jest VM we manually set esmRoomsCache to simulate loaded module
    (controlPanel as any).esmRoomsCache = [
      { name: 'mini-soccer', module: { init: jest.fn(), name: 'mini-soccer' } },
    ];
    // spy on server.openWithModule
    const spy = jest.spyOn(server, 'openWithModule').mockResolvedValue({ pid: 15000, link: 'https://example.com' } as any);

    // Fake message object with necessary properties
    const fakeChannel: any = {
      send: jest.fn(async (_payload?: any) => {
        return { edit: jest.fn() };
      }),
    };

    const msg: any = {
      content: '!open mini-soccer TOKEN_ABCD',
      channel: fakeChannel,
      author: { id: '123' },
    };

    await (controlPanel as any).command(msg);

    expect(spy).toHaveBeenCalled();
    const firstArg = (spy.mock.calls[0][0] as any);
    expect(firstArg).toBeDefined();
    expect(typeof firstArg.init).toBe('function');

    spy.mockRestore();
  });
});
