const { v4: uuidv4 } = require('uuid');
const db = require('../models/database');

exports.listThreads = async (req, res) => {
  const userId = req.user.id;
  try {
    const rows = await new Promise<any[]>((resolve, reject) => {
      db.all(
        `SELECT id, project_id, title, created_at, updated_at, last_message_at
         FROM threads
         WHERE user_id = ?
         ORDER BY last_message_at DESC, updated_at DESC`,
        [userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        },
      );
    });
    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.listProjectThreads = async (req, res) => {
  const userId = req.user.id;
  const { projectId } = req.params;
  try {
    const rows = await new Promise<any[]>((resolve, reject) => {
      db.all(
        `SELECT id, title, created_at, updated_at, last_message_at
         FROM threads
         WHERE user_id = ? AND project_id = ?
         ORDER BY last_message_at DESC, updated_at DESC`,
        [userId, projectId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        },
      );
    });
    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createThread = async (req, res) => {
  const userId = req.user.id;
  const { projectId } = req.params;
  const { id, title } = req.body || {};
  const threadId = id || uuidv4();
  try {
      await new Promise<void>((resolve, reject) => {
      db.run(
        `INSERT INTO threads (id, user_id, project_id, title)
         VALUES (?, ?, ?, ?)`,
        [threadId, userId, projectId || null, title || null],
        err => {
          if (err) reject(err);
          else resolve();
        },
      );
    });
    res.status(201).json({ id: threadId, title: title || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createThreadRoot = async (req, res) => {
  const userId = req.user.id;
  const { id, title, projectId } = req.body || {};
  const threadId = id || uuidv4();
  try {
      await new Promise<void>((resolve, reject) => {
      db.run(
        `INSERT INTO threads (id, user_id, project_id, title)
         VALUES (?, ?, ?, ?)`,
        [threadId, userId, projectId || null, title || null],
        err => {
          if (err) reject(err);
          else resolve();
        },
      );
    });
    res.status(201).json({ id: threadId, title: title || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getThreadMessages = async (req, res) => {
  const userId = req.user.id;
  const { threadId } = req.params;
  const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
  try {
    const thread = await new Promise<any>((resolve, reject) => {
      db.get(
        'SELECT id FROM threads WHERE id = ? AND user_id = ?',
        [threadId, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        },
      );
    });
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }
    const rows = await new Promise<any[]>((resolve, reject) => {
      db.all(
        `SELECT id, role, content, attachments, provider, model, created_at
         FROM messages
         WHERE thread_id = ?
         ORDER BY id ASC
         LIMIT ?`,
        [threadId, limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        },
      );
    });
    const withAttachments = rows.map(row => {
      let parsedAttachments = [];
      if (row.attachments) {
        try {
          const parsed = JSON.parse(row.attachments);
          parsedAttachments = Array.isArray(parsed) ? parsed : [];
        } catch {
          parsedAttachments = [];
        }
      }
      return {
        ...row,
        attachments: parsedAttachments,
      };
    });
    res.status(200).json(withAttachments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteThread = async (req, res) => {
  const userId = req.user.id;
  const { threadId } = req.params;
  try {
      await new Promise<void>((resolve, reject) => {
      db.run(
        'DELETE FROM threads WHERE id = ? AND user_id = ?',
        [threadId, userId],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        },
      );
    });
    res.status(200).json({ message: 'Thread deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateThread = async (req, res) => {
  const userId = req.user.id;
  const { threadId } = req.params;
  const { title, projectId } = req.body || {};
  const hasTitle = typeof title !== 'undefined';
  const hasProjectId = typeof projectId !== 'undefined';
  const trimmedTitle = typeof title === 'string' ? title.trim() : '';
  const nextTitle = hasTitle
    ? trimmedTitle.length > 0
      ? trimmedTitle
      : null
    : undefined;
  let nextProjectId;
  if (hasProjectId) {
    if (projectId === null || projectId === '') {
      nextProjectId = null;
    } else {
      const parsed = Number(projectId);
      nextProjectId = Number.isNaN(parsed) ? null : parsed;
    }
  }

  try {
    if (!hasTitle && !hasProjectId) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    const thread = await new Promise<any>((resolve, reject) => {
      db.get(
        'SELECT id, title, project_id FROM threads WHERE id = ? AND user_id = ?',
        [threadId, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        },
      );
    });

    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    const updatedTitle = hasTitle ? nextTitle : thread.title;
    const updatedProjectId = hasProjectId ? nextProjectId : thread.project_id;

      await new Promise<void>((resolve, reject) => {
      db.run(
        `UPDATE threads
         SET title = ?, project_id = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND user_id = ?`,
        [updatedTitle, updatedProjectId, threadId, userId],
        err => {
          if (err) reject(err);
          else resolve();
        },
      );
    });

    res.status(200).json({
      id: threadId,
      title: updatedTitle,
      project_id: updatedProjectId,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
