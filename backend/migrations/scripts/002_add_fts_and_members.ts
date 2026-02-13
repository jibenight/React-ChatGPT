// Add FTS (Full-Text Search) and project_members table.

const run = (db: any, sql: string): Promise<void> =>
  new Promise((resolve, reject) => {
    db.run(sql, (err: any) => { if (err) reject(err); else resolve(); });
  });

exports.up = async (db: any) => {
  const client = db.client;

  if (client === 'sqlite') {
    await run(db, 'CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(content, content_rowid=id);');
    await run(db, `CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN
      INSERT INTO messages_fts(rowid, content) VALUES (new.id, new.content);
    END;`);
    await run(db, `CREATE TRIGGER IF NOT EXISTS messages_ad AFTER DELETE ON messages BEGIN
      INSERT INTO messages_fts(messages_fts, rowid, content) VALUES ('delete', old.id, old.content);
    END;`);
    await run(db, 'INSERT OR IGNORE INTO messages_fts(rowid, content) SELECT id, content FROM messages;');
    await run(db, `CREATE TABLE IF NOT EXISTS project_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer',
      invited_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(project_id, user_id)
    );`);
    await run(db, 'CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);');
    await run(db, 'CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);');
  } else {
    await run(db, `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='search_vector')
      THEN ALTER TABLE messages ADD COLUMN search_vector tsvector; END IF;
    END $$;`);
    await run(db, `UPDATE messages SET search_vector = to_tsvector('simple', coalesce(content, '')) WHERE search_vector IS NULL;`);
    await run(db, 'CREATE INDEX IF NOT EXISTS idx_messages_search_vector ON messages USING GIN(search_vector);');
    await run(db, `CREATE OR REPLACE FUNCTION messages_search_vector_update() RETURNS trigger AS $$
      BEGIN NEW.search_vector := to_tsvector('simple', coalesce(NEW.content, '')); RETURN NEW; END;
    $$ LANGUAGE plpgsql;`);
    await run(db, `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_messages_search_vector')
      THEN CREATE TRIGGER trg_messages_search_vector BEFORE INSERT OR UPDATE OF content ON messages
        FOR EACH ROW EXECUTE FUNCTION messages_search_vector_update(); END IF;
    END $$;`);
    await run(db, `CREATE TABLE IF NOT EXISTS project_members (
      id SERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'viewer',
      invited_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(project_id, user_id)
    );`);
    await run(db, 'CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);');
    await run(db, 'CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);');
  }
};

exports.down = async (db: any) => {
  const client = db.client;
  if (client === 'sqlite') {
    await run(db, 'DROP TRIGGER IF EXISTS messages_ai;');
    await run(db, 'DROP TRIGGER IF EXISTS messages_ad;');
    await run(db, 'DROP TABLE IF EXISTS messages_fts;');
    await run(db, 'DROP TABLE IF EXISTS project_members;');
  } else {
    await run(db, 'DROP TRIGGER IF EXISTS trg_messages_search_vector ON messages;');
    await run(db, 'DROP FUNCTION IF EXISTS messages_search_vector_update();');
    await run(db, 'ALTER TABLE messages DROP COLUMN IF EXISTS search_vector;');
    await run(db, 'DROP TABLE IF EXISTS project_members;');
  }
};
