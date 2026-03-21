use rusqlite::{Connection, Result as SqliteResult};

/// Initialize the database: create tables, indexes, FTS5, triggers, and default user.
pub fn initialize(conn: &Connection) -> SqliteResult<()> {
    conn.execute_batch("PRAGMA foreign_keys = ON;")?;
    conn.execute_batch("PRAGMA journal_mode = WAL;")?;

    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE
        );

        CREATE TABLE IF NOT EXISTS api_keys (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            provider TEXT NOT NULL DEFAULT 'openai',
            api_key TEXT NOT NULL,
            UNIQUE (user_id, provider),
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        );

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
        ",
    )?;

    // Local GGUF models
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS local_models (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            filename TEXT NOT NULL UNIQUE,
            file_path TEXT NOT NULL,
            size_bytes INTEGER NOT NULL DEFAULT 0,
            imported_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        ",
    )?;

    // Indexes
    conn.execute_batch(
        "
        CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_user_provider ON api_keys(user_id, provider);
        CREATE INDEX IF NOT EXISTS idx_threads_user ON threads(user_id);
        CREATE INDEX IF NOT EXISTS idx_threads_user_last_msg ON threads(user_id, last_message_at DESC);
        CREATE INDEX IF NOT EXISTS idx_threads_project ON threads(project_id);
        CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id);
        CREATE INDEX IF NOT EXISTS idx_messages_thread_created ON messages(thread_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
        CREATE INDEX IF NOT EXISTS idx_local_models_name ON local_models(name);
        ",
    )?;

    // FTS5 for full-text search on messages
    conn.execute_batch(
        "
        CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(content, content_rowid=id);

        CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN
            INSERT INTO messages_fts(rowid, content) VALUES (new.id, new.content);
        END;

        CREATE TRIGGER IF NOT EXISTS messages_ad AFTER DELETE ON messages BEGIN
            INSERT INTO messages_fts(messages_fts, rowid, content) VALUES ('delete', old.id, old.content);
        END;

        INSERT OR IGNORE INTO messages_fts(rowid, content) SELECT id, content FROM messages;
        ",
    )?;

    // Default local user (auto-created on first launch)
    conn.execute(
        "INSERT OR IGNORE INTO users (id, username, email) VALUES (1, 'Utilisateur', 'local@desktop')",
        [],
    )?;

    Ok(())
}

/// Get the database path in the app data directory.
pub fn db_path() -> std::path::PathBuf {
    let data_dir = dirs::data_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("React ChatGPT");
    std::fs::create_dir_all(&data_dir).ok();
    data_dir.join("ChatData.db")
}
