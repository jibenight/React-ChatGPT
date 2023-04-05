// sqlite3 pour la base de données
const sqlite3 = require('sqlite3').verbose();

// connexion à la base de données
const db = new sqlite3.Database('ChatData.db', err => {
  if (err) {
    return console.error(err.message);
  }
  console.log('1) Connected to the ChatData.db SQlite database => OK.');
});

// requete de création de la table users
const createTableQuery = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
  );
  `;

// création de la table users
db.serialize(() => {
  db.run(createTableQuery, err => {
    if (err) {
      console.error(err.message);
    } else {
      console.log('2) Table "users" created or already exists => OK.');
    }
  });
});

module.exports = db;
