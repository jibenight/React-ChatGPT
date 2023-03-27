const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const saltRounds = 10;

const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// connexion à la base de données
const db = new sqlite3.Database(':memory:', err => {
  if (err) {
    return console.error(err.message);
  }
  console.log('Connected to the in-memory SQlite database.');
});

// création de la table users
db.serialize(() => {
  db.run(
    'CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, password TEXT)'
  );
});

// création d'un utilisateur
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  // vérification de l'existence de l'utilisateur
  db.run(
    'INSERT INTO users (username, password) VALUES (?,?)',
    [username, hashedPassword],
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
  console.log(`Server running on port ${PORT}`);
});
