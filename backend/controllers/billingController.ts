const Stripe = require('stripe');
const db = require('../models/database');
const logger = require('../logger');

const getStripe = () => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  return new Stripe(key, { apiVersion: '2025-02-24.acacia' });
};

const PRICE_IDS: Record<string, Record<string, string | undefined>> = {
  pro: {
    monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
  },
  team: {
    monthly: process.env.STRIPE_TEAM_MONTHLY_PRICE_ID,
    yearly: process.env.STRIPE_TEAM_YEARLY_PRICE_ID,
  },
};

const getOrCreateStripeCustomer = async (stripe: any, userId: number): Promise<string> => {
  const sub = await new Promise<any>((resolve, reject) => {
    db.get(
      'SELECT stripe_customer_id FROM subscriptions WHERE user_id = ?',
      [userId],
      (err, row) => { if (err) reject(err); else resolve(row); },
    );
  });

  if (sub?.stripe_customer_id) return sub.stripe_customer_id;

  const user = await new Promise<any>((resolve, reject) => {
    db.get(
      'SELECT email, username FROM users WHERE id = ?',
      [userId],
      (err, row) => { if (err) reject(err); else resolve(row); },
    );
  });

  const customer = await stripe.customers.create({
    email: user?.email,
    name: user?.username,
    metadata: { userId: String(userId) },
  });

  await new Promise<void>((resolve, reject) => {
    db.run(
      `INSERT INTO subscriptions (user_id, plan_id, stripe_customer_id, status)
       VALUES (?, 'free', ?, 'active')
       ON CONFLICT(user_id) DO UPDATE SET stripe_customer_id = ?`,
      [userId, customer.id, customer.id],
      (err) => { if (err) reject(err); else resolve(); },
    );
  });

  return customer.id;
};

exports.createCheckoutSession = async (req, res) => {
  const userId = req.user?.id;
  const { plan, interval } = req.body;

  if (!['pro', 'team'].includes(plan)) {
    return res.status(400).json({ error: 'Invalid plan' });
  }
  if (!['monthly', 'yearly'].includes(interval)) {
    return res.status(400).json({ error: 'Invalid interval' });
  }

  const priceId = PRICE_IDS[plan]?.[interval];
  if (!priceId) {
    return res.status(400).json({ error: 'Price not configured for this plan/interval' });
  }

  try {
    const stripe = getStripe();
    const customerId = await getOrCreateStripeCustomer(stripe, userId);
    const appUrl = process.env.APP_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing`,
      metadata: { userId: String(userId), plan, interval },
      subscription_data: { metadata: { userId: String(userId), plan } },
    });

    return res.json({ url: session.url });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to create checkout session');
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
};

exports.createPortalSession = async (req, res) => {
  const userId = req.user?.id;

  try {
    const stripe = getStripe();
    const customerId = await getOrCreateStripeCustomer(stripe, userId);
    const appUrl = process.env.APP_URL || 'http://localhost:3000';

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/settings`,
    });

    return res.json({ url: session.url });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to create portal session');
    return res.status(500).json({ error: 'Failed to create portal session' });
  }
};

const resolvePlanFromPriceId = (stripeSubscription: any): string => {
  const priceId = stripeSubscription.items?.data?.[0]?.price?.id;
  if (!priceId) return stripeSubscription.metadata?.plan || 'free';

  const priceMap: Record<string, string> = {
    [process.env.STRIPE_PRO_MONTHLY_PRICE_ID || '']: 'pro',
    [process.env.STRIPE_PRO_YEARLY_PRICE_ID || '']: 'pro',
    [process.env.STRIPE_TEAM_MONTHLY_PRICE_ID || '']: 'team',
    [process.env.STRIPE_TEAM_YEARLY_PRICE_ID || '']: 'team',
  };

  return priceMap[priceId] || stripeSubscription.metadata?.plan || 'free';
};

