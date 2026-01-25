require('dotenv').config();

// Description: serveur node.js
const express = require('express');
const path = require('path');

// cors pour la gestion des requêtes
const cors = require('cors');

//database
const db = require('./models/database');

// post routes
const auth = require('./routes/auth');

// api routes user
const userApi = require('./routes/users-api');
const projectsApi = require('./routes/projects');
const threadsApi = require('./routes/threads');

// api routes openai
const openaiApiRoute = require('./routes/openaiApi');

// api routes chat (multi-providers)
const chatApiRoute = require('./routes/chatApi');

// logger pour le serveur
const morgan = require('morgan');

// création de l'application express
const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
//app.use(express.static(path.join(__dirname, '/dist')));
app.use(morgan('tiny'));

// render index.html on the route '/'
// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, 'dist', 'index.html'));
// });

// routes
app.use('/', auth);

// api
app.use('/', userApi);
app.use('/', projectsApi);
app.use('/', threadsApi);

// Utilisez le routeur OpenAI API
app.use('/', openaiApiRoute);

// Utilisez le routeur Chat API (pour /api/chat/message)
app.use('/api/chat', chatApiRoute);

// serveur node.js
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
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
