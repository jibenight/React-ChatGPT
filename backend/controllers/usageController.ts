const db = require('../models/database');

const todayStr = () => new Date().toISOString().slice(0, 10);

exports.incrementDailyUsage = async (userId: number): Promise<void> => {
  const date = todayStr();
  await new Promise<void>((resolve, reject) => {
    db.run(
      `INSERT INTO usage_daily (user_id, date, message_count)
       VALUES (?, ?, 1)
       ON CONFLICT(user_id, date) DO UPDATE SET message_count = message_count + 1`,
      [userId, date],
      (err) => { if (err) reject(err); else resolve(); },
    );
  });
};

const getDailyUsage = async (userId: number): Promise<number> => {
  const date = todayStr();
  const row = await new Promise<any>((resolve, reject) => {
    db.get(
      'SELECT message_count FROM usage_daily WHERE user_id = ? AND date = ?',
      [userId, date],
      (err, r) => { if (err) reject(err); else resolve(r); },
    );
  });
  return row ? row.message_count : 0;
};

exports.getDailyUsage = getDailyUsage;

exports.checkDailyLimit = async (userId: number, planId: string): Promise<{ allowed: boolean; current: number; limit: number | null }> => {
  const plan = await new Promise<any>((resolve, reject) => {
    db.get(
      'SELECT max_messages_per_day FROM plans WHERE id = ?',
      [planId],
      (err, row) => { if (err) reject(err); else resolve(row); },
    );
  });

  const limit: number | null = plan ? plan.max_messages_per_day : null;
  const current = await getDailyUsage(userId);

  if (limit === null || limit === -1) {
    return { allowed: true, current, limit };
  }

  return { allowed: current < limit, current, limit };
};
