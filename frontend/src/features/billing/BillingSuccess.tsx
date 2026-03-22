import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePlanStore } from '@/stores/planStore';

export default function BillingSuccess() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const { fetchPlan } = usePlanStore();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    // Rafraîchir le plan pour prendre en compte le nouvel abonnement
    fetchPlan().catch(() => null);
  }, [fetchPlan]);

  useEffect(() => {
    if (countdown <= 0) {
      navigate('/chat', { replace: true });
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, navigate]);

  return (
    <div className='min-h-screen flex items-center justify-center bg-background px-4'>
      <div className='max-w-md w-full rounded-2xl border border-border bg-card p-10 text-center shadow-lg'>
        <div className='mb-6 flex justify-center'>
          <div className='flex h-16 w-16 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-500/20'>
            <svg
              className='h-8 w-8 text-teal-600 dark:text-teal-400'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M5 13l4 4L19 7'
              />
            </svg>
          </div>
        </div>

        <h1 className='text-2xl font-bold text-foreground mb-2'>
          {t('billing:successTitle')}
        </h1>
        <p className='text-muted-foreground text-sm mb-2'>
          {t('billing:successMessage')}
        </p>

        {sessionId && (
          <p className='text-xs text-muted-foreground/60 mb-4 font-mono'>
            {sessionId}
          </p>
        )}

        <p className='text-sm text-muted-foreground mt-6'>
          {t('billing:successRedirect', { count: countdown })}
        </p>

        <button
          type='button'
          onClick={() => navigate('/chat', { replace: true })}
          className='mt-4 inline-flex rounded-full bg-teal-500 px-6 py-2 text-sm font-semibold text-white transition hover:bg-teal-600'
        >
          {t('billing:goToChat')}
        </button>
      </div>
    </div>
  );
}
