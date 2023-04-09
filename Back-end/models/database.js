// sqlite3 pour la base de données
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../..', 'database', 'ChatData.db');

// connexion à la base de données
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
    api_key TEXT NOT NULL UNIQUE,
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

  // création de la table chat_history
  db.run(createChatHistoryTableQuery, err => {
    if (err) {
      console.error(err.message);
    } else {
      console.log('4) Table "chat_history" created or already exists => OK.');
    }
  });
});

module.exports = db;
