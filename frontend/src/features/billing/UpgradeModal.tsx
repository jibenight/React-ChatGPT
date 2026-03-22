import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/components/common/Modal';
import { usePlanStore } from '@/stores/planStore';
import apiClient from '@/apiClient';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

function UpgradeModal() {
  const { t } = useTranslation();
  const { showUpgradeModal, upgradeReason, closeUpgrade, plan } = usePlanStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async () => {
    if (isTauri) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.post<{ url?: string }>('/api/billing/create-checkout-session', {
        plan: 'pro',
        interval: 'monthly',
      });
      if (data.url) window.location.href = data.url;
    } catch {
      setError(t('billing:checkoutError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={showUpgradeModal} onClose={closeUpgrade}>
      <div className='p-6'>
        <div className='flex items-center gap-3 mb-4'>
          <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/20'>
            <svg
              className='h-5 w-5 text-amber-600 dark:text-amber-400'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='2'
                d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
              />
            </svg>
          </div>
          <h2 className='text-lg font-semibold text-gray-900 dark:text-foreground'>
            {t('billing:upgradeTitle')}
          </h2>
        </div>

        <p className='text-sm text-gray-600 dark:text-muted-foreground mb-2'>
          {upgradeReason || t('billing:upgradeDescription')}
        </p>

        <div className='mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-border dark:bg-card/60'>
          <div className='flex items-center justify-between text-sm'>
            <span className='font-medium text-gray-700 dark:text-foreground'>
              {t('billing:currentPlan')}
            </span>
            <span className='rounded-full border border-gray-200 bg-white px-3 py-0.5 text-xs font-semibold text-gray-700 dark:border-border dark:bg-muted dark:text-foreground'>
              {plan?.displayName || 'Free'}
            </span>
          </div>
          <div className='mt-3 flex items-center justify-between text-sm'>
            <span className='font-medium text-teal-700 dark:text-teal-300'>
              {t('billing:pro')}
            </span>
            <span className='rounded-full border border-teal-200 bg-teal-50 px-3 py-0.5 text-xs font-semibold text-teal-700 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-300'>
              8€ / {t('billing:perMonth')}
            </span>
          </div>
          <ul className='mt-3 space-y-1 text-xs text-gray-500 dark:text-muted-foreground'>
            <li className='flex items-center gap-1.5'>
              <svg className='h-3.5 w-3.5 text-teal-500' fill='currentColor' viewBox='0 0 20 20'>
                <path fillRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clipRule='evenodd' />
              </svg>
              {t('billing:features.unlimitedMessages')}
            </li>
            <li className='flex items-center gap-1.5'>
              <svg className='h-3.5 w-3.5 text-teal-500' fill='currentColor' viewBox='0 0 20 20'>
                <path fillRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clipRule='evenodd' />
              </svg>
              {t('billing:features.allProviders')}
            </li>
            <li className='flex items-center gap-1.5'>
              <svg className='h-3.5 w-3.5 text-teal-500' fill='currentColor' viewBox='0 0 20 20'>
                <path fillRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clipRule='evenodd' />
              </svg>
              {t('billing:features.unlimitedProjects')}
            </li>
          </ul>
        </div>

        {error && (
          <p className='mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400'>
            {error}
          </p>
        )}

        <div className='mt-6 flex gap-3'>
          <button
            type='button'
            onClick={closeUpgrade}
            className='flex-1 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-border dark:text-muted-foreground dark:hover:bg-muted'
          >
            {t('common:close')}
          </button>
          <button
            type='button'
            onClick={handleUpgrade}
            disabled={loading || isTauri}
            className='flex-1 rounded-full bg-teal-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-60'
          >
            {loading ? t('common:loading') : t('billing:upgradeCta')}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default UpgradeModal;
