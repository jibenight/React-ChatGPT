import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUser } from '../../UserContext';
import { useForm } from 'react-hook-form';
import * as tauri from '@/tauriClient';
import { useAppStore } from '../../stores/appStore';

function Profil() {
  const { t } = useTranslation();
  const setProfil = useAppStore(s => s.setProfil);
  const { userData, setUserData } = useUser();
  const [isReadOnly, setIsReadOnly] = useState(true);
  const [apiStatus, setApiStatus] = useState({
    openai: false,
    gemini: false,
    claude: false,
    mistral: false,
    groq: false,
  });
  type ActionMessage = { type: 'success' | 'error'; text: string } | null;
  const [actionMessage, setActionMessage] = useState<ActionMessage>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean;
    provider: string | null;
  }>({
    open: false,
    provider: null,
  });
  const {
    register,
    handleSubmit,
    reset,
  } = useForm<any>();

  const toggleReadOnly = () => {
    setIsReadOnly(!isReadOnly);
  };

  const fetchApiKeys = async () => {
    try {
      const result = await tauri.listApiKeys();
      const providers = result?.providers || [];
      const nextStatus = {
        openai: false,
        gemini: false,
        claude: false,
        mistral: false,
        groq: false,
      };
      providers.forEach(provider => {
        if (Object.prototype.hasOwnProperty.call(nextStatus, provider)) {
          nextStatus[provider] = true;
        }
      });
      setApiStatus(nextStatus);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchApiKeys();
  }, [userData]);

  useEffect(() => {
    if (!actionMessage) return;
    const timeoutId = setTimeout(() => {
      setActionMessage(null);
    }, 3500);
    return () => clearTimeout(timeoutId);
  }, [actionMessage]);

  const onSubmit = async data => {
    // Filtrer les clés-valeurs pour lesquelles les valeurs ne sont pas vides
    const updatedData = Object.fromEntries(
      Object.entries(data).filter(([key, value]) => {
        if (!value) return false;
        if (typeof value === 'string') return value.trim().length > 0;
        return true;
      }),
    );
    if (Object.keys(updatedData).length === 0) {
      return;
    }
    if (data.username) {
      try {
        setIsSaving(true);
        await tauri.updateUsername(data.username.trim());
        setUserData(prevUserData => ({
          ...prevUserData,
          username: data.username.trim(),
        }));
        reset();
        toggleReadOnly();
      } catch (err) {
        console.error(err);
        setActionMessage({
          type: 'error',
          text: t('profile:updateProfileError'),
        });
      } finally {
        setIsSaving(false);
      }
    }

    const apiKeyFields = [
      { key: 'openai_api_key', provider: 'openai' },
      { key: 'gemini_api_key', provider: 'gemini' },
      { key: 'claude_api_key', provider: 'claude' },
      { key: 'mistral_api_key', provider: 'mistral' },
      { key: 'groq_api_key', provider: 'groq' },
    ];

    const apiUpdates = apiKeyFields.filter(
      item => data[item.key] && data[item.key].trim(),
    );

    if (apiUpdates.length > 0) {
      try {
        setIsSaving(true);
        await Promise.all(
          apiUpdates.map(item =>
            tauri.saveApiKey(item.provider, data[item.key]),
          ),
        );
        const resetPayload = apiKeyFields.reduce((acc, item) => {
          acc[item.key] = '';
          return acc;
        }, {});
        reset(resetPayload);
        setApiStatus(prev => {
          const next = { ...prev };
          apiUpdates.forEach(item => {
            next[item.provider] = true;
          });
          return next;
        });
        setActionMessage({
          type: 'success',
          text: t('profile:saveKeySuccess'),
        });
      } catch (err) {
        console.error(err);
        setActionMessage({
          type: 'error',
          text: t('profile:saveKeyError'),
        });
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleDeleteApiKey = async provider => {
    try {
      setIsDeleting(true);
      await tauri.deleteApiKey(provider);
      setApiStatus(prev => ({ ...prev, [provider]: false }));
      setActionMessage({
        type: 'success',
        text: t('profile:deleteKeySuccess', { provider: provider.toUpperCase() }),
      });
    } catch (err) {
      console.error(err);
      setActionMessage({
        type: 'error',
        text: t('profile:deleteKeyError', { provider: provider.toUpperCase() }),
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const apiProviders = [
    { key: 'openai', label: 'OpenAI' },
    { key: 'gemini', label: 'Gemini' },
    { key: 'claude', label: 'Claude' },
    { key: 'mistral', label: 'Mistral' },
    { key: 'groq', label: 'Groq' },
  ];
  const displayName = userData?.username || t('profile:user');
  const displayEmail = userData?.email || '—';
  const initials = (displayName || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');

  return (
    <div className='relative h-screen flex-1 overflow-y-auto bg-linear-to-br from-gray-50 via-white to-gray-100 text-gray-900 dark:from-background dark:via-background dark:to-card dark:text-foreground'>
      <div className='mx-auto w-full max-w-6xl px-4 py-10'>
        <div className='mb-8 rounded-2xl border border-gray-200 bg-white/80 p-6 shadow-xs backdrop-blur dark:border-border dark:bg-card/70 dark:shadow-none'>
          <div className='flex flex-col gap-6 md:flex-row md:items-center md:justify-between'>
            <div className='flex items-center gap-4'>
              <div className='flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-500 text-lg font-semibold text-white shadow'>
                {initials || 'U'}
              </div>
              <div>
                <p className='text-xs uppercase tracking-[0.2em] text-gray-400 dark:text-muted-foreground'>
                  {t('profile:profile')}
                </p>
                <h1 className='text-2xl font-semibold text-gray-900 dark:text-foreground'>
                  {displayName}
                </h1>
                <p className='text-sm text-gray-500 dark:text-muted-foreground'>{displayEmail}</p>
              </div>
            </div>
            <div className='flex flex-wrap items-center gap-2'>
              <button
                type='button'
                onClick={() => setProfil(false)}
                className='inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-800 dark:border-border dark:bg-muted dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground'
              >
                <svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                  <path d='M18 6 6 18' />
                  <path d='m6 6 12 12' />
                </svg>
                {t('common:close')}
              </button>
              {apiProviders.map(provider => {
                const enabled = apiStatus[provider.key];
                return (
                  <span
                    key={provider.key}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${
                      enabled
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
                        : 'border-gray-200 bg-gray-100 text-gray-500 dark:border-border dark:bg-muted dark:text-muted-foreground'
                    }`}
                  >
                    {provider.label}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {actionMessage && (
          <div
            className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
              actionMessage.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
                : 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200'
            }`}
          >
            {actionMessage.text}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
          <div className='grid gap-6 lg:grid-cols-[1fr_1.4fr]'>
            <section className='rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-border dark:bg-card/60 dark:shadow-none'>
              <div className='flex items-center justify-between'>
                <h3 className='text-lg font-semibold text-gray-900 dark:text-foreground'>
                  {t('profile:accountOverview')}
                </h3>
                <span className='text-xs font-medium uppercase tracking-[0.2em] text-gray-400 dark:text-muted-foreground'>
                  {t('profile:status')}
                </span>
              </div>
              <dl className='mt-4 space-y-4 text-sm'>
                <div className='flex items-center justify-between'>
                  <dt className='text-gray-500 dark:text-muted-foreground'>{t('profile:username')}</dt>
                  <dd className='font-medium text-gray-900 dark:text-foreground'>{displayName}</dd>
                </div>
                <div className='flex items-center justify-between'>
                  <dt className='text-gray-500 dark:text-muted-foreground'>{t('profile:emailAddress')}</dt>
                  <dd className='font-medium text-gray-900 dark:text-foreground'>{displayEmail}</dd>
                </div>
              </dl>
              <div className='mt-6 grid gap-3'>
                {apiProviders.map(provider => {
                  const enabled = apiStatus[provider.key];
                  return (
                    <div
                      key={provider.key}
                      className='flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm dark:border-border dark:bg-card/70'
                    >
                      <span className='font-medium text-gray-700 dark:text-foreground'>
                        {provider.label}
                      </span>
                      <span
                        className={`flex items-center gap-2 text-xs font-semibold ${
                          enabled ? 'text-emerald-600 dark:text-emerald-300' : 'text-gray-400 dark:text-muted-foreground'
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            enabled ? 'bg-emerald-400' : 'bg-gray-300 dark:bg-border'
                          }`}
                        />
                        {enabled ? t('profile:configured') : t('profile:notConfigured')}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className='mt-6 rounded-xl border border-teal-100 bg-teal-50/70 px-4 py-3 text-sm text-teal-700 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-200'>
                {t('profile:apiKeysEncrypted')}
              </div>
            </section>

            <section className='relative overflow-hidden rounded-2xl border border-gray-200 bg-white/90 p-6 shadow-sm dark:border-border dark:bg-card/70 dark:shadow-none'>
              <div className='absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-400 via-teal-300 to-teal-500' />
              <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                <div>
                  <p className='text-xs uppercase tracking-[0.2em] text-gray-400 dark:text-muted-foreground'>
                    {t('common:settings')}
                  </p>
                  <h3 className='text-lg font-semibold text-gray-900 dark:text-foreground'>
                    {t('profile:profileAndKeys')}
                  </h3>
                  <p className='text-sm text-gray-500 dark:text-muted-foreground'>
                    {t('profile:profileAndKeysDescription')}
                  </p>
                </div>
                <button
                  onClick={toggleReadOnly}
                  className='rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-xs font-semibold text-teal-700 transition hover:border-teal-300 hover:bg-teal-100 dark:border-teal-500/40 dark:bg-teal-500/10 dark:text-teal-200 dark:hover:bg-teal-500/20'
                  type='button'
                >
                  {isReadOnly ? t('profile:editProfile') : t('common:cancel')}
                </button>
              </div>

              <div className='mt-4 flex flex-wrap gap-2'>
                {apiProviders.map(provider => {
                  const enabled = apiStatus[provider.key];
                  return (
                    <span
                      key={provider.key}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        enabled
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
                          : 'border-gray-200 bg-gray-100 text-gray-500 dark:border-border dark:bg-muted dark:text-muted-foreground'
                      }`}
                    >
                      {provider.label}
                    </span>
                  );
                })}
              </div>

              {isReadOnly ? (
                <div className='mt-6 grid gap-4 md:grid-cols-2'>
                  <div className='rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600 shadow-sm dark:border-border dark:bg-card/60 dark:text-muted-foreground dark:shadow-none'>
                    <p className='font-semibold text-gray-800 dark:text-foreground'>{t('profile:profile')}</p>
                    <p className='mt-1 text-xs text-gray-500 dark:text-muted-foreground'>
                      {t('profile:profileDescription')}
                    </p>
                    <div className='mt-3 space-y-2'>
                      <div className='rounded-lg border border-dashed border-gray-200 bg-white px-3 py-2 text-xs text-gray-400 dark:border-border dark:bg-card dark:text-muted-foreground'>
                        {t('profile:username')}
                      </div>
                    </div>
                  </div>
                  <div className='rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600 shadow-sm dark:border-border dark:bg-card/60 dark:text-muted-foreground dark:shadow-none'>
                    <p className='font-semibold text-gray-800 dark:text-foreground'>{t('profile:apiKeys')}</p>
                    <p className='mt-1 text-xs text-gray-500 dark:text-muted-foreground'>
                      {t('profile:apiKeysDescription')}
                    </p>
                    <div className='mt-3 grid gap-2 sm:grid-cols-2'>
                      {apiProviders.map(provider => (
                        <div
                          key={provider.key}
                          className='rounded-lg border border-dashed border-gray-200 bg-white px-3 py-2 text-xs text-gray-400 dark:border-border dark:bg-card dark:text-muted-foreground'
                        >
                          {provider.label}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className='mt-6 grid gap-6'>
                  <div className='rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-border dark:bg-card/60'>
                    <h4 className='text-sm font-semibold text-gray-800 dark:text-foreground'>
                      {t('profile:personalInfo')}
                    </h4>
                    <div className='mt-4 grid gap-5'>
                      <div>
                        <label className='block text-sm font-medium text-gray-700 dark:text-muted-foreground'>
                          {t('profile:newUsername')}
                        </label>
                        <div className='mt-2'>
                          <input
                            {...register('username')}
                            type='text'
                            className='w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200 dark:border-border dark:bg-card dark:text-foreground dark:focus:ring-teal-400/30'
                            placeholder={t('profile:enterUsername')}
                          />
                        </div>
                      </div>

                    </div>
                  </div>

                  <div className='rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-border dark:bg-card/60'>
                    <h4 className='text-sm font-semibold text-gray-800 dark:text-foreground'>
                      {t('profile:apiKeysByProvider')}
                    </h4>
                    <p className='mt-1 text-xs text-gray-500 dark:text-muted-foreground'>
                      {t('profile:apiKeysByProviderDescription')}
                    </p>
                    <div className='mt-4 grid gap-4'>
                      <div>
                        <label className='block text-sm font-medium text-gray-700 dark:text-muted-foreground'>
                          {t('profile:apiKeyLabel', { provider: 'OpenAI' })}
                        </label>
                        <div className='mt-2'>
                          <input
                            {...register('openai_api_key')}
                            type='text'
                            className='w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200 dark:border-border dark:bg-card dark:text-foreground dark:focus:ring-teal-400/30'
                            placeholder='sk-...'
                          />
                        </div>
                      </div>
                      <div>
                        <label className='block text-sm font-medium text-gray-700 dark:text-muted-foreground'>
                          {t('profile:apiKeyLabel', { provider: 'Gemini' })}
                        </label>
                        <div className='mt-2'>
                          <input
                            {...register('gemini_api_key')}
                            type='text'
                            className='w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200 dark:border-border dark:bg-card dark:text-foreground dark:focus:ring-teal-400/30'
                            placeholder='AIza...'
                          />
                        </div>
                      </div>
                      <div>
                        <label className='block text-sm font-medium text-gray-700 dark:text-muted-foreground'>
                          {t('profile:apiKeyLabel', { provider: 'Claude' })}
                        </label>
                        <div className='mt-2'>
                          <input
                            {...register('claude_api_key')}
                            type='text'
                            className='w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200 dark:border-border dark:bg-card dark:text-foreground dark:focus:ring-teal-400/30'
                            placeholder='sk-ant-...'
                          />
                        </div>
                      </div>
                      <div>
                        <label className='block text-sm font-medium text-gray-700 dark:text-muted-foreground'>
                          {t('profile:apiKeyLabel', { provider: 'Mistral' })}
                        </label>
                        <div className='mt-2'>
                          <input
                            {...register('mistral_api_key')}
                            type='text'
                            className='w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200 dark:border-border dark:bg-card dark:text-foreground dark:focus:ring-teal-400/30'
                            placeholder='mistral-...'
                          />
                        </div>
                      </div>
                      <div>
                        <label className='block text-sm font-medium text-gray-700 dark:text-muted-foreground'>
                          {t('profile:apiKeyLabel', { provider: 'Groq' })}
                        </label>
                        <div className='mt-2'>
                          <input
                            {...register('groq_api_key')}
                            type='text'
                            className='w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200 dark:border-border dark:bg-card dark:text-foreground dark:focus:ring-teal-400/30'
                            placeholder='gsk_...'
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className='flex justify-end'>
                    <button
                      className='inline-flex items-center justify-center rounded-full bg-teal-500 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-300 disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-teal-400/30'
                      type='submit'
                      disabled={isSaving}
                    >
                      {isSaving ? t('common:saving') : t('common:save')}
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>

          <section className='rounded-2xl border border-red-200 bg-white p-6 shadow-sm dark:border-red-500/40 dark:bg-card/60 dark:shadow-none'>
            <div className='flex items-center justify-between'>
              <div>
                <h3 className='text-lg font-semibold text-red-700 dark:text-red-300'>
                  {t('profile:dangerZone')}
                </h3>
                <p className='text-sm text-gray-500 dark:text-muted-foreground'>
                  {t('profile:dangerZoneDescription')}
                </p>
              </div>
              <span className='rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200'>
                {t('common:sensitive')}
              </span>
            </div>
            <div className='mt-4 flex flex-wrap gap-3'>
              <button
                className='inline-flex justify-center rounded-full border border-red-300 px-4 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/40 dark:text-red-200 dark:hover:bg-red-500/10'
                type='button'
                onClick={() =>
                  setConfirmDelete({ open: true, provider: 'openai' })
                }
                disabled={!apiStatus.openai || isDeleting}
              >
                {t('profile:deleteKeyLabel', { provider: 'OpenAI' })}
              </button>
              <button
                className='inline-flex justify-center rounded-full border border-red-300 px-4 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/40 dark:text-red-200 dark:hover:bg-red-500/10'
                type='button'
                onClick={() =>
                  setConfirmDelete({ open: true, provider: 'gemini' })
                }
                disabled={!apiStatus.gemini || isDeleting}
              >
                {t('profile:deleteKeyLabel', { provider: 'Gemini' })}
              </button>
              <button
                className='inline-flex justify-center rounded-full border border-red-300 px-4 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/40 dark:text-red-200 dark:hover:bg-red-500/10'
                type='button'
                onClick={() =>
                  setConfirmDelete({ open: true, provider: 'claude' })
                }
                disabled={!apiStatus.claude || isDeleting}
              >
                {t('profile:deleteKeyLabel', { provider: 'Claude' })}
              </button>
              <button
                className='inline-flex justify-center rounded-full border border-red-300 px-4 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/40 dark:text-red-200 dark:hover:bg-red-500/10'
                type='button'
                onClick={() =>
                  setConfirmDelete({ open: true, provider: 'mistral' })
                }
                disabled={!apiStatus.mistral || isDeleting}
              >
                {t('profile:deleteKeyLabel', { provider: 'Mistral' })}
              </button>
              <button
                className='inline-flex justify-center rounded-full border border-red-300 px-4 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/40 dark:text-red-200 dark:hover:bg-red-500/10'
                type='button'
                onClick={() =>
                  setConfirmDelete({ open: true, provider: 'groq' })
                }
                disabled={!apiStatus.groq || isDeleting}
              >
                {t('profile:deleteKeyLabel', { provider: 'Groq' })}
              </button>
            </div>
          </section>
        </form>

        {confirmDelete.open && (
          <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4'>
            <div className='w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-[fadeIn_160ms_ease-out] dark:bg-card dark:shadow-none'>
              <h4 className='text-lg font-semibold text-gray-900 dark:text-foreground'>
                {t('profile:deleteApiKey')}
              </h4>
              <p className='mt-2 text-sm text-gray-600 dark:text-muted-foreground'>
                {t('profile:confirmDeleteKey')}{' '}
                <span className='font-semibold'>
                  {confirmDelete.provider?.toUpperCase()}
                </span>
                . {t('common:irreversibleAction')}
              </p>
              <div className='mt-6 flex justify-end gap-3'>
                <button
                  type='button'
                  className='rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-border dark:text-muted-foreground dark:hover:bg-muted'
                  onClick={() =>
                    setConfirmDelete({ open: false, provider: null })
                  }
                  disabled={isDeleting}
                >
                  {t('common:cancel')}
                </button>
                <button
                  type='button'
                  className='rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60'
                  onClick={() => {
                    const provider = confirmDelete.provider;
                    setConfirmDelete({ open: false, provider: null });
                    if (provider) {
                      handleDeleteApiKey(provider);
                    }
                  }}
                  disabled={isDeleting}
                >
                  {isDeleting ? t('common:deleting') : t('common:delete')}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default Profil;
