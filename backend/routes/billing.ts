import express from 'express';

const router = express.Router();
const billingController = require('../controllers/billingController');
const isAuthenticated = require('../middlewares/isAuthenticated');
const { z } = require('zod');

const createCheckoutSchema = z.object({
  plan: z.enum(['pro', 'team']),
  interval: z.enum(['monthly', 'yearly']),
});

const activateLicenseSchema = z.object({
  license_key: z.string().min(1),
});

const validateBody = (schema: any) => (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid payload', details: result.error.errors });
  }
  req.body = result.data;
  return next();
};

// Stripe webhook — raw body, no auth, no CSRF
router.post('/api/billing/webhook', billingController.handleWebhook);

// Authenticated billing routes
router.post('/api/billing/create-checkout-session', isAuthenticated, validateBody(createCheckoutSchema), billingController.createCheckoutSession);
router.post('/api/billing/create-portal-session', isAuthenticated, billingController.createPortalSession);
router.get('/api/billing/subscription', isAuthenticated, billingController.getSubscription);
router.post('/api/billing/activate-license', isAuthenticated, validateBody(activateLicenseSchema), billingController.activateLicense);

export default router;
