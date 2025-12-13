import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { Server } from '../../src/Server';

describe('Server.executeBotScript eval require injection', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'haxbot-'));
  });

  afterEach(async () => {
    // Cleanup temp folder
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch (e) {
      /* noop */
    }
    // Cleanup global var
    delete (globalThis as any).__TEST_EXECUTE_BOT;
  });

  it('should inject a require function so eval(script) can require relative modules', async () => {
    // Write dep.js in temp dir
    const depPath = path.join(tmpDir, 'dep.js');
    await fs.writeFile(depPath, `module.exports = { message: 'hello' };`, 'utf8');

    // Script content that requires './dep.js' relative to script dir
    const scriptContent = `const dep = require('./dep.js'); globalThis.__TEST_EXECUTE_BOT = dep.message;`;

    // Non-existent script path to force requireFn(scriptPath) to throw
    const scriptPath = path.join(tmpDir, 'nonexistent.js');

    // Create a Server instance with minimal config (we won't call open/getHBInit)
    const server = new Server({ proxyEnabled: false, proxyServers: [] } as any, null);

    // Call private method via any cast
    (server as any).executeBotScript({}, scriptContent, undefined, undefined, scriptPath);

    // The script should have set globalThis.__TEST_EXECUTE_BOT to "hello"
    expect((globalThis as any).__TEST_EXECUTE_BOT).toBe('hello');
  });
});
