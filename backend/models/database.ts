require('dotenv').config();

const fs = require('fs');
const path = require('path');

const DB_CLIENT = String(process.env.DB_CLIENT || 'sqlite').trim().toLowerCase();
const SQLITE_DB_PATH = process.env.SQLITE_DB_PATH
  ? path.resolve(process.env.SQLITE_DB_PATH)
  : path.join(__dirname, '../..', 'database', 'ChatData.db');

const normalizeDbArgs = (params, cb) => {
  if (typeof params === 'function') {
    return { values: [], callback: params };
  }

  const values =
    params === undefined || params === null
      ? []
      : Array.isArray(params)
        ? params
        : [params];

  return { values, callback: typeof cb === 'function' ? cb : null };
};

const convertQMarksToPostgres = sql => {
  let index = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let out = '';

  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i];

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      out += char;
      continue;
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      out += char;
      continue;
    }

    if (char === '?' && !inSingleQuote && !inDoubleQuote) {
      index += 1;
      out += `$${index}`;
      continue;
    }

    out += char;
  }

  return out;
};

const ensureSqliteSchema = sqliteDb => {
  const createUsersTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      email_verified INTEGER DEFAULT 0
    );
  `;

  const createApiKeysTableQuery = `
    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      provider TEXT NOT NULL DEFAULT 'openai',
      api_key TEXT NOT NULL,
      UNIQUE (user_id, provider),
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
  `;

  const createChatHistoryTableQuery = `
    CREATE TABLE IF NOT EXISTS chat_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      session_id TEXT NOT NULL,
      message TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
  `;

  const createPasswordResetsTableQuery = `
    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      token TEXT NOT NULL,
      expires_at DATETIME NOT NULL
    );
  `;

  const createEmailVerificationsTableQuery = `
    CREATE TABLE IF NOT EXISTS email_verifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      token TEXT NOT NULL,
      expires_at DATETIME NOT NULL
    );
  `;

  const createProjectsTableQuery = `
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      instructions TEXT,
      context_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
  `;

  const createThreadsTableQuery = `
    CREATE TABLE IF NOT EXISTS threads (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      project_id INTEGER,
      title TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_message_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE SET NULL
    );
  `;

  const createMessagesTableQuery = `
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      thread_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      attachments TEXT,
      provider TEXT,
      model TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (thread_id) REFERENCES threads (id) ON DELETE CASCADE
    );
  `;

  sqliteDb.serialize(() => {
    sqliteDb.run('PRAGMA foreign_keys = ON;');

    sqliteDb.run(createUsersTableQuery, err => {
      if (err) console.error(err.message);
      else console.log('2) Table "users" created or already exists => OK.');
    });

    sqliteDb.run(createApiKeysTableQuery, err => {
      if (err) console.error(err.message);
      else console.log('3) Table "api_keys" created or already exists => OK.');
    });

    sqliteDb.all('PRAGMA table_info(api_keys);', (err, columns) => {
      if (err) {
        console.error(err.message);
        return;
      }
      const hasProvider = columns.some(col => col.name === 'provider');
      if (!hasProvider) {
        sqliteDb.run(
          "ALTER TABLE api_keys ADD COLUMN provider TEXT NOT NULL DEFAULT 'openai';",
          alterErr => {
            if (alterErr) console.error(alterErr.message);
            else console.log('3.1) Column "provider" added to "api_keys" => OK.');
          },
        );
      }
      sqliteDb.run(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_user_provider ON api_keys(user_id, provider);',
        indexErr => {
          if (indexErr) console.error(indexErr.message);
        },
      );
    });

    sqliteDb.run(createChatHistoryTableQuery, err => {
      if (err) console.error(err.message);
      else console.log('4) Table "chat_history" created or already exists => OK.');
    });

    sqliteDb.run(createPasswordResetsTableQuery, err => {
      if (err) console.error(err.message);
      else console.log('5) Table "password_resets" created or already exists => OK.');
    });

    sqliteDb.run(createEmailVerificationsTableQuery, err => {
      if (err) console.error(err.message);
      else console.log('5.1) Table "email_verifications" created or already exists => OK.');
    });

    sqliteDb.run(createProjectsTableQuery, err => {
      if (err) console.error(err.message);
      else console.log('6) Table "projects" created or already exists => OK.');
    });

    sqliteDb.run(createThreadsTableQuery, err => {
      if (err) console.error(err.message);
      else console.log('7) Table "threads" created or already exists => OK.');
    });

    sqliteDb.run(createMessagesTableQuery, err => {
      if (err) console.error(err.message);
      else console.log('8) Table "messages" created or already exists => OK.');
    });

    sqliteDb.all('PRAGMA table_info(projects);', (err, columns) => {
      if (err) {
        console.error(err.message);
        return;
      }
      const hasInstructions = columns.some(col => col.name === 'instructions');
      const hasContextData = columns.some(col => col.name === 'context_data');
      if (!hasInstructions) {
        sqliteDb.run('ALTER TABLE projects ADD COLUMN instructions TEXT;', alterErr => {
          if (alterErr) console.error(alterErr.message);
        });
      }
      if (!hasContextData) {
        sqliteDb.run('ALTER TABLE projects ADD COLUMN context_data TEXT;', alterErr => {
          if (alterErr) console.error(alterErr.message);
        });
      }
    });

    sqliteDb.all('PRAGMA table_info(messages);', (err, columns) => {
      if (err) {
        console.error(err.message);
        return;
      }
      const hasAttachments = columns.some(col => col.name === 'attachments');
      if (!hasAttachments) {
        sqliteDb.run('ALTER TABLE messages ADD COLUMN attachments TEXT;', alterErr => {
          if (alterErr) console.error(alterErr.message);
        });
      }
    });

    sqliteDb.all('PRAGMA table_info(users);', (err, columns) => {
      if (err) {
        console.error(err.message);
        return;
      }
      const hasEmailVerified = columns.some(col => col.name === 'email_verified');
      if (!hasEmailVerified) {
        sqliteDb.run(
          'ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0;',
          alterErr => {
            if (alterErr) console.error(alterErr.message);
          },
        );
      }
    });

    sqliteDb.run('CREATE INDEX IF NOT EXISTS idx_threads_user ON threads(user_id);', err => {
      if (err) console.error(err.message);
    });

    sqliteDb.run(
      'CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id);',
      err => {
        if (err) console.error(err.message);
      },
    );
  });
};

const createSqliteAdapter = () => {
  const sqlite3 = require('sqlite3').verbose();
  const sqliteDir = path.dirname(SQLITE_DB_PATH);
  if (!fs.existsSync(sqliteDir)) {
    fs.mkdirSync(sqliteDir, { recursive: true });
  }

  const sqliteDb = new sqlite3.Database(SQLITE_DB_PATH, err => {
    if (err) {
      console.error(err.message);
      return;
    }
    console.log(`1) Connected to SQLite database => OK. (${SQLITE_DB_PATH})`);
  });

  ensureSqliteSchema(sqliteDb);

  return {
    client: 'sqlite',
    run(sql, params, cb) {
      const { values, callback } = normalizeDbArgs(params, cb);
      return sqliteDb.run(sql, values, callback || (() => {}));
    },
    get(sql, params, cb) {
      const { values, callback } = normalizeDbArgs(params, cb);
      return sqliteDb.get(sql, values, callback || (() => {}));
    },
    all(sql, params, cb) {
      const { values, callback } = normalizeDbArgs(params, cb);
      return sqliteDb.all(sql, values, callback || (() => {}));
    },
    serialize(fn) {
      return sqliteDb.serialize(fn);
    },
    close(cb) {
      return sqliteDb.close(cb);
    },
  };
};

const ensurePostgresSchema = async pool => {
  const schemaQueries = [
    `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      email_verified INTEGER DEFAULT 0
    );`,
    `CREATE TABLE IF NOT EXISTS api_keys (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL DEFAULT 'openai',
      api_key TEXT NOT NULL,
      UNIQUE (user_id, provider)
    );`,
    `CREATE TABLE IF NOT EXISTS chat_history (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      session_id TEXT NOT NULL,
      message TEXT NOT NULL,
      timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS password_resets (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      token TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS email_verifications (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      token TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      instructions TEXT,
      context_data TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS threads (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
      title TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      last_message_at TIMESTAMPTZ
    );`,
    `CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      thread_id TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      attachments TEXT,
      provider TEXT,
      model TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );`,
    'ALTER TABLE projects ADD COLUMN IF NOT EXISTS instructions TEXT;',
    'ALTER TABLE projects ADD COLUMN IF NOT EXISTS context_data TEXT;',
    'ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachments TEXT;',
    'ALTER TABLE messages ADD COLUMN IF NOT EXISTS provider TEXT;',
    'ALTER TABLE messages ADD COLUMN IF NOT EXISTS model TEXT;',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified INTEGER DEFAULT 0;',
    "ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'openai';",
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_user_provider ON api_keys(user_id, provider);',
    'CREATE INDEX IF NOT EXISTS idx_threads_user ON threads(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id);',
  ];

  for (const query of schemaQueries) {
    await pool.query(query);
  }

  console.log('2) PostgreSQL schema initialized => OK.');
};

const createPostgresAdapter = () => {
  let pg;
  try {
    pg = require('pg');
  } catch (err) {
    throw new Error(
      'DB_CLIENT=postgres requires the "pg" package. Run: npm --prefix backend install pg',
    );
  }

  const poolConfig: Record<string, any> = {};
  if (process.env.DATABASE_URL) {
    poolConfig.connectionString = process.env.DATABASE_URL;
  }
  if (String(process.env.PGSSL || '').toLowerCase() === 'true') {
    poolConfig.ssl = {
      rejectUnauthorized:
        String(process.env.PGSSL_REJECT_UNAUTHORIZED || 'false').toLowerCase() === 'true',
    };
  }

  const pool = new pg.Pool(poolConfig);

  const ready = (async () => {
    await pool.query('SELECT 1;');
    console.log('1) Connected to PostgreSQL => OK.');
    await ensurePostgresSchema(pool);
  })();

  const runQuery = async (sql, values, isRun) => {
    await ready;
    const convertedSql = convertQMarksToPostgres(sql);
    if (!isRun) {
      return pool.query(convertedSql, values);
    }

    const trimmed = convertedSql.trim();
    const isInsert = /^insert\s+/i.test(trimmed);
    const hasReturning = /\breturning\b/i.test(trimmed);
    if (!isInsert || hasReturning) {
      return pool.query(convertedSql, values);
    }

    const withoutSemicolon = trimmed.replace(/;$/, '');
    return pool.query(`${withoutSemicolon} RETURNING id;`, values);
  };

  return {
    client: 'postgres',
    run(sql, params, cb) {
      const { values, callback } = normalizeDbArgs(params, cb);
      runQuery(sql, values, true)
        .then(result => {
          if (!callback) return;
          const info = {
            lastID: result?.rows?.[0]?.id ?? null,
            changes: result?.rowCount ?? 0,
            rowCount: result?.rowCount ?? 0,
          };
          callback.call(info, null);
        })
        .catch(err => {
          if (!callback) {
            console.error(err.message);
            return;
          }
          callback(err);
        });
    },
    get(sql, params, cb) {
      const { values, callback } = normalizeDbArgs(params, cb);
      runQuery(sql, values, false)
        .then(result => {
          if (!callback) return;
          callback(null, result.rows[0]);
        })
        .catch(err => {
          if (!callback) {
            console.error(err.message);
            return;
          }
          callback(err);
        });
    },
    all(sql, params, cb) {
      const { values, callback } = normalizeDbArgs(params, cb);
      runQuery(sql, values, false)
        .then(result => {
          if (!callback) return;
          callback(null, result.rows);
        })
        .catch(err => {
          if (!callback) {
            console.error(err.message);
            return;
          }
          callback(err);
        });
    },
    serialize(fn) {
      if (typeof fn === 'function') {
        fn();
      }
    },
    close(cb) {
      pool
        .end()
        .then(() => {
          if (typeof cb === 'function') cb();
        })
        .catch(err => {
          console.error(err.message);
          if (typeof cb === 'function') cb(err);
        });
    },
  };
};

let db;
if (DB_CLIENT === 'sqlite') {
  db = createSqliteAdapter();
} else if (DB_CLIENT === 'postgres') {
  db = createPostgresAdapter();
} else {
  throw new Error('DB_CLIENT must be either "sqlite" or "postgres".');
}

module.exports = db;
