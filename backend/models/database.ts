require('dotenv').config();

const fs = require('fs');
const path = require('path');
const logger = require('../logger');

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

  // DEPRECATED: This table is no longer used. The 'messages' table is the current storage.
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

  const createProjectMembersTableQuery = `
    CREATE TABLE IF NOT EXISTS project_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer',
      invited_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(project_id, user_id)
    );
  `;

  sqliteDb.serialize(() => {
    sqliteDb.run('PRAGMA foreign_keys = ON;');

    sqliteDb.run(createUsersTableQuery, err => {
      if (err) logger.error({ err: err.message }, 'Failed to create table "users"');
      else logger.info('Table "users" created or already exists');
    });

    sqliteDb.run(createApiKeysTableQuery, err => {
      if (err) logger.error({ err: err.message }, 'Failed to create table "api_keys"');
      else logger.info('Table "api_keys" created or already exists');
    });

    sqliteDb.all('PRAGMA table_info(api_keys);', (err, columns) => {
      if (err) {
        logger.error({ err: err.message }, 'Failed to read api_keys schema');
        return;
      }
      const hasProvider = columns.some(col => col.name === 'provider');
      if (!hasProvider) {
        sqliteDb.run(
          "ALTER TABLE api_keys ADD COLUMN provider TEXT NOT NULL DEFAULT 'openai';",
          alterErr => {
            if (alterErr) logger.error({ err: alterErr.message }, 'Failed to add column "provider" to "api_keys"');
            else logger.info('Column "provider" added to "api_keys"');
          },
        );
      }
      sqliteDb.run(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_user_provider ON api_keys(user_id, provider);',
        indexErr => {
          if (indexErr) logger.error({ err: indexErr.message }, 'Failed to create index on api_keys');
        },
      );
    });

    sqliteDb.run(createChatHistoryTableQuery, err => {
      if (err) logger.error({ err: err.message }, 'Failed to create table "chat_history"');
      else logger.info('Table "chat_history" created or already exists');
    });

    sqliteDb.run(createPasswordResetsTableQuery, err => {
      if (err) logger.error({ err: err.message }, 'Failed to create table "password_resets"');
      else logger.info('Table "password_resets" created or already exists');
    });

    sqliteDb.run(createEmailVerificationsTableQuery, err => {
      if (err) logger.error({ err: err.message }, 'Failed to create table "email_verifications"');
      else logger.info('Table "email_verifications" created or already exists');
    });

    sqliteDb.run(createProjectsTableQuery, err => {
      if (err) logger.error({ err: err.message }, 'Failed to create table "projects"');
      else logger.info('Table "projects" created or already exists');
    });

    sqliteDb.run(createThreadsTableQuery, err => {
      if (err) logger.error({ err: err.message }, 'Failed to create table "threads"');
      else logger.info('Table "threads" created or already exists');
    });

    sqliteDb.run(createMessagesTableQuery, err => {
      if (err) logger.error({ err: err.message }, 'Failed to create table "messages"');
      else logger.info('Table "messages" created or already exists');
    });

    sqliteDb.run(createProjectMembersTableQuery, err => {
      if (err) logger.error({ err: err.message }, 'Failed to create table "project_members"');
      else logger.info('Table "project_members" created or already exists');
    });

    sqliteDb.run(
      'CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);',
      err => {
        if (err) logger.error({ err: err.message }, 'Failed to create index idx_project_members_project');
      },
    );

    sqliteDb.run(
      'CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);',
      err => {
        if (err) logger.error({ err: err.message }, 'Failed to create index idx_project_members_user');
      },
    );

    sqliteDb.all('PRAGMA table_info(projects);', (err, columns) => {
      if (err) {
        logger.error({ err: err.message }, 'Failed to read projects schema');
        return;
      }
      const hasInstructions = columns.some(col => col.name === 'instructions');
      const hasContextData = columns.some(col => col.name === 'context_data');
      if (!hasInstructions) {
        sqliteDb.run('ALTER TABLE projects ADD COLUMN instructions TEXT;', alterErr => {
          if (alterErr) logger.error({ err: alterErr.message }, 'Failed to add column "instructions" to projects');
        });
      }
      if (!hasContextData) {
        sqliteDb.run('ALTER TABLE projects ADD COLUMN context_data TEXT;', alterErr => {
          if (alterErr) logger.error({ err: alterErr.message }, 'Failed to add column "context_data" to projects');
        });
      }
    });

    sqliteDb.all('PRAGMA table_info(messages);', (err, columns) => {
      if (err) {
        logger.error({ err: err.message }, 'Failed to read messages schema');
        return;
      }
      const hasAttachments = columns.some(col => col.name === 'attachments');
      if (!hasAttachments) {
        sqliteDb.run('ALTER TABLE messages ADD COLUMN attachments TEXT;', alterErr => {
          if (alterErr) logger.error({ err: alterErr.message }, 'Failed to add column "attachments" to messages');
        });
      }
    });

    sqliteDb.all('PRAGMA table_info(users);', (err, columns) => {
      if (err) {
        logger.error({ err: err.message }, 'Failed to read users schema');
        return;
      }
      const hasEmailVerified = columns.some(col => col.name === 'email_verified');
      if (!hasEmailVerified) {
        sqliteDb.run(
          'ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0;',
          alterErr => {
            if (alterErr) logger.error({ err: alterErr.message }, 'Failed to add column "email_verified" to users');
          },
        );
      }
    });

    sqliteDb.run('CREATE INDEX IF NOT EXISTS idx_threads_user ON threads(user_id);', err => {
      if (err) logger.error({ err: err.message }, 'Failed to create index idx_threads_user');
    });

    sqliteDb.run(
      'CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id);',
      err => {
        if (err) logger.error({ err: err.message }, 'Failed to create index idx_messages_thread');
      },
    );

    sqliteDb.run(
      'CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);',
      err => {
        if (err) logger.error({ err: err.message }, 'Failed to create index idx_password_resets_token');
      },
    );

    sqliteDb.run(
      'CREATE INDEX IF NOT EXISTS idx_email_verifications_token ON email_verifications(token);',
      err => {
        if (err) logger.error({ err: err.message }, 'Failed to create index idx_email_verifications_token');
      },
    );

    sqliteDb.run(
      'CREATE INDEX IF NOT EXISTS idx_messages_thread_created ON messages(thread_id, created_at);',
      err => {
        if (err) logger.error({ err: err.message }, 'Failed to create index idx_messages_thread_created');
      },
    );

    sqliteDb.run(
      'CREATE INDEX IF NOT EXISTS idx_threads_project ON threads(project_id);',
      err => {
        if (err) logger.error({ err: err.message }, 'Failed to create index idx_threads_project');
      },
    );

    sqliteDb.run(
      'CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);',
      err => {
        if (err) logger.error({ err: err.message }, 'Failed to create index idx_projects_user');
      },
    );

    // FTS5 virtual table for full-text search on messages
    sqliteDb.run(
      `CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(content, content_rowid=id);`,
      err => {
        if (err) logger.error({ err: err.message }, 'Failed to create FTS table "messages_fts"');
        else logger.info('FTS table "messages_fts" created or already exists');
      },
    );

    // Trigger: sync FTS on INSERT
    sqliteDb.run(
      `CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN
        INSERT INTO messages_fts(rowid, content) VALUES (new.id, new.content);
      END;`,
      err => {
        if (err) logger.error({ err: err.message }, 'Failed to create trigger "messages_ai"');
      },
    );

    // Trigger: sync FTS on DELETE
    sqliteDb.run(
      `CREATE TRIGGER IF NOT EXISTS messages_ad AFTER DELETE ON messages BEGIN
        INSERT INTO messages_fts(messages_fts, rowid, content) VALUES ('delete', old.id, old.content);
      END;`,
      err => {
        if (err) logger.error({ err: err.message }, 'Failed to create trigger "messages_ad"');
      },
    );

    // Backfill FTS with existing messages that are not yet indexed
    sqliteDb.run(
      `INSERT OR IGNORE INTO messages_fts(rowid, content) SELECT id, content FROM messages;`,
      err => {
        if (err) logger.error({ err: err.message }, 'Failed to backfill FTS index');
        else logger.info('FTS backfill complete');
      },
    );
  });
};

