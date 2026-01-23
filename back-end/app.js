require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const db = require('./models/database');

const authRoutes = require('./routes/auth');
const userApiRoutes = require('./routes/users-api');
const chatApiRoutes = require('./routes/chatApi');

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(morgan('tiny'));

// Mount routes
app.use('/', authRoutes);
app.use('/', userApiRoutes);
app.use('/api/chat', chatApiRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

process.on('SIGTERM', () => {
  db.close();
});
// End of file
