import { apiGet, apiPost } from '$lib/api';
import { i18n } from '$lib/i18n';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export type PlanName = 'free' | 'pro' | 'team';

export interface PlanLimits {
  messagesPerDay: number | null;
  projectsMax: number | null;
  threadsMax: number | null;
  providers: string[] | null;
  collaborate: boolean;
}

export interface Subscription {
  plan: PlanName;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  messagesUsedToday: number;
  projectsCount: number;
  threadsCount: number;
}

const PLAN_LIMITS: Record<PlanName, PlanLimits> = {
  free: {
    messagesPerDay: 50,
    projectsMax: 3,
    threadsMax: 5,
    providers: ['groq'],
    collaborate: false,
  },
  pro: {
    messagesPerDay: null,
    projectsMax: null,
    threadsMax: null,
    providers: null,
    collaborate: false,
  },
  team: {
    messagesPerDay: null,
    projectsMax: null,
    threadsMax: null,
    providers: null,
    collaborate: true,
  },
};

const PLAN_DISPLAY: Record<PlanName, string> = {
  free: 'Free',
  pro: 'Pro',
  team: 'Team',
};

let _planName = $state<PlanName>('free');
let _limits = $state<PlanLimits>(PLAN_LIMITS.free);
let _subscription = $state<Subscription | null>(null);
let _loading = $state(false);
let _showUpgrade = $state(false);
let _upgradeReason = $state('');

export const planStore = {
  get planName() { return _planName; },
  get planDisplay() { return PLAN_DISPLAY[_planName]; },
  get limits() { return _limits; },
  get subscription() { return _subscription; },
  get loading() { return _loading; },
  get showUpgrade() { return _showUpgrade; },
  get upgradeReason() { return _upgradeReason; },

  openUpgrade(reason: string) {
    _showUpgrade = true;
    _upgradeReason = reason;
  },

  closeUpgrade() {
    _showUpgrade = false;
    _upgradeReason = '';
  },

  async fetchPlan() {
    if (isTauri) {
      // Tauri desktop : pas d'abonnement, illimité
      _planName = 'pro';
      _limits = PLAN_LIMITS.pro;
      _subscription = {
        plan: 'pro',
        status: 'active',
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        messagesUsedToday: 0,
        projectsCount: 0,
        threadsCount: 0,
      };
      return;
    }

    _loading = true;
    try {
      const raw: any = await apiGet('/api/billing/subscription');
      const planName: PlanName = raw.plan || 'free';
      _planName = planName;
      _limits = PLAN_LIMITS[planName] ?? PLAN_LIMITS.free;
      _subscription = {
        plan: planName,
        status: raw.status || 'active',
        currentPeriodEnd: raw.currentPeriodEnd ?? raw.current_period_end ?? null,
        cancelAtPeriodEnd: raw.cancelAtPeriodEnd ?? raw.cancel_at_period_end ?? false,
        messagesUsedToday: raw.messagesUsedToday ?? raw.messages_used_today ?? 0,
        projectsCount: raw.projectsCount ?? raw.projects_count ?? 0,
        threadsCount: raw.threadsCount ?? raw.threads_count ?? 0,
      };
    } catch {
      // Par défaut : plan free en cas d'erreur
      _planName = 'free';
      _limits = PLAN_LIMITS.free;
      _subscription = null;
    } finally {
      _loading = false;
    }
  },

  get messagesRemaining(): number | null {
    if (!_limits.messagesPerDay) return null;
    const used = _subscription?.messagesUsedToday ?? 0;
    return Math.max(0, _limits.messagesPerDay - used);
  },

  canSendMessage(): boolean {
    const rem = this.messagesRemaining;
    return rem === null || rem > 0;
  },

  canCreateProject(): boolean {
    if (!_limits.projectsMax) return true;
    return (_subscription?.projectsCount ?? 0) < _limits.projectsMax;
  },

  canCreateThread(): boolean {
    if (!_limits.threadsMax) return true;
    return (_subscription?.threadsCount ?? 0) < _limits.threadsMax;
  },

  canUseProvider(provider: string): boolean {
    if (!_limits.providers) return true;
    return _limits.providers.includes(provider);
  },

  /**
   * Vérifie si la fonctionnalité est accessible.
   * Ouvre la modale d'upgrade si la limite est atteinte.
   * Retourne true si l'action peut continuer, false sinon.
   */
  checkAndPrompt(feature: string): boolean {
    if (feature === 'message' && !this.canSendMessage()) {
      this.openUpgrade(
        i18n.t('planLimitMessages', { count: String(_limits.messagesPerDay ?? 0) }),
      );
      return false;
    }
    if (feature === 'project' && !this.canCreateProject()) {
      this.openUpgrade(
        i18n.t('planLimitProjects', { count: String(_limits.projectsMax ?? 0) }),
      );
      return false;
    }
    if (feature === 'thread' && !this.canCreateThread()) {
      this.openUpgrade(
        i18n.t('planLimitThreads', { count: String(_limits.threadsMax ?? 0) }),
      );
      return false;
    }
    return true;
  },

  async createCheckoutSession(plan: string, interval: 'monthly' | 'yearly'): Promise<string | null> {
    try {
      const data: any = await apiPost('/api/billing/create-checkout-session', { plan, interval });
      return data?.url ?? null;
    } catch {
      return null;
    }
  },

  async createPortalSession(): Promise<string | null> {
    try {
      const data: any = await apiPost('/api/billing/create-portal-session');
      return data?.url ?? null;
    } catch {
      return null;
    }
  },
};
