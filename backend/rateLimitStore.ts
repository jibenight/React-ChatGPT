const db = require('./models/database');
const logger = require('./logger');

/**
 * Store persistant pour express-rate-limit v8.
 * Utilise la table `rate_limits` via l'adapter DB existant (SQLite / PostgreSQL).
 * Compatible multi-process : chaque instance lit/ecrit la meme base.
 */

const TABLE = 'rate_limits';
const CLEANUP_INTERVAL_MS = 60 * 1000;

let tableReady = false;
let tableReadyPromise: Promise<void> | null = null;

const ensureTable = (): Promise<void> => {
  if (tableReady) return Promise.resolve();
  if (tableReadyPromise) return tableReadyPromise;

  tableReadyPromise = new Promise<void>((resolve, reject) => {
    const sql = `
      CREATE TABLE IF NOT EXISTS ${TABLE} (
        key TEXT PRIMARY KEY,
        total_hits INTEGER NOT NULL DEFAULT 0,
        expire_at INTEGER NOT NULL
      );
    `;
    db.run(sql, [], (err) => {
      if (err) {
        tableReadyPromise = null;
        return reject(err);
      }

      const idxSql = `CREATE INDEX IF NOT EXISTS idx_rate_limits_expire ON ${TABLE}(expire_at);`;
      db.run(idxSql, [], (idxErr) => {
        if (idxErr) {
          tableReadyPromise = null;
          return reject(idxErr);
        }
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
  db.run(`DELETE FROM ${TABLE} WHERE expire_at <= ?`, [now], (err) => {
    if (err) logger.error({ err: err.message }, 'Rate limits cleanup error');
  });
};

const dbGet = (sql: string, params: any[]): Promise<any> =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });

const dbRun = (sql: string, params: any[]): Promise<void> =>
  new Promise((resolve, reject) => {
    db.run(sql, params, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });

const createDatabaseStore = () => {
  let windowMs = 60 * 1000;
  let cleanupTimer: ReturnType<typeof setInterval> | null = null;

  const init = (options) => {
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
    return {
      totalHits: row.total_hits,
      resetTime: new Date(row.expire_at),
    };
  };

  const increment = async (key: string) => {
    await ensureTable();
    const now = Date.now();
    const expireAt = now + windowMs;

    // Atomic upsert: insert or increment if not expired, reset if expired
    await dbRun(
      `INSERT INTO ${TABLE} (key, total_hits, expire_at) VALUES (?, 1, ?)
       ON CONFLICT(key) DO UPDATE SET
         total_hits = CASE WHEN expire_at <= ? THEN 1 ELSE total_hits + 1 END,
         expire_at  = CASE WHEN expire_at <= ? THEN ? ELSE expire_at END`,
      [key, expireAt, now, now, expireAt],
    );

    const row = await dbGet(
      `SELECT total_hits, expire_at FROM ${TABLE} WHERE key = ?`,
      [key],
    );

    return {
      totalHits: row ? row.total_hits : 1,
      resetTime: new Date(row ? row.expire_at : expireAt),
    };
  };

  const decrement = async (key: string) => {
    await ensureTable();
    const now = Date.now();
    const row = await dbGet(
      `SELECT total_hits FROM ${TABLE} WHERE key = ? AND expire_at > ?`,
      [key, now],
    );
    if (row && row.total_hits > 0) {
      await dbRun(
        `UPDATE ${TABLE} SET total_hits = ? WHERE key = ?`,
        [row.total_hits - 1, key],
      );
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
    if (cleanupTimer) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
  };

  return {
    init,
    get,
    increment,
    decrement,
    resetKey,
    resetAll,
    shutdown,
    localKeys: false,
  };
};

module.exports = { createDatabaseStore };
