// Description: serveur node.js
const express = require('express');
const path = require('path');

// sqlite3 pour la base de données
const sqlite3 = require('sqlite3').verbose();

// cors pour la gestion des requêtes
const cors = require('cors');
const bodyParser = require('body-parser');

// bcrypt pour le hashage des mots de passe
const bcrypt = require('bcrypt');
const saltRounds = 10;

// logger pour le serveur
const morgan = require('morgan');

// création de l'application express
const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '/dist')));
app.use(morgan('tiny'));

// render index.html on the route '/'
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

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

// création d'un utilisateur
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  // vérification de l'existence de l'utilisateur
  db.run(
    'INSERT INTO users (username, email, password) VALUES (?,?,?)',
    [username, email, hashedPassword],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res
        .status(201)
        .json({ message: 'User registered successfully', userId: this.lastID });
    }
  );
});

// connexion d'un utilisateur
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  db.get(
    'SELECT * FROM users WHERE username = ?',
    [username],
    async (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!row) {
        return res.status(404).json({ error: 'User not found' });
      }

      const match = await bcrypt.compare(password, row.password);
      if (match) {
        res.status(200).json({ message: 'Login successful', userId: row.id });
      } else {
        res.status(401).json({ error: 'Incorrect password' });
      }
    }
  );
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// terminated process
process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Server terminated');
    // close database connection
    db.close();
    console.log('3) Close the database connection => OK.');
  });
});
