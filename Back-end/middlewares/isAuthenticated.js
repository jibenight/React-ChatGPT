const jwt = require('jsonwebtoken');
const secretKey = 'your-secret-key'; // Utilisez la même clé secrète que celle définie dans auth.js

const isAuthenticated = (req, res, next) => {
  const token = req.headers['authorization'];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = { id: decoded.id };
    next();
  });
};

module.exports = isAuthenticated;