const syncSubscription = async (stripeSubscription: any) => {
  const userId = stripeSubscription.metadata?.userId;
  if (!userId) return;

  const planId = resolvePlanFromPriceId(stripeSubscription);
  const status = stripeSubscription.status;
  const periodStart = new Date(stripeSubscription.current_period_start * 1000).toISOString();
  const periodEnd = new Date(stripeSubscription.current_period_end * 1000).toISOString();
  const cancelAtPeriodEnd = stripeSubscription.cancel_at_period_end ? 1 : 0;

  await new Promise<void>((resolve, reject) => {
    db.run(
      `INSERT INTO subscriptions (user_id, plan_id, stripe_subscription_id, status, current_period_start, current_period_end, cancel_at_period_end, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id) DO UPDATE SET
         plan_id = ?,
         stripe_subscription_id = ?,
         status = ?,
         current_period_start = ?,
         current_period_end = ?,
         cancel_at_period_end = ?,
         updated_at = CURRENT_TIMESTAMP`,
      [userId, planId, stripeSubscription.id, status, periodStart, periodEnd, cancelAtPeriodEnd,
        planId, stripeSubscription.id, status, periodStart, periodEnd, cancelAtPeriodEnd],
      (err) => { if (err) reject(err); else resolve(); },
    );
  });
};

exports.handleWebhook = async (req, res) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.warn('STRIPE_WEBHOOK_SECRET not configured');
    return res.status(400).json({ error: 'Webhook not configured' });
  }

  let event: any;
  try {
    const stripe = getStripe();
    const sig = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Webhook signature verification failed');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode === 'subscription' && session.subscription) {
          const stripe = getStripe();
          const sub = await stripe.subscriptions.retrieve(session.subscription);
          await syncSubscription(sub);
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          const stripe = getStripe();
          const sub = await stripe.subscriptions.retrieve(invoice.subscription);
          await syncSubscription(sub);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          await new Promise<void>((resolve, reject) => {
            db.run(
              `UPDATE subscriptions SET status = 'past_due', updated_at = CURRENT_TIMESTAMP
               WHERE stripe_subscription_id = ?`,
              [invoice.subscription],
              (err) => { if (err) reject(err); else resolve(); },
            );
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        await syncSubscription(sub);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const userId = sub.metadata?.userId;
        if (userId) {
          await new Promise<void>((resolve, reject) => {
            db.run(
              `UPDATE subscriptions SET plan_id = 'free', status = 'active', stripe_subscription_id = NULL,
               current_period_start = NULL, current_period_end = NULL, cancel_at_period_end = 0,
               updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`,
              [userId],
              (err) => { if (err) reject(err); else resolve(); },
            );
          });
        }
        break;
      }

      default:
        break;
    }

    return res.json({ received: true });
  } catch (err: any) {
    logger.error({ err: err.message, type: event.type }, 'Webhook handler error');
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
};

