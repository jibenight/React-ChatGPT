import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import apiClient from '@/apiClient';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

function BillingPortal() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = async () => {
    if (isTauri) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.post<{ url?: string }>('/api/billing/create-portal-session');
      if (data.url) window.open(data.url, '_blank');
    } catch {
      setError(t('billing:portalError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='flex flex-col items-start gap-1'>
      <button
        type='button'
        onClick={handleOpen}
        disabled={loading || isTauri}
        className='inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-border dark:bg-card dark:text-muted-foreground dark:hover:bg-muted'
      >
        {loading ? t('common:loading') : t('billing:manage')}
      </button>
      {error && (
        <p className='text-xs text-red-500 dark:text-red-400'>{error}</p>
      )}
    </div>
  );
}

export default BillingPortal;
