import { Request, Response, NextFunction } from 'express';

const db = require('../models/database');

const FALLBACK_FREE_PLAN = {
  plan_id: 'free',
  max_projects: 3,
  max_threads_per_project: 5,
  max_messages_per_day: 50,
  max_providers: 1,
  collaboration_enabled: 0,
};

const getPlanData = async (userId: number, reqUserPlan: any): Promise<typeof FALLBACK_FREE_PLAN> => {
  // Réutiliser req.user.plan si déjà peuplé par isAuthenticated
  if (reqUserPlan) return reqUserPlan;

  const freePlan = await new Promise<any>((resolve, reject) => {
    db.get('SELECT * FROM plans WHERE id = ?', ['free'], (err, r) => {
      if (err) reject(err); else resolve(r);
    });
  });

  return freePlan || FALLBACK_FREE_PLAN;
};

const enforcePlanLimits = (feature: string) => async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const plan = await getPlanData(userId, (req as any).user?.plan);
    const planId = plan.plan_id || 'free';

    switch (feature) {
      case 'message': {
        const limit = plan.max_messages_per_day;
        if (limit === null || limit === -1) return next();

        const today = new Date().toISOString().slice(0, 10);
        const usage = await new Promise<any>((resolve, reject) => {
          db.get(
            'SELECT message_count FROM usage_daily WHERE user_id = ? AND date = ?',
            [userId, today],
            (err, r) => { if (err) reject(err); else resolve(r); },
          );
        });
        const current = usage ? usage.message_count : 0;

        if (current >= limit) {
          return res.status(403).json({
            error: 'plan_limit_exceeded',
            limit,
            current,
            allowed: limit,
            plan: planId,
            upgrade_url: '/pricing',
          });
        }
        return next();
      }

      case 'project': {
        const limit = plan.max_projects;
        if (limit === null || limit === -1) return next();

        const count = await new Promise<any>((resolve, reject) => {
          db.get(
            'SELECT COUNT(*) as cnt FROM projects WHERE user_id = ?',
            [userId],
            (err, r) => { if (err) reject(err); else resolve(r); },
          );
        });
        const current = count ? count.cnt : 0;

        if (current >= limit) {
          return res.status(403).json({
            error: 'plan_limit_exceeded',
            limit,
            current,
            allowed: limit,
            plan: planId,
            upgrade_url: '/pricing',
          });
        }
        return next();
      }

      case 'thread': {
        const limit = plan.max_threads_per_project;
        if (limit === null || limit === -1) return next();

        const projectId = req.body?.projectId || req.params?.projectId;
        if (!projectId) return next();

        const count = await new Promise<any>((resolve, reject) => {
          db.get(
            'SELECT COUNT(*) as cnt FROM threads WHERE project_id = ? AND user_id = ?',
            [projectId, userId],
            (err, r) => { if (err) reject(err); else resolve(r); },
          );
        });
        const current = count ? count.cnt : 0;

        if (current >= limit) {
          return res.status(403).json({
            error: 'plan_limit_exceeded',
            limit,
            current,
            allowed: limit,
            plan: planId,
            upgrade_url: '/pricing',
          });
        }
        return next();
      }

      case 'collaboration': {
        if (!plan.collaboration_enabled) {
          return res.status(403).json({
            error: 'plan_limit_exceeded',
            limit: 0,
            current: 1,
            allowed: 0,
            plan: planId,
            upgrade_url: '/pricing',
          });
        }
        return next();
      }

      case 'provider': {
        const limit = plan.max_providers;
        if (limit === null || limit === -1) return next();

        const count = await new Promise<any>((resolve, reject) => {
          db.get(
            'SELECT COUNT(DISTINCT provider) as cnt FROM api_keys WHERE user_id = ?',
            [userId],
            (err, r) => { if (err) reject(err); else resolve(r); },
          );
        });
        const current = count ? count.cnt : 0;

        if (current >= limit) {
          return res.status(403).json({
            error: 'plan_limit_exceeded',
            limit,
            current,
            allowed: limit,
            plan: planId,
            upgrade_url: '/pricing',
          });
        }
        return next();
      }

      default:
        return next();
    }
  } catch (err: any) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { enforcePlanLimits };
