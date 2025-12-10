import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.mjs';

// Cliente Drizzle pronto para ser usado pelos modulos ESM
export function createDbClient(path = './haxball.sqlite') {
  const sqlite = new Database(path);
  return drizzle(sqlite, { schema });
}

//    __  ____ ____ _  _
//  / _\/ ___) ___) )( \
// /    \___ \___ ) \/ (
// \_/\_(____(____|____/
