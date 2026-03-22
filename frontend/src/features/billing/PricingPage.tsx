import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlanStore } from '@/stores/planStore';
import { Link } from 'react-router-dom';
import apiClient from '@/apiClient';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

interface PricingTier {
  key: 'free' | 'pro' | 'team';
  nameKey: string;
  monthlyPrice: number;
  yearlyPrice: number;
  perUser: boolean;
  features: { key: string; included: boolean }[];
  highlight: boolean;
}

const TIERS: PricingTier[] = [
  {
    key: 'free',
    nameKey: 'billing:free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    perUser: false,
    highlight: false,
    features: [
      { key: 'billing:features.messages50perDay', included: true },
      { key: 'billing:features.projects3', included: true },
      { key: 'billing:features.threads5', included: true },
      { key: 'billing:features.groqOnly', included: true },
      { key: 'billing:features.allProviders', included: false },
      { key: 'billing:features.unlimitedMessages', included: false },
      { key: 'billing:features.unlimitedProjects', included: false },
      { key: 'billing:features.collaboration', included: false },
    ],
  },
  {
    key: 'pro',
    nameKey: 'billing:pro',
    monthlyPrice: 8,
    yearlyPrice: 6.4,
    perUser: false,
    highlight: true,
    features: [
      { key: 'billing:features.messages50perDay', included: false },
      { key: 'billing:features.projects3', included: false },
      { key: 'billing:features.threads5', included: false },
      { key: 'billing:features.groqOnly', included: false },
      { key: 'billing:features.allProviders', included: true },
      { key: 'billing:features.unlimitedMessages', included: true },
      { key: 'billing:features.unlimitedProjects', included: true },
      { key: 'billing:features.collaboration', included: false },
    ],
  },
  {
    key: 'team',
    nameKey: 'billing:team',
    monthlyPrice: 6,
    yearlyPrice: 4.8,
    perUser: true,
    highlight: false,
    features: [
      { key: 'billing:features.messages50perDay', included: false },
      { key: 'billing:features.projects3', included: false },
      { key: 'billing:features.threads5', included: false },
      { key: 'billing:features.groqOnly', included: false },
      { key: 'billing:features.allProviders', included: true },
      { key: 'billing:features.unlimitedMessages', included: true },
      { key: 'billing:features.unlimitedProjects', included: true },
      { key: 'billing:features.collaboration', included: true },
    ],
  },
];

