import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import * as schema from './schema';

type Db = BetterSQLite3Database<typeof schema>;

// One shared connection on globalThis so hot reload never opens a second one or reruns migrations.
const store = globalThis as typeof globalThis & { __studyDb?: Db };

// Paths resolve from the app root (pnpm runs every script with app/ as the working directory).
export function getDb(): Db {
  if (store.__studyDb) return store.__studyDb;
  const file = resolve(process.env.STUDY_DB_PATH ?? 'data/study.db');
  mkdirSync(dirname(file), { recursive: true });
  const sqlite = new Database(file);
  sqlite.pragma('journal_mode = WAL');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: resolve('drizzle') });
  store.__studyDb = db;
  return db;
}
