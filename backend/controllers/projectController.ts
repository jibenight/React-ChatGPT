const db = require('../models/database');

const pickProjectPayload = payload => ({
  name: payload.name?.trim(),
  description: payload.description?.trim() || null,
  instructions: payload.instructions?.trim() || null,
  context_data: payload.context_data?.trim() || null,
});

exports.listProjects = async (req, res) => {
  const userId = req.user.id;
  try {
    const rows = await new Promise<any[]>((resolve, reject) => {
      db.all(
        `SELECT id, name, description, instructions, context_data, created_at, updated_at
         FROM projects
         WHERE user_id = ?
         ORDER BY updated_at DESC`,
        [userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        },
      );
    });
    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getProject = async (req, res) => {
  const userId = req.user.id;
  const { projectId } = req.params;
  try {
    const row = await new Promise<any>((resolve, reject) => {
      db.get(
        `SELECT id, name, description, instructions, context_data, created_at, updated_at
         FROM projects
         WHERE id = ? AND user_id = ?`,
        [projectId, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        },
      );
    });
    if (!row) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.status(200).json(row);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.createProject = async (req, res) => {
  const userId = req.user.id;
  const payload = pickProjectPayload(req.body);
  if (!payload.name) {
    return res.status(400).json({ error: 'Project name is required' });
  }
  try {
    const result = await new Promise<any>((resolve, reject) => {
      db.run(
        `INSERT INTO projects (user_id, name, description, instructions, context_data)
         VALUES (?, ?, ?, ?, ?)`,
        [
          userId,
          payload.name,
          payload.description,
          payload.instructions,
          payload.context_data,
        ],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        },
      );
    });
    res.status(201).json({
      id: result.lastID,
      ...payload,
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.updateProject = async (req, res) => {
  const userId = req.user.id;
  const { projectId } = req.params;
  const payload = pickProjectPayload(req.body);
  const updates = Object.entries(payload).filter(([, value]) => value !== undefined);
  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }
  const setClause = updates.map(([key]) => `${key} = ?`).join(', ');
  const values = updates.map(([, value]) => value);
  try {
    await new Promise<void>((resolve, reject) => {
      db.run(
        `UPDATE projects
         SET ${setClause}, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND user_id = ?`,
        [...values, projectId, userId],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        },
      );
    });
    res.status(200).json({ message: 'Project updated' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.deleteProject = async (req, res) => {
  const userId = req.user.id;
  const { projectId } = req.params;
  try {
    await new Promise<void>((resolve, reject) => {
      db.run(
        'DELETE FROM projects WHERE id = ? AND user_id = ?',
        [projectId, userId],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        },
      );
    });
    res.status(200).json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