const createSqliteTxnHelper = sqliteDb => ({
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
});

const createSqliteAdapter = () => {
  const sqlite3 = require('sqlite3').verbose();
  const sqliteDir = path.dirname(SQLITE_DB_PATH);
  if (!fs.existsSync(sqliteDir)) {
    fs.mkdirSync(sqliteDir, { recursive: true });
  }

  const sqliteDb = new sqlite3.Database(SQLITE_DB_PATH, err => {
    if (err) {
      logger.error({ err: err.message }, 'Failed to connect to SQLite database');
      return;
    }
    logger.info({ path: SQLITE_DB_PATH }, 'Connected to SQLite database');
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
    searchMessages(userId, query, limit, offset) {
      return new Promise((resolve, reject) => {
        const countSql = `
          SELECT COUNT(*) as total
          FROM messages m
          JOIN messages_fts fts ON m.id = fts.rowid
          WHERE messages_fts MATCH ?
            AND m.thread_id IN (SELECT id FROM threads WHERE user_id = ?)
        `;
        const searchSql = `
          SELECT m.id, m.thread_id, t.title AS thread_title, m.role, m.content,
                 m.provider, m.created_at,
                 snippet(messages_fts, 0, '<mark>', '</mark>', '...', 40) AS snippet
          FROM messages m
          JOIN messages_fts fts ON m.id = fts.rowid
          JOIN threads t ON m.thread_id = t.id
          WHERE messages_fts MATCH ?
            AND t.user_id = ?
          ORDER BY m.created_at DESC
          LIMIT ? OFFSET ?
        `;
        sqliteDb.get(countSql, [query, userId], (err, countRow) => {
          if (err) return reject(err);
          const total = countRow ? countRow.total : 0;
          sqliteDb.all(searchSql, [query, userId, limit, offset], (err2, rows) => {
            if (err2) return reject(err2);
            resolve({ results: rows || [], total });
          });
        });
      });
    },
    transaction(callback) {
      return new Promise((resolve, reject) => {
        sqliteDb.run('BEGIN TRANSACTION', beginErr => {
          if (beginErr) return reject(beginErr);
          const txn = createSqliteTxnHelper(sqliteDb);
          Promise.resolve()
            .then(() => callback(txn))
            .then(result => {
              sqliteDb.run('COMMIT', commitErr => {
                if (commitErr) return reject(commitErr);
                resolve(result);
              });
            })
            .catch(err => {
              sqliteDb.run('ROLLBACK', () => {
                reject(err);
              });
            });
        });
      });
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
    // DEPRECATED: This table is no longer used. The 'messages' table is the current storage.
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
    `CREATE TABLE IF NOT EXISTS project_members (
      id SERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'viewer',
      invited_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(project_id, user_id)
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
    'CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);',
    'CREATE INDEX IF NOT EXISTS idx_email_verifications_token ON email_verifications(token);',
    'CREATE INDEX IF NOT EXISTS idx_messages_thread_created ON messages(thread_id, created_at);',
    'CREATE INDEX IF NOT EXISTS idx_threads_project ON threads(project_id);',
    'CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);',
    // Full-text search: add tsvector column
    `DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'messages' AND column_name = 'search_vector'
      ) THEN
        ALTER TABLE messages ADD COLUMN search_vector tsvector;
      END IF;
    END $$;`,
    // Backfill existing rows
    `UPDATE messages SET search_vector = to_tsvector('simple', coalesce(content, ''))
     WHERE search_vector IS NULL;`,
    // GIN index
    `CREATE INDEX IF NOT EXISTS idx_messages_search_vector ON messages USING GIN(search_vector);`,
    // Trigger function for auto-update
    `CREATE OR REPLACE FUNCTION messages_search_vector_update() RETURNS trigger AS $$
     BEGIN
       NEW.search_vector := to_tsvector('simple', coalesce(NEW.content, ''));
       RETURN NEW;
     END;
     $$ LANGUAGE plpgsql;`,
    // Trigger
    `DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_messages_search_vector'
      ) THEN
        CREATE TRIGGER trg_messages_search_vector
        BEFORE INSERT OR UPDATE OF content ON messages
        FOR EACH ROW EXECUTE FUNCTION messages_search_vector_update();
      END IF;
    END $$;`,
    'CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);',
    'CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);',
  ];

  for (const query of schemaQueries) {
    await pool.query(query);
  }

  logger.info('PostgreSQL schema initialized');
};

const createPostgresAdapter = () => {
  let pg;
  try {
    pg = require('pg');
  } catch (_err) {
    // eslint-disable-next-line preserve-caught-error -- TS target ES2020 does not support Error cause
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
    logger.info('Connected to PostgreSQL');
    await ensurePostgresSchema(pool);
  })();

  const runQuery = async (sql, values, isRun, client?) => {
    await ready;
    const target = client || pool;
    const convertedSql = convertQMarksToPostgres(sql);
    if (!isRun) {
      return target.query(convertedSql, values);
    }

    const trimmed = convertedSql.trim();
    const isInsert = /^insert\s+/i.test(trimmed);
    const hasReturning = /\breturning\b/i.test(trimmed);
    if (!isInsert || hasReturning) {
      return target.query(convertedSql, values);
    }

    const withoutSemicolon = trimmed.replace(/;$/, '');
    return target.query(`${withoutSemicolon} RETURNING id;`, values);
  };

  const createPgTxnHelper = client => ({
    run(sql, params, cb) {
      const { values, callback } = normalizeDbArgs(params, cb);
      runQuery(sql, values, true, client)
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
            logger.error({ err: err.message }, 'Database query failed');
            return;
          }
          callback(err);
        });
    },
    get(sql, params, cb) {
      const { values, callback } = normalizeDbArgs(params, cb);
      runQuery(sql, values, false, client)
        .then(result => {
          if (!callback) return;
          callback(null, result.rows[0]);
        })
        .catch(err => {
          if (!callback) {
            logger.error({ err: err.message }, 'Database query failed');
            return;
          }
          callback(err);
        });
    },
    all(sql, params, cb) {
      const { values, callback } = normalizeDbArgs(params, cb);
      runQuery(sql, values, false, client)
        .then(result => {
          if (!callback) return;
          callback(null, result.rows);
        })
        .catch(err => {
          if (!callback) {
            logger.error({ err: err.message }, 'Database query failed');
            return;
          }
          callback(err);
        });
    },
  });

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
            logger.error({ err: err.message }, 'Database query failed');
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
            logger.error({ err: err.message }, 'Database query failed');
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
            logger.error({ err: err.message }, 'Database query failed');
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
          logger.error({ err: err.message }, 'Failed to close database connection');
          if (typeof cb === 'function') cb(err);
        });
    },
    async searchMessages(userId, query, limit, offset) {
      await ready;
      const countSql = `
        SELECT COUNT(*) as total
        FROM messages m
        JOIN threads t ON m.thread_id = t.id
        WHERE t.user_id = $1
          AND m.search_vector @@ plainto_tsquery('simple', $2)
      `;
      const searchSql = `
        SELECT m.id, m.thread_id, t.title AS thread_title, m.role, m.content,
               m.provider, m.created_at,
               ts_headline('simple', m.content, plainto_tsquery('simple', $2),
                 'StartSel=<mark>, StopSel=</mark>, MaxFragments=1, MaxWords=40, MinWords=20'
               ) AS snippet
        FROM messages m
        JOIN threads t ON m.thread_id = t.id
        WHERE t.user_id = $1
          AND m.search_vector @@ plainto_tsquery('simple', $2)
        ORDER BY m.created_at DESC
        LIMIT $3 OFFSET $4
      `;
      const countResult = await pool.query(countSql, [userId, query]);
      const total = parseInt(countResult.rows[0]?.total || '0', 10);
      const searchResult = await pool.query(searchSql, [userId, query, limit, offset]);
      return { results: searchResult.rows, total };
    },
    async transaction(callback) {
      await ready;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const txn = createPgTxnHelper(client);
        const result = await callback(txn);
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
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
