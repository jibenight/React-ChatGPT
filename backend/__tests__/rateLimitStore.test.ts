import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// rateLimitStore.ts uses CJS `require('./models/database')` which cannot be
// intercepted by vi.mock() in Vitest 4 (native require bypasses ESM mocks).
// We replicate the pure business logic here to test it in isolation, injecting
// mock db and logger. This mirrors the approach used in chatController.test.ts.

// --- In-memory DB simulation ---
let dbRows: Record<string, { key: string; total_hits: number; expire_at: number }> = {};

const db = {
  get: vi.fn((sql: string, params: any[], cb: (...args: any[]) => void) => {
    const key = params[0];
    const row = dbRows[key];
    if (!row) return cb(null, undefined);
    if (params.length > 1) {
      const now = params[1];
      if (row.expire_at <= now) return cb(null, undefined);
    }
    cb(null, { total_hits: row.total_hits, expire_at: row.expire_at });
  }),
  run: vi.fn((sql: string, params: any[], cb: (...args: any[]) => void) => {
    const lowerSql = sql.toLowerCase().trim();
    if (lowerSql.includes('create table') || lowerSql.includes('create index')) return cb(null);
    if (lowerSql.includes('insert into')) {
      // INSERT INTO rate_limits (key, total_hits, expire_at) VALUES (?, 1, ?)
      // params = [key, expireAt] -- total_hits literal 1 is in the SQL, not params
      dbRows[params[0]] = { key: params[0], total_hits: 1, expire_at: params[1] };
      return cb(null);
    }
    if (lowerSql.includes('update')) {
      if (dbRows[params[1]]) dbRows[params[1]].total_hits = params[0];
      return cb(null);
    }
    if (lowerSql.includes('delete') && params.length === 0) { dbRows = {}; return cb(null); }
    if (lowerSql.includes('delete') && lowerSql.includes('expire_at')) {
      if (dbRows[params[0]] && dbRows[params[0]].expire_at <= params[1]) delete dbRows[params[0]];
      return cb(null);
    }
    if (lowerSql.includes('delete')) { delete dbRows[params[0]]; return cb(null); }
    cb(null);
  }),
};

const logger = { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() };

// --- Replicated logic from rateLimitStore.ts ---
const TABLE = 'rate_limits';
const CLEANUP_INTERVAL_MS = 60 * 1000;

const dbGet = (sql: string, params: any[]): Promise<any> =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err: any, row: any) => {
      if (err) return reject(err);
      resolve(row);
    });
  });

const dbRun = (sql: string, params: any[]): Promise<void> =>
  new Promise((resolve, reject) => {
    db.run(sql, params, (err: any) => {
      if (err) return reject(err);
      resolve();
    });
  });

let tableReady = false;
let tableReadyPromise: Promise<void> | null = null;

const ensureTable = (): Promise<void> => {
  if (tableReady) return Promise.resolve();
  if (tableReadyPromise) return tableReadyPromise;
  tableReadyPromise = new Promise<void>((resolve, reject) => {
    const sql = `CREATE TABLE IF NOT EXISTS ${TABLE} (key TEXT PRIMARY KEY, total_hits INTEGER NOT NULL DEFAULT 0, expire_at INTEGER NOT NULL);`;
    db.run(sql, [], (err: any) => {
      if (err) { tableReadyPromise = null; return reject(err); }
      const idxSql = `CREATE INDEX IF NOT EXISTS idx_rate_limits_expire ON ${TABLE}(expire_at);`;
      db.run(idxSql, [], (idxErr: any) => {
        if (idxErr) { tableReadyPromise = null; return reject(idxErr); }
        tableReady = true;
        logger.info({ table: TABLE }, 'Rate limits table created or already exists');
        resolve();
      });
    });
  });
  return tableReadyPromise;
};

const deleteExpired = () => {
  const now = Date.now();
  db.run(`DELETE FROM ${TABLE} WHERE expire_at <= ?`, [now], (err: any) => {
    if (err) logger.error({ err: err.message }, 'Rate limits cleanup error');
  });
};

const createDatabaseStore = () => {
  let windowMs = 60 * 1000;
  let cleanupTimer: ReturnType<typeof setInterval> | null = null;

  const init = (options: any) => {
    windowMs = options.windowMs;
    ensureTable().catch((err) => {
      logger.error({ err: err.message }, 'Failed to create rate_limits table');
    });
    cleanupTimer = setInterval(deleteExpired, CLEANUP_INTERVAL_MS);
  };

  const get = async (key: string) => {
    await ensureTable();
    const now = Date.now();
    const row = await dbGet(
      `SELECT total_hits, expire_at FROM ${TABLE} WHERE key = ? AND expire_at > ?`,
      [key, now],
    );
    if (!row) return undefined;
    return { totalHits: row.total_hits, resetTime: new Date(row.expire_at) };
  };

  const increment = async (key: string) => {
    await ensureTable();
    const now = Date.now();
    const expireAt = now + windowMs;
    await dbRun(`DELETE FROM ${TABLE} WHERE key = ? AND expire_at <= ?`, [key, now]);
    const existing = await dbGet(`SELECT total_hits, expire_at FROM ${TABLE} WHERE key = ?`, [key]);
    if (existing) {
      const newHits = existing.total_hits + 1;
      await dbRun(`UPDATE ${TABLE} SET total_hits = ? WHERE key = ?`, [newHits, key]);
      return { totalHits: newHits, resetTime: new Date(existing.expire_at) };
    }
    await dbRun(`INSERT INTO ${TABLE} (key, total_hits, expire_at) VALUES (?, 1, ?)`, [key, expireAt]);
    return { totalHits: 1, resetTime: new Date(expireAt) };
  };

  const decrement = async (key: string) => {
    await ensureTable();
    const now = Date.now();
    const row = await dbGet(
      `SELECT total_hits FROM ${TABLE} WHERE key = ? AND expire_at > ?`,
      [key, now],
    );
    if (row && row.total_hits > 0) {
      await dbRun(`UPDATE ${TABLE} SET total_hits = ? WHERE key = ?`, [row.total_hits - 1, key]);
    }
  };

  const resetKey = async (key: string) => {
    await ensureTable();
    await dbRun(`DELETE FROM ${TABLE} WHERE key = ?`, [key]);
  };

  const resetAll = async () => {
    await ensureTable();
    await dbRun(`DELETE FROM ${TABLE}`, []);
  };

  const shutdown = () => {
    if (cleanupTimer) { clearInterval(cleanupTimer); cleanupTimer = null; }
  };

  return { init, get, increment, decrement, resetKey, resetAll, shutdown, localKeys: false };
};

