import fs from 'fs/promises';
import path from 'path';

import { CustomSettings } from './Global';
import { Server } from './Server';

/**
 * Simple wrapper for legacy "script" bots
 */
export class Bot {
  constructor(public name: string, public filePath: string, public displayName?: string) {}

  get display() {
    return this.displayName || this.name;
  }

  async read(): Promise<string> {
    const filename = path.resolve(this.filePath);
    return fs.readFile(filename, { encoding: 'utf-8' });
  }

  async run(
    server: Server,
    script: string,
    tokens: string | string[],
    settings?: CustomSettings
  ): Promise<{ link: string; pid: number; remotePort?: number } | null> {
    // Use Server.open as the compat layer for legacy bots
    return server.open(script, tokens, this.display, settings);
  }
}

//    __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