function PricingPage() {
  const { t } = useTranslation();
  const { plan } = usePlanStore();
  const [yearly, setYearly] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentPlanKey = plan?.name || 'free';

  const handleSubscribe = async (tierKey: string) => {
    if (isTauri || tierKey === 'free' || tierKey === currentPlanKey) return;
    setLoadingPlan(tierKey);
    setError(null);
    try {
      const data = await apiClient.post<{ url?: string }>('/api/billing/create-checkout-session', {
        plan: tierKey,
        interval: yearly ? 'yearly' : 'monthly',
      });
      if (data.url) window.location.href = data.url;
    } catch {
      setError(t('billing:checkoutError'));
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className='min-h-screen bg-linear-to-br from-gray-50 via-white to-gray-100 dark:from-background dark:via-background dark:to-card'>
      <div className='mx-auto max-w-5xl px-4 py-12'>
        <div className='mb-2'>
          <Link
            to='/'
            className='inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 dark:text-muted-foreground dark:hover:text-foreground'
          >
            <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M15 19l-7-7 7-7' />
            </svg>
            {t('common:back')}
          </Link>
        </div>

        <div className='mb-10 text-center'>
          <h1 className='text-3xl font-bold text-gray-900 dark:text-foreground'>
            {t('billing:pricing')}
          </h1>
          <p className='mt-3 text-gray-500 dark:text-muted-foreground'>
            {t('billing:pricingSubtitle')}
          </p>

          {/* Monthly / yearly toggle */}
          <div className='mt-6 inline-flex items-center gap-3 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm dark:border-border dark:bg-card'>
            <button
              type='button'
              onClick={() => setYearly(false)}
              className={`rounded-full px-3 py-1 transition ${
                !yearly
                  ? 'bg-teal-500 text-white font-semibold'
                  : 'text-gray-600 hover:text-gray-900 dark:text-muted-foreground dark:hover:text-foreground'
              }`}
            >
              {t('billing:monthly')}
            </button>
            <button
              type='button'
              onClick={() => setYearly(true)}
              className={`rounded-full px-3 py-1 transition ${
                yearly
                  ? 'bg-teal-500 text-white font-semibold'
                  : 'text-gray-600 hover:text-gray-900 dark:text-muted-foreground dark:hover:text-foreground'
              }`}
            >
              {t('billing:yearly')}
              <span className='ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'>
                {t('billing:savePercent', { percent: 20 })}
              </span>
            </button>
          </div>
        </div>

        {error && (
          <p className='mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400'>
            {error}
          </p>
        )}

        <div className='grid gap-6 md:grid-cols-3'>
          {TIERS.map(tier => {
            const price = yearly ? tier.yearlyPrice : tier.monthlyPrice;
            const isCurrent = tier.key === currentPlanKey;
            const isLoading = loadingPlan === tier.key;

            return (
              <div
                key={tier.key}
                className={`relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm transition dark:bg-card dark:shadow-none ${
                  tier.highlight
                    ? 'border-teal-300 ring-2 ring-teal-400/30 dark:border-teal-500/60'
                    : 'border-gray-200 dark:border-border'
                }`}
              >
                {tier.highlight && (
                  <div className='absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r from-teal-400 to-teal-500' />
                )}

                <div className='mb-4'>
                  <h2 className='text-lg font-bold text-gray-900 dark:text-foreground'>
                    {t(tier.nameKey)}
                  </h2>
                  <div className='mt-2 flex items-baseline gap-1'>
                    <span className='text-3xl font-extrabold text-gray-900 dark:text-foreground'>
                      {price === 0 ? t('billing:free') : `${price}€`}
                    </span>
                    {price > 0 && (
                      <span className='text-sm text-gray-500 dark:text-muted-foreground'>
                        /{t('billing:perMonth')}
                        {tier.perUser && `/${t('billing:perUser')}`}
                      </span>
                    )}
                  </div>
                  {yearly && price > 0 && (
                    <p className='mt-1 text-xs text-teal-600 dark:text-teal-400'>
                      {t('billing:savePercent', { percent: 20 })}
                    </p>
                  )}
                </div>

                <ul className='mb-6 flex-1 space-y-2'>
                  {tier.features.map(feat => (
                    <li key={feat.key} className='flex items-start gap-2 text-sm'>
                      {feat.included ? (
                        <svg className='mt-0.5 h-4 w-4 shrink-0 text-teal-500' fill='currentColor' viewBox='0 0 20 20'>
                          <path fillRule='evenodd' d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z' clipRule='evenodd' />
                        </svg>
                      ) : (
                        <svg className='mt-0.5 h-4 w-4 shrink-0 text-gray-300 dark:text-border' fill='currentColor' viewBox='0 0 20 20'>
                          <path fillRule='evenodd' d='M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z' clipRule='evenodd' />
                        </svg>
                      )}
                      <span className={feat.included ? 'text-gray-700 dark:text-foreground' : 'text-gray-400 dark:text-muted-foreground'}>
                        {t(feat.key)}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  type='button'
                  onClick={() => handleSubscribe(tier.key)}
                  disabled={isCurrent || isLoading || isTauri}
                  className={`w-full rounded-full py-2.5 text-sm font-semibold transition ${
                    isCurrent
                      ? 'cursor-default border border-gray-200 bg-gray-50 text-gray-400 dark:border-border dark:bg-muted dark:text-muted-foreground'
                      : tier.highlight
                      ? 'bg-teal-500 text-white hover:bg-teal-600 disabled:opacity-60'
                      : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-border dark:bg-card dark:text-foreground dark:hover:bg-muted'
                  }`}
                >
                  {isLoading
                    ? t('common:loading')
                    : isCurrent
                    ? t('billing:currentPlan')
                    : tier.key === 'free'
                    ? t('billing:free')
                    : tier.key === 'pro'
                    ? t('billing:upgradeToPro')
                    : t('billing:upgradeToTeam')}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default PricingPage;
