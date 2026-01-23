const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '../..', 'database');
const dbPath = path.join(dbDir, 'ChatData.db');

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, err => {
  if (err) {
    return console.error(err.message);
  }
  console.log('Connected to the ChatData.db SQlite database.');
});

const createUsersTableQuery = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
  );
`;

const createApiKeysTableQuery = `
  CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    provider TEXT NOT NULL DEFAULT 'openai',
    api_key TEXT NOT NULL,
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

db.serialize(() => {
  db.run(createUsersTableQuery);
  db.run(createApiKeysTableQuery);
  db.run(createChatHistoryTableQuery);
  db.run(createPasswordResetsTableQuery);

  // Migration check for provider column
  db.all("PRAGMA table_info(api_keys);", (err, rows) => {
    if (!err) {
      const providerExists = rows.some(row => row.name === 'provider');
      if (!providerExists) {
        console.log("Adding 'provider' column to api_keys table...");
        db.run("ALTER TABLE api_keys ADD COLUMN provider TEXT NOT NULL DEFAULT 'openai';", err => {
            if(err) console.error("Migration failed:", err.message);
        });
      }
    }
  });
});

module.exports = db;
