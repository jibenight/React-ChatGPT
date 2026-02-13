const db = require('../models/database');
const logger = require('../logger');

exports.search = async (req, res) => {
  const userId = req.user.id;
  const { q, limit: rawLimit, offset: rawOffset } = req.query;

  const query = String(q || '').trim();
  const limit = Math.min(Math.max(parseInt(rawLimit || '20', 10), 1), 50);
  const offset = Math.max(parseInt(rawOffset || '0', 10), 0);

  try {
    const { results, total } = await db.searchMessages(userId, query, limit, offset);
    res.status(200).json({ results, total });
  } catch (err) {
    logger.error({ err: err?.message || err }, 'Search query failed');
    res.status(500).json({ error: 'Internal server error' });
  }
};
