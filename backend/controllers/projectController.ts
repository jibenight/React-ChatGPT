const db = require('../models/database');
const logger = require('../logger');

const pickProjectPayload = payload => ({
  name: payload.name?.trim(),
  description: payload.description?.trim() || null,
  instructions: payload.instructions?.trim() || null,
  context_data: payload.context_data?.trim() || null,
});

// ── Helper: get the role of a user for a given project ───────────────
const getUserRole = (projectId, userId): Promise<string | null> => {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT role FROM project_members WHERE project_id = ? AND user_id = ?`,
      [projectId, userId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row ? row.role : null);
      },
    );
  });
};

// ── List projects (owned + shared) ──────────────────────────────────
exports.listProjects = async (req, res) => {
  const userId = req.user.id;
  try {
    const rows = await new Promise<any[]>((resolve, reject) => {
      db.all(
        `SELECT p.id, p.name, p.description, p.instructions, p.context_data,
                p.created_at, p.updated_at, pm.role AS member_role
         FROM projects p
         INNER JOIN project_members pm ON pm.project_id = p.id
         WHERE pm.user_id = ?
         ORDER BY p.updated_at DESC`,
        [userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        },
      );
    });
    res.status(200).json(rows);
  } catch (err) {
    logger.error({ err }, 'listProjects failed');
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── Get single project (owner or member) ────────────────────────────
exports.getProject = async (req, res) => {
  const userId = req.user.id;
  const { projectId } = req.params;
  try {
    const row = await new Promise<any>((resolve, reject) => {
      db.get(
        `SELECT p.id, p.name, p.description, p.instructions, p.context_data,
                p.created_at, p.updated_at, pm.role AS member_role
         FROM projects p
         INNER JOIN project_members pm ON pm.project_id = p.id
         WHERE p.id = ? AND pm.user_id = ?`,
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
    logger.error({ err }, 'getProject failed');
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── Create project + auto-insert creator as owner ───────────────────
exports.createProject = async (req, res) => {
  const userId = req.user.id;
  const payload = pickProjectPayload(req.body);
  if (!payload.name) {
    return res.status(400).json({ error: 'Project name is required' });
  }
  try {
    const projectId = await db.transaction(async txn => {
      const result = await new Promise<any>((resolve, reject) => {
        txn.run(
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

      const newProjectId = result.lastID;

      await new Promise<void>((resolve, reject) => {
        txn.run(
          `INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, 'owner')`,
          [newProjectId, userId],
          function(err) {
            if (err) reject(err);
            else resolve();
          },
        );
      });

      return newProjectId;
    });

    res.status(201).json({
      id: projectId,
      ...payload,
      member_role: 'owner',
    });
  } catch (err) {
    logger.error({ err }, 'createProject failed');
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── Update project (owner or editor) ────────────────────────────────
exports.updateProject = async (req, res) => {
  const userId = req.user.id;
  const { projectId } = req.params;
  try {
    const role = await getUserRole(projectId, userId);
    if (!role) {
      return res.status(404).json({ error: 'Project not found' });
    }
    if (role !== 'owner' && role !== 'editor') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const payload = pickProjectPayload(req.body);
    const updates = Object.entries(payload).filter(([, value]) => value !== undefined);
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    const setClause = updates.map(([key]) => `${key} = ?`).join(', ');
    const values = updates.map(([, value]) => value);

    await new Promise<void>((resolve, reject) => {
      db.run(
        `UPDATE projects
         SET ${setClause}, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [...values, projectId],
        function(err) {
          if (err) reject(err);
          else resolve();
        },
      );
    });
    res.status(200).json({ message: 'Project updated' });
  } catch (err) {
    logger.error({ err }, 'updateProject failed');
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── Delete project (owner only) ─────────────────────────────────────
exports.deleteProject = async (req, res) => {
  const userId = req.user.id;
  const { projectId } = req.params;
  try {
    const role = await getUserRole(projectId, userId);
    if (!role) {
      return res.status(404).json({ error: 'Project not found' });
    }
    if (role !== 'owner') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    await new Promise<void>((resolve, reject) => {
      db.run(
        'DELETE FROM projects WHERE id = ?',
        [projectId],
        function(err) {
          if (err) reject(err);
          else resolve();
        },
      );
    });
    res.status(200).json({ message: 'Project deleted' });
  } catch (err) {
    logger.error({ err }, 'deleteProject failed');
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── List members of a project ───────────────────────────────────────
exports.getMembers = async (req, res) => {
  const userId = req.user.id;
  const { projectId } = req.params;
  try {
    // Check user is a member
    const role = await getUserRole(projectId, userId);
    if (!role) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const rows = await new Promise<any[]>((resolve, reject) => {
      db.all(
        `SELECT u.id AS user_id, u.username, u.email, pm.role, pm.invited_at
         FROM project_members pm
         INNER JOIN users u ON u.id = pm.user_id
         WHERE pm.project_id = ?
         ORDER BY pm.invited_at ASC`,
        [projectId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        },
      );
    });
    res.status(200).json(rows);
  } catch (err) {
    logger.error({ err }, 'getMembers failed');
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── Add a member (owner only) ───────────────────────────────────────
exports.addMember = async (req, res) => {
  const userId = req.user.id;
  const { projectId } = req.params;
  const { email, role } = req.body;
  try {
    // Check requester is owner
    const callerRole = await getUserRole(projectId, userId);
    if (!callerRole) {
      return res.status(404).json({ error: 'Project not found' });
    }
    if (callerRole !== 'owner') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Find user by email
    const targetUser = await new Promise<any>((resolve, reject) => {
      db.get(
        'SELECT id, username, email FROM users WHERE email = ?',
        [email],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        },
      );
    });
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Cannot add yourself
    if (targetUser.id === userId) {
      return res.status(400).json({ error: 'Cannot add yourself as member' });
    }

    // Check if already a member
    const existing = await getUserRole(projectId, targetUser.id);
    if (existing) {
      return res.status(409).json({ error: 'User is already a member' });
    }

    await new Promise<void>((resolve, reject) => {
      db.run(
        'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)',
        [projectId, targetUser.id, role],
        function(err) {
          if (err) reject(err);
          else resolve();
        },
      );
    });

    res.status(201).json({
      user_id: targetUser.id,
      username: targetUser.username,
      email: targetUser.email,
      role,
    });
  } catch (err) {
    logger.error({ err }, 'addMember failed');
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── Update member role (owner only) ─────────────────────────────────
exports.updateMemberRole = async (req, res) => {
  const userId = req.user.id;
  const { projectId, userId: targetUserId } = req.params;
  const { role } = req.body;
  try {
    const callerRole = await getUserRole(projectId, userId);
    if (!callerRole) {
      return res.status(404).json({ error: 'Project not found' });
    }
    if (callerRole !== 'owner') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Cannot change own role
    if (Number(targetUserId) === userId) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    const targetRole = await getUserRole(projectId, Number(targetUserId));
    if (!targetRole) {
      return res.status(404).json({ error: 'Member not found' });
    }

    await new Promise<void>((resolve, reject) => {
      db.run(
        'UPDATE project_members SET role = ? WHERE project_id = ? AND user_id = ?',
        [role, projectId, Number(targetUserId)],
        function(err) {
          if (err) reject(err);
          else resolve();
        },
      );
    });

    res.status(200).json({ message: 'Member role updated' });
  } catch (err) {
    logger.error({ err }, 'updateMemberRole failed');
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ── Remove member (owner only) ──────────────────────────────────────
exports.removeMember = async (req, res) => {
  const userId = req.user.id;
  const { projectId, userId: targetUserId } = req.params;
  try {
    const callerRole = await getUserRole(projectId, userId);
    if (!callerRole) {
      return res.status(404).json({ error: 'Project not found' });
    }
    if (callerRole !== 'owner') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Cannot remove yourself (owner)
    if (Number(targetUserId) === userId) {
      return res.status(400).json({ error: 'Cannot remove yourself from the project' });
    }

    const targetRole = await getUserRole(projectId, Number(targetUserId));
    if (!targetRole) {
      return res.status(404).json({ error: 'Member not found' });
    }

    await new Promise<void>((resolve, reject) => {
      db.run(
        'DELETE FROM project_members WHERE project_id = ? AND user_id = ?',
        [projectId, Number(targetUserId)],
        function(err) {
          if (err) reject(err);
          else resolve();
        },
      );
    });

    res.status(200).json({ message: 'Member removed' });
  } catch (err) {
    logger.error({ err }, 'removeMember failed');
    res.status(500).json({ error: 'Internal server error' });
  }
};
