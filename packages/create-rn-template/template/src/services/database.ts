import { open } from 'react-native-quick-sqlite';

type SqlRow = Record<string, string | number | null>;

export const DB_NAME = 'app.db';
let dbReady = false;

/** Shared opener for app code and Zippy SQLite inspection. */
export function getDb() {
  return open({ name: DB_NAME });
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogRecord = {
  id: number;
  ts: number;
  level: LogLevel;
  category: string;
  event: string;
  message?: string;
  payload?: unknown;
};

export async function initDatabase(): Promise<void> {
  if (dbReady) {
    return;
  }

  const db = getDb();
  db.execute(`
    CREATE TABLE IF NOT EXISTS app_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts INTEGER NOT NULL,
      level TEXT NOT NULL,
      category TEXT NOT NULL,
      event TEXT NOT NULL,
      message TEXT,
      payload TEXT
    );
  `);
  db.execute('CREATE INDEX IF NOT EXISTS idx_logs_ts ON app_logs(ts DESC);');
  db.execute(`
    CREATE TABLE IF NOT EXISTS app_kv (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  dbReady = true;
}

export function insertLog(input: {
  level: LogLevel;
  category: string;
  event: string;
  message?: string;
  payload?: unknown;
}): void {
  const db = getDb();
  const ts = Date.now();
  const payload = input.payload == null ? null : JSON.stringify(input.payload);
  db.execute(
    'INSERT INTO app_logs (ts, level, category, event, message, payload) VALUES (?, ?, ?, ?, ?, ?)',
    [ts, input.level, input.category, input.event, input.message ?? null, payload],
  );
}

export function getRecentLogs(limit = 100): LogRecord[] {
  const db = getDb();
  const result = db.execute(
    'SELECT id, ts, level, category, event, message, payload FROM app_logs ORDER BY ts DESC LIMIT ?',
    [limit],
  );
  return ((result.rows?._array ?? []) as SqlRow[]).map((row) => ({
    id: row.id as number,
    ts: row.ts as number,
    level: row.level as LogLevel,
    category: row.category as string,
    event: row.event as string,
    message: (row.message ?? undefined) as string | undefined,
    payload: row.payload ? JSON.parse(row.payload as string) : undefined,
  }));
}

export function setKv(key: string, value: unknown): void {
  const db = getDb();
  db.execute('INSERT OR REPLACE INTO app_kv (key, value, updated_at) VALUES (?, ?, ?)', [
    key,
    JSON.stringify(value),
    Date.now(),
  ]);
}

export function getKv<T>(key: string): T | null {
  const db = getDb();
  const result = db.execute('SELECT value FROM app_kv WHERE key = ? LIMIT 1', [key]);
  const row = (result.rows?._array?.[0] ?? null) as SqlRow | null;
  if (!row) {
    return null;
  }
  try {
    return JSON.parse(row.value as string) as T;
  } catch {
    return null;
  }
}
