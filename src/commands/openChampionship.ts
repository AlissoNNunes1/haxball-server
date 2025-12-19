import { Bot } from '../Bot';
import { initAuthDb } from '../database/auth-client';
import { initDb } from '../database/client';
import { Server } from '../Server';
import { buildChampionshipSettings, resolveChampionshipBotPath } from '../utils/championship';
import { loadConfig } from '../utils/loadConfig';
import { logger } from '../utils/Logger';

export interface ChampionshipCliArgs {
  file?: string;
  token: string;
  preset: string;
  home: string;
  away: string;
  spectators?: boolean;
  password?: string;
}

export async function openChampionshipRoom(args: ChampionshipCliArgs): Promise<void> {
  const config = await loadConfig(args.file);
  const db = initDb();
  const authDb = initAuthDb();
  authDb.createAuthTables();
  if (typeof authDb.createStatsTables === 'function') {
    authDb.createStatsTables();
  }

  const server = new Server(config.server, db);
  const { settings, roomName } = buildChampionshipSettings({
    preset: args.preset,
    home: args.home,
    away: args.away,
    allowSpectators: args.spectators,
    password: args.password,
  });

  const botPath = resolveChampionshipBotPath();
  const bot = new Bot('cirs-championship', botPath, roomName);
  const script = await bot.read();
  const browser = await bot.run(server, script, [args.token], settings);

  if (!browser) {
    logger.error('Championship', 'Falha ao abrir sala de campeonato');
    console.error('Falha ao abrir sala de campeonato');
    return;
  }

  logger.info('Championship', 'Sala aberta', {
    pid: browser.pid,
    link: browser.link,
    preset: args.preset,
  });
  console.log(`Sala de campeonato aberta: ${browser.link} (PID ${browser.pid})`);
  console.log(`Times: ${args.home} x ${args.away}`);
  console.log(`Preset: ${args.preset}`);
}

//   __  ____ ____ _  _
// / _\/ ___) ___) )( \
//    \___ \___ ) \/ (
// \_/\_(____(____|____/
