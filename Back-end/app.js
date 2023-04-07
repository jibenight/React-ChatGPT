// Description: serveur node.js
const express = require('express');
const path = require('path');

// cors pour la gestion des requêtes
const cors = require('cors');
const bodyParser = require('body-parser');

//database
const db = require('./models/database');

// post routes
const auth = require('./routes/auth');

// api routes user
const userApi = require('./routes/users-api');

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
// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, 'dist', 'index.html'));
// });

// routes
app.use('/', auth);

// api
app.use('/api/users', userApi);

// serveur node.js
const PORT = process.env.PORT || 5173;
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