exports.getSubscription = async (req, res) => {
  const userId = req.user?.id;

  try {
    const today = new Date().toISOString().slice(0, 10);

    const [row, usageRow, projectsRow, threadsRow] = await Promise.all([
      new Promise<any>((resolve, reject) => {
        db.get(
          `SELECT s.plan_id, s.status, s.stripe_customer_id, s.stripe_subscription_id,
                  s.current_period_start, s.current_period_end, s.cancel_at_period_end,
                  p.name, p.max_projects, p.max_threads_per_project, p.max_messages_per_day,
                  p.max_providers, p.collaboration_enabled, p.local_model_limit
           FROM subscriptions s
           JOIN plans p ON s.plan_id = p.id
           WHERE s.user_id = ?`,
          [userId],
          (err, r) => { if (err) reject(err); else resolve(r); },
        );
      }),
      new Promise<any>((resolve, reject) => {
        db.get(
          'SELECT message_count FROM usage_daily WHERE user_id = ? AND date = ?',
          [userId, today],
          (err, r) => { if (err) reject(err); else resolve(r); },
        );
      }),
      new Promise<any>((resolve, reject) => {
        db.get(
          'SELECT COUNT(*) as count FROM projects WHERE user_id = ?',
          [userId],
          (err, r) => { if (err) reject(err); else resolve(r); },
        );
      }),
      new Promise<any>((resolve, reject) => {
        db.get(
          'SELECT COUNT(*) as count FROM threads WHERE user_id = ?',
          [userId],
          (err, r) => { if (err) reject(err); else resolve(r); },
        );
      }),
    ]);

    const usage = {
      messages_used_today: usageRow ? usageRow.message_count : 0,
      projects_count: projectsRow ? projectsRow.count : 0,
      threads_count: threadsRow ? threadsRow.count : 0,
    };

    if (!row) {
      const freePlan = await new Promise<any>((resolve, reject) => {
        db.get('SELECT * FROM plans WHERE id = ?', ['free'], (err, r) => {
          if (err) reject(err); else resolve(r);
        });
      });
      return res.json({
        plan: 'free',
        status: 'active',
        limits: freePlan || {},
        usage,
      });
    }

    return res.json({
      plan: row.plan_id,
      status: row.status,
      stripe_customer_id: row.stripe_customer_id,
      stripe_subscription_id: row.stripe_subscription_id,
      current_period_start: row.current_period_start,
      current_period_end: row.current_period_end,
      cancel_at_period_end: !!row.cancel_at_period_end,
      limits: {
        max_projects: row.max_projects,
        max_threads_per_project: row.max_threads_per_project,
        max_messages_per_day: row.max_messages_per_day,
        max_providers: row.max_providers,
        collaboration_enabled: !!row.collaboration_enabled,
        local_model_limit: row.local_model_limit,
      },
      usage,
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to get subscription');
    return res.status(500).json({ error: 'Failed to get subscription' });
  }
};

exports.activateLicense = async (req, res) => {
  const userId = req.user?.id;
  const { license_key } = req.body;

  if (!license_key || typeof license_key !== 'string') {
    return res.status(400).json({ error: 'license_key is required' });
  }

  try {
    const license = await new Promise<any>((resolve, reject) => {
      db.get(
        'SELECT * FROM desktop_licenses WHERE license_key = ?',
        [license_key],
        (err, row) => { if (err) reject(err); else resolve(row); },
      );
    });

    if (!license) {
      return res.status(404).json({ error: 'License not found' });
    }

    if (license.activated_at) {
      if (license.user_id && license.user_id !== userId) {
        return res.status(409).json({ error: 'License already activated by another account' });
      }
      if (!license.user_id || license.user_id !== userId) {
        return res.status(409).json({ error: 'Cette licence a déjà été activée' });
      }
    }

    if (license.expires_at && new Date(license.expires_at) < new Date()) {
      return res.status(410).json({ error: 'License has expired' });
    }

    await new Promise<void>((resolve, reject) => {
      db.run(
        `UPDATE desktop_licenses SET user_id = ?, activated_at = CURRENT_TIMESTAMP WHERE license_key = ?`,
        [userId, license_key],
        (err) => { if (err) reject(err); else resolve(); },
      );
    });

    await new Promise<void>((resolve, reject) => {
      db.run(
        `INSERT INTO subscriptions (user_id, plan_id, status, updated_at)
         VALUES (?, ?, 'active', CURRENT_TIMESTAMP)
         ON CONFLICT(user_id) DO UPDATE SET plan_id = ?, status = 'active', updated_at = CURRENT_TIMESTAMP`,
        [userId, license.plan_id, license.plan_id],
        (err) => { if (err) reject(err); else resolve(); },
      );
    });

    return res.json({ success: true, plan: license.plan_id });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to activate license');
    return res.status(500).json({ error: 'Failed to activate license' });
  }
};
