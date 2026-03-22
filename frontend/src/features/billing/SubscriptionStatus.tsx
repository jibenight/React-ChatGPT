import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlanStore } from '@/stores/planStore';
import apiClient from '@/apiClient';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

const PLAN_BADGE: Record<string, string> = {
  free: 'border-gray-200 bg-gray-100 text-gray-600 dark:border-border dark:bg-muted dark:text-muted-foreground',
  pro: 'border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-300',
  team: 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-300',
};

function SubscriptionStatus() {
  const { t } = useTranslation();
  const { plan, subscription, openUpgrade } = usePlanStore();
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleManage = async () => {
    if (isTauri) return;
    setLoadingPortal(true);
    setError(null);
    try {
      const data = await apiClient.post<{ url?: string }>('/api/billing/create-portal-session');
      if (data.url) window.open(data.url, '_blank');
    } catch {
      setError(t('billing:portalError'));
    } finally {
      setLoadingPortal(false);
    }
  };

  const planName = plan?.name || 'free';
  const badgeClass = PLAN_BADGE[planName] || PLAN_BADGE.free;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const renewalDate = formatDate(subscription?.currentPeriodEnd ?? null);

  return (
    <div className='rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-border dark:bg-card/60'>
      <div className='flex items-center justify-between'>
        <div>
          <p className='text-xs uppercase tracking-[0.15em] text-gray-400 dark:text-muted-foreground'>
            {t('billing:plan')}
          </p>
          <div className='mt-1 flex items-center gap-2'>
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badgeClass}`}>
              {plan?.displayName || 'Free'}
            </span>
            {subscription?.cancelAtPeriodEnd && (
              <span className='text-xs text-amber-600 dark:text-amber-400'>
                ({t('billing:cancelAtPeriodEnd')})
              </span>
            )}
          </div>
          {renewalDate && (
            <p className='mt-1 text-xs text-gray-500 dark:text-muted-foreground'>
              {t('billing:renewalDate')} : {renewalDate}
            </p>
          )}
        </div>

        <div className='flex flex-col gap-2'>
          {planName === 'free' ? (
            <button
              type='button'
              onClick={() => openUpgrade('billing:upgrade')}
              className='rounded-full bg-teal-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-600'
            >
              {t('billing:upgrade')}
            </button>
          ) : (
            <button
              type='button'
              onClick={handleManage}
              disabled={loadingPortal || isTauri}
              className='rounded-full border border-gray-200 px-4 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-border dark:text-muted-foreground dark:hover:bg-muted'
            >
              {loadingPortal ? t('common:loading') : t('billing:manage')}
            </button>
          )}
        </div>
      </div>
      {error && (
        <p className='mt-2 text-xs text-red-500 dark:text-red-400'>{error}</p>
      )}
    </div>
  );
}

export default SubscriptionStatus;