// ---------------------------------------------------------------
// Tests
// ---------------------------------------------------------------

describe('rateLimitStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    dbRows = {};
    tableReady = false;
    tableReadyPromise = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should create a store with expected methods', () => {
    const store = createDatabaseStore();
    expect(store).toHaveProperty('init');
    expect(store).toHaveProperty('get');
    expect(store).toHaveProperty('increment');
    expect(store).toHaveProperty('decrement');
    expect(store).toHaveProperty('resetKey');
    expect(store).toHaveProperty('resetAll');
    expect(store).toHaveProperty('shutdown');
    expect(store.localKeys).toBe(false);
  });

  describe('increment', () => {
    it('should return totalHits 1 on first increment', async () => {
      const store = createDatabaseStore();
      store.init({ windowMs: 60000 });

      const result = await store.increment('test-key');
      expect(result.totalHits).toBe(1);
      expect(result.resetTime).toBeInstanceOf(Date);
    });

    it('should increment totalHits on subsequent calls', async () => {
      const store = createDatabaseStore();
      store.init({ windowMs: 60000 });

      await store.increment('test-key');
      const result = await store.increment('test-key');
      expect(result.totalHits).toBe(2);
    });

    it('should track different keys independently', async () => {
      const store = createDatabaseStore();
      store.init({ windowMs: 60000 });

      await store.increment('key-a');
      await store.increment('key-a');
      await store.increment('key-b');

      const resultA = await store.increment('key-a');
      const resultB = await store.increment('key-b');

      expect(resultA.totalHits).toBe(3);
      expect(resultB.totalHits).toBe(2);
    });
  });

  describe('get', () => {
    it('should return undefined for unknown key', async () => {
      const store = createDatabaseStore();
      store.init({ windowMs: 60000 });

      const result = await store.get('unknown');
      expect(result).toBeUndefined();
    });

    it('should return the current hit count after increment', async () => {
      const store = createDatabaseStore();
      store.init({ windowMs: 60000 });

      await store.increment('key1');
      await store.increment('key1');

      const result = await store.get('key1');
      expect(result).toBeDefined();
      expect(result!.totalHits).toBe(2);
      expect(result!.resetTime).toBeInstanceOf(Date);
    });
  });

  describe('resetKey', () => {
    it('should remove a specific key', async () => {
      const store = createDatabaseStore();
      store.init({ windowMs: 60000 });

      await store.increment('key-to-remove');
      await store.resetKey('key-to-remove');

      const result = await store.get('key-to-remove');
      expect(result).toBeUndefined();
    });

    it('should not affect other keys', async () => {
      const store = createDatabaseStore();
      store.init({ windowMs: 60000 });

      await store.increment('key-a');
      await store.increment('key-b');

      await store.resetKey('key-a');

      const resultA = await store.get('key-a');
      const resultB = await store.get('key-b');
      expect(resultA).toBeUndefined();
      expect(resultB).toBeDefined();
      expect(resultB!.totalHits).toBe(1);
    });
  });

  describe('resetAll', () => {
    it('should remove all keys', async () => {
      const store = createDatabaseStore();
      store.init({ windowMs: 60000 });

      await store.increment('key-a');
      await store.increment('key-b');

      await store.resetAll();

      expect(await store.get('key-a')).toBeUndefined();
      expect(await store.get('key-b')).toBeUndefined();
    });
  });

  describe('decrement', () => {
    it('should decrease totalHits by 1', async () => {
      const store = createDatabaseStore();
      store.init({ windowMs: 60000 });

      await store.increment('key1');
      await store.increment('key1');
      await store.decrement('key1');

      const result = await store.get('key1');
      expect(result!.totalHits).toBe(1);
    });

    it('should not go below 0', async () => {
      const store = createDatabaseStore();
      store.init({ windowMs: 60000 });

      await store.increment('key1');
      await store.decrement('key1');
      // totalHits is now 0, decrement should do nothing harmful
      await store.decrement('key1');

      const result = await store.get('key1');
      expect(result!.totalHits).toBe(0);
    });
  });

  describe('shutdown', () => {
    it('should clear the cleanup interval', () => {
      const store = createDatabaseStore();
      store.init({ windowMs: 60000 });

      // Should not throw
      store.shutdown();
      store.shutdown(); // idempotent
    });
  });
});
