import { create } from 'zustand';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export type PlanName = 'free' | 'pro' | 'team';

export interface Plan {
  name: PlanName;
  displayName: string;
}

export interface PlanLimits {
  messagesPerDay: number | null;
  projectsMax: number | null;
  threadsMax: number | null;
  providers: string[] | null; // null = all
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

interface PlanState {
  plan: Plan | null;
  limits: PlanLimits | null;
  subscription: Subscription | null;
  loading: boolean;
  fetchPlan: () => Promise<void>;
  showUpgradeModal: boolean;
  upgradeReason: string;
  openUpgrade: (reason: string) => void;
  closeUpgrade: () => void;
}

const fetchSubscriptionData = async (): Promise<Subscription> => {
  if (isTauri) {
    // Tauri desktop: no subscription, unlimited
    return {
      plan: 'pro',
      status: 'active',
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      messagesUsedToday: 0,
      projectsCount: 0,
      threadsCount: 0,
    };
  }
  const response = await fetch('/api/billing/subscription', {
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to fetch subscription');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any = await response.json();
  // Normalize snake_case or camelCase from backend
  return {
    plan: raw.plan || 'free',
    status: raw.status || 'active',
    currentPeriodEnd: raw.currentPeriodEnd ?? raw.current_period_end ?? null,
    cancelAtPeriodEnd: raw.cancelAtPeriodEnd ?? raw.cancel_at_period_end ?? false,
    messagesUsedToday: raw.messagesUsedToday ?? raw.messages_used_today ?? 0,
    projectsCount: raw.projectsCount ?? raw.projects_count ?? 0,
    threadsCount: raw.threadsCount ?? raw.threads_count ?? 0,
  };
};

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

/**
 * Call this helper when a backend response is a 403 plan_limit_exceeded.
 * Opens the upgrade modal with the appropriate reason message.
 */
export interface PlanLimitError {
  error: 'plan_limit_exceeded';
  limit: string;
  current: number;
  allowed: number;
  plan: string;
  upgrade_url: string;
}

export function handlePlanLimitError(data: PlanLimitError) {
  const store = usePlanStore.getState();
  store.openUpgrade(data.limit || 'plan_limit_exceeded');
}

export const usePlanStore = create<PlanState>((set) => ({
  plan: null,
  limits: null,
  subscription: null,
  loading: false,
  showUpgradeModal: false,
  upgradeReason: '',

  fetchPlan: async () => {
    set({ loading: true });
    try {
      const sub = await fetchSubscriptionData();
      const planName: PlanName = sub.plan || 'free';
      set({
        subscription: sub,
        plan: { name: planName, displayName: PLAN_DISPLAY[planName] },
        limits: PLAN_LIMITS[planName],
      });
    } catch {
      // Default to free plan on error
      set({
        subscription: null,
        plan: { name: 'free', displayName: 'Free' },
        limits: PLAN_LIMITS.free,
      });
    } finally {
      set({ loading: false });
    }
  },

  openUpgrade: (reason) => set({ showUpgradeModal: true, upgradeReason: reason }),
  closeUpgrade: () => set({ showUpgradeModal: false, upgradeReason: '' }),
}));
