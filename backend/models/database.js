// sqlite3 pour la base de données
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// chemin vers le répertoire de la base de données
const dbDir = path.join(__dirname, '../..', 'database');

// chemin vers le fichier de la base de données
const dbPath = path.join(dbDir, 'ChatData.db');

// vérifiez si le répertoire de la base de données existe, sinon créez-le
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// connexion à la base de données (la créera si elle n'existe pas)
const db = new sqlite3.Database(dbPath, err => {
  if (err) {
    return console.error(err.message);
  }
  console.log('1) Connected to the ChatData.db SQlite database => OK.');
});

// requete de création de la table users
const createUsersTableQuery = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
  );
  `;

// requete de création de la table api_keys
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

// requete de création de la table chat_history
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

// requete de création de la table password_resets
const createPasswordResetsTableQuery = `
  CREATE TABLE IF NOT EXISTS password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    token TEXT NOT NULL,
    expires_at DATETIME NOT NULL
  );
  `;

// requete de création de la table projects
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

// requete de création de la table threads
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

// requete de création de la table messages
const createMessagesTableQuery = `
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    thread_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    provider TEXT,
    model TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (thread_id) REFERENCES threads (id) ON DELETE CASCADE
  );
  `;

// création de la table users
db.serialize(() => {
  db.run(createUsersTableQuery, err => {
    if (err) {
      console.error(err.message);
    } else {
      console.log('2) Table "users" created or already exists => OK.');
    }
  });

  // création de la table api_keys
  db.run(createApiKeysTableQuery, err => {
    if (err) {
      console.error(err.message);
    } else {
      console.log('3) Table "api_keys" created or already exists => OK.');
    }
  });

  // migration légère pour ajouter provider + index unique
  db.all('PRAGMA table_info(api_keys);', (err, columns) => {
    if (err) {
      console.error(err.message);
      return;
    }
    const hasProvider = columns.some(col => col.name === 'provider');
    if (!hasProvider) {
      db.run(
        "ALTER TABLE api_keys ADD COLUMN provider TEXT NOT NULL DEFAULT 'openai';",
        alterErr => {
          if (alterErr) {
            console.error(alterErr.message);
          } else {
            console.log('3.1) Column "provider" added to "api_keys" => OK.');
          }
        },
      );
    }
    db.run(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_user_provider ON api_keys(user_id, provider);',
      indexErr => {
        if (indexErr) {
          console.error(indexErr.message);
        }
      },
    );
  });

  // création de la table chat_history
  db.run(createChatHistoryTableQuery, err => {
    if (err) {
      console.error(err.message);
    } else {
      console.log('4) Table "chat_history" created or already exists => OK.');
    }
  });

  // création de la table password_resets
  db.run(createPasswordResetsTableQuery, err => {
    if (err) {
      console.error(err.message);
    } else {
      console.log('5) Table "password_resets" created or already exists => OK.');
    }
  });

  // création de la table projects
  db.run(createProjectsTableQuery, err => {
    if (err) {
      console.error(err.message);
    } else {
      console.log('6) Table "projects" created or already exists => OK.');
    }
  });

  // création de la table threads
  db.run(createThreadsTableQuery, err => {
    if (err) {
      console.error(err.message);
    } else {
      console.log('7) Table "threads" created or already exists => OK.');
    }
  });

  // création de la table messages
  db.run(createMessagesTableQuery, err => {
    if (err) {
      console.error(err.message);
    } else {
      console.log('8) Table "messages" created or already exists => OK.');
    }
  });

  // migration légère projects (instructions + context_data)
  db.all('PRAGMA table_info(projects);', (err, columns) => {
    if (err) {
      console.error(err.message);
      return;
    }
    const hasInstructions = columns.some(col => col.name === 'instructions');
    const hasContextData = columns.some(col => col.name === 'context_data');
    if (!hasInstructions) {
      db.run("ALTER TABLE projects ADD COLUMN instructions TEXT;", alterErr => {
        if (alterErr) console.error(alterErr.message);
      });
    }
    if (!hasContextData) {
      db.run("ALTER TABLE projects ADD COLUMN context_data TEXT;", alterErr => {
        if (alterErr) console.error(alterErr.message);
      });
    }
  });

  db.run(
    'CREATE INDEX IF NOT EXISTS idx_threads_user ON threads(user_id);',
    indexErr => {
      if (indexErr) {
        console.error(indexErr.message);
      }
    },
  );

  db.run(
    'CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id);',
    indexErr => {
      if (indexErr) {
        console.error(indexErr.message);
      }
    },
  );
});

module.exports = db;
