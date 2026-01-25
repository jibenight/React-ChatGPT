import React, { useEffect, useState } from 'react';
import { useUser } from '../../UserContext';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { API_BASE } from '../../apiConfig';

function Profil() {
  const { userData, setUserData } = useUser();
  const [profilData, setprofilData] = useState(true);
  const [apiStatus, setApiStatus] = useState({
    openai: false,
    gemini: false,
    claude: false,
    mistral: false,
  });
  const [actionMessage, setActionMessage] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState({
    open: false,
    provider: null,
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: async data => {
      const errors = {};
      if (data.password !== data.passwordConfirmation) {
        errors.passwordConfirmation = {
          type: 'manual',
          message: 'Les mots de passe ne correspondent pas',
        };
      }
      return {
        values: data.password === data.passwordConfirmation ? data : {},
        errors,
      };
    },
  });

  const toogleProfilData = () => {
    setprofilData(!profilData);
  };

  const fetchApiKeys = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const response = await axios.get(`${API_BASE}/api/api-keys`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const providers = response.data?.providers || [];
      const nextStatus = {
        openai: false,
        gemini: false,
        claude: false,
        mistral: false,
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
    console.log(data);
    // Filtrer les clés-valeurs pour lesquelles les valeurs ne sont pas vides
    const updatedData = Object.fromEntries(
      Object.entries(data).filter(([key, value]) => value && value.trim()),
    );
    console.log('Submitting data:', updatedData); // Ajoutez cette ligne pour voir les données soumises

    if (Object.keys(updatedData).length === 0) {
      console.log('No data to update');
      return;
    }
    if (data.username || data.password) {
      const token = localStorage.getItem('token');
      try {
        setIsSaving(true);
        const response = await axios.post(
          `${API_BASE}/api/update-user-data`,
          updatedData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        if (response.data.message === 'User data updated successfully') {
          // Mettre à jour le contexte utilisateur avec les nouvelles données
          setUserData(prevUserData => ({
            ...prevUserData,
            username: updatedData.username || prevUserData.username, // Mise à jour conditionnelle
            password: updatedData.password || prevUserData.password, // Mise à jour conditionnelle
          }));
          reset();
        }
        toogleProfilData();
      } catch (err) {
        console.error(err);
        setActionMessage({
          type: 'error',
          text: 'Impossible de mettre à jour le profil.',
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
    ];

    const token = localStorage.getItem('token');
    const apiUpdates = apiKeyFields.filter(
      item => data[item.key] && data[item.key].trim(),
    );

    if (apiUpdates.length > 0) {
      try {
        setIsSaving(true);
        await Promise.all(
          apiUpdates.map(item =>
            axios.post(
              `${API_BASE}/api/update-api-key`,
              { apiKey: data[item.key], provider: item.provider },
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              },
            ),
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
          text: 'Clé(s) API enregistrée(s) avec succès.',
        });
      } catch (err) {
        console.error(err);
        setActionMessage({
          type: 'error',
          text: 'Impossible d’enregistrer la clé API.',
        });
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleDeleteApiKey = async provider => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      setIsDeleting(true);
      await axios.delete(`${API_BASE}/api/api-keys/${provider}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setApiStatus(prev => ({ ...prev, [provider]: false }));
      setActionMessage({
        type: 'success',
        text: `Clé ${provider.toUpperCase()} supprimée.`,
      });
    } catch (err) {
      console.error(err);
      setActionMessage({
        type: 'error',
        text: `Impossible de supprimer la clé ${provider.toUpperCase()}.`,
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
  ];
  const displayName = userData?.username || 'Utilisateur';
  const displayEmail = userData?.email || '—';
  const initials = (displayName || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');

  return (
    <div className='relative min-h-screen flex-1 overflow-y-auto bg-linear-to-br from-gray-50 via-white to-gray-100'>
      <div className='mx-auto w-full max-w-6xl px-4 py-10'>
        <div className='mb-8 rounded-2xl border border-gray-200 bg-white/80 p-6 shadow-xs backdrop-blur'>
          <div className='flex flex-col gap-6 md:flex-row md:items-center md:justify-between'>
            <div className='flex items-center gap-4'>
              <div className='flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-500 text-lg font-semibold text-white shadow'>
                {initials || 'U'}
              </div>
              <div>
                <p className='text-xs uppercase tracking-[0.2em] text-gray-400'>
                  Profil
                </p>
                <h1 className='text-2xl font-semibold text-gray-900'>
                  {displayName}
                </h1>
                <p className='text-sm text-gray-500'>{displayEmail}</p>
              </div>
            </div>
            <div className='flex flex-wrap items-center gap-2'>
              {apiProviders.map(provider => {
                const enabled = apiStatus[provider.key];
                return (
                  <span
                    key={provider.key}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${
                      enabled
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-gray-200 bg-gray-100 text-gray-500'
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
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {actionMessage.text}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
          <div className='grid gap-6 lg:grid-cols-[1fr_1.4fr]'>
            <section className='rounded-2xl border border-gray-200 bg-white p-6 shadow-sm'>
              <div className='flex items-center justify-between'>
                <h3 className='text-lg font-semibold text-gray-900'>
                  Aperçu du compte
                </h3>
                <span className='text-xs font-medium uppercase tracking-[0.2em] text-gray-400'>
                  Statut
                </span>
              </div>
              <dl className='mt-4 space-y-4 text-sm'>
                <div className='flex items-center justify-between'>
                  <dt className='text-gray-500'>Nom d'utilisateur</dt>
                  <dd className='font-medium text-gray-900'>{displayName}</dd>
                </div>
                <div className='flex items-center justify-between'>
                  <dt className='text-gray-500'>Adresse e-mail</dt>
                  <dd className='font-medium text-gray-900'>{displayEmail}</dd>
                </div>
                <div className='flex items-center justify-between'>
                  <dt className='text-gray-500'>Mot de passe</dt>
                  <dd className='font-medium text-gray-900'>••••••••</dd>
                </div>
              </dl>
              <div className='mt-6 grid gap-3'>
                {apiProviders.map(provider => {
                  const enabled = apiStatus[provider.key];
                  return (
                    <div
                      key={provider.key}
                      className='flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm'
                    >
                      <span className='font-medium text-gray-700'>
                        {provider.label}
                      </span>
                      <span
                        className={`flex items-center gap-2 text-xs font-semibold ${
                          enabled ? 'text-emerald-600' : 'text-gray-400'
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            enabled ? 'bg-emerald-400' : 'bg-gray-300'
                          }`}
                        />
                        {enabled ? 'Enregistrée' : 'Non renseignée'}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className='mt-6 rounded-xl border border-teal-100 bg-teal-50/70 px-4 py-3 text-sm text-teal-700'>
                Vos clés API sont chiffrées et stockées en base de données.
              </div>
            </section>

            <section className='relative overflow-hidden rounded-2xl border border-gray-200 bg-white/90 p-6 shadow-sm'>
              <div className='absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-400 via-teal-300 to-teal-500' />
              <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                <div>
                  <p className='text-xs uppercase tracking-[0.2em] text-gray-400'>
                    Paramètres
                  </p>
                  <h3 className='text-lg font-semibold text-gray-900'>
                    Profil & Clés API
                  </h3>
                  <p className='text-sm text-gray-500'>
                    Mettez à jour vos informations et vos clés fournisseurs.
                  </p>
                </div>
                <button
                  onClick={toogleProfilData}
                  className='rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-xs font-semibold text-teal-700 transition hover:border-teal-300 hover:bg-teal-100'
                  type='button'
                >
                  {profilData ? 'Éditer le profil' : 'Annuler'}
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
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-gray-200 bg-gray-100 text-gray-500'
                      }`}
                    >
                      {provider.label}
                    </span>
                  );
                })}
              </div>

              {profilData ? (
                <div className='mt-6 grid gap-4 md:grid-cols-2'>
                  <div className='rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600 shadow-sm'>
                    <p className='font-semibold text-gray-800'>Profil</p>
                    <p className='mt-1 text-xs text-gray-500'>
                      Modifiez votre nom d'utilisateur et mot de passe.
                    </p>
                    <div className='mt-3 space-y-2'>
                    <div className='rounded-lg border border-dashed border-gray-200 bg-white px-3 py-2 text-xs text-gray-400'>
                        Nom d'utilisateur
                      </div>
                      <div className='rounded-lg border border-dashed border-gray-200 bg-white px-3 py-2 text-xs text-gray-400'>
                        Mot de passe
                      </div>
                    </div>
                  </div>
                  <div className='rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600 shadow-sm'>
                    <p className='font-semibold text-gray-800'>Clés API</p>
                    <p className='mt-1 text-xs text-gray-500'>
                      Ajoutez vos clés pour débloquer chaque fournisseur.
                    </p>
                    <div className='mt-3 grid gap-2 sm:grid-cols-2'>
                      {apiProviders.map(provider => (
                        <div
                          key={provider.key}
                          className='rounded-lg border border-dashed border-gray-200 bg-white px-3 py-2 text-xs text-gray-400'
                        >
                          {provider.label}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className='mt-6 grid gap-6'>
                  <div className='rounded-2xl border border-gray-100 bg-gray-50 p-4'>
                    <h4 className='text-sm font-semibold text-gray-800'>
                      Informations personnelles
                    </h4>
                    <div className='mt-4 grid gap-5'>
                      <div>
                        <label className='block text-sm font-medium text-gray-700'>
                        Nouveau nom d'utilisateur
                        </label>
                        <div className='mt-2'>
                          <input
                            {...register('username')}
                            type='text'
                            className='w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200'
                            placeholder="Entrer un nom d'utilisateur"
                          />
                        </div>
                      </div>

                      <div>
                        <label className='block text-sm font-medium text-gray-700'>
                        Nouveau mot de passe
                        </label>
                        <div className='mt-2'>
                          <input
                            {...register('password')}
                            type='password'
                            className='w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200'
                            placeholder='Entrer un mot de passe'
                          />
                        </div>
                      </div>
                    </div>

                    <div className='mt-5'>
                      <label className='block text-sm font-medium text-gray-700'>
                        Confirmer le mot de passe
                      </label>
                      <div className='mt-2'>
                        <input
                          {...register('passwordConfirmation')}
                          type='password'
                          className='w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200'
                          placeholder='Confirmer le mot de passe'
                        />
                      </div>
                    </div>
                    {errors.passwordConfirmation && (
                      <p className='mt-2 text-sm text-red-500'>
                        {errors.passwordConfirmation.message}
                      </p>
                    )}
                  </div>

                  <div className='rounded-2xl border border-gray-100 bg-gray-50 p-4'>
                    <h4 className='text-sm font-semibold text-gray-800'>
                      Clés API par fournisseur
                    </h4>
                    <p className='mt-1 text-xs text-gray-500'>
                      Ajoutez une clé par fournisseur. Vous pouvez les supprimer
                      dans la zone de danger.
                    </p>
                    <div className='mt-4 grid gap-4'>
                      <div>
                        <label className='block text-sm font-medium text-gray-700'>
                        Clé API OpenAI
                        </label>
                        <div className='mt-2'>
                          <input
                            {...register('openai_api_key')}
                            type='text'
                            className='w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200'
                            placeholder='sk-...'
                          />
                        </div>
                      </div>
                      <div>
                        <label className='block text-sm font-medium text-gray-700'>
                        Clé API Gemini
                        </label>
                        <div className='mt-2'>
                          <input
                            {...register('gemini_api_key')}
                            type='text'
                            className='w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200'
                            placeholder='AIza...'
                          />
                        </div>
                      </div>
                      <div>
                        <label className='block text-sm font-medium text-gray-700'>
                        Clé API Claude
                        </label>
                        <div className='mt-2'>
                          <input
                            {...register('claude_api_key')}
                            type='text'
                            className='w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200'
                            placeholder='sk-ant-...'
                          />
                        </div>
                      </div>
                      <div>
                        <label className='block text-sm font-medium text-gray-700'>
                        Clé API Mistral
                        </label>
                        <div className='mt-2'>
                          <input
                            {...register('mistral_api_key')}
                            type='text'
                            className='w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-200'
                            placeholder='mistral-...'
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className='flex justify-end'>
                    <button
                      className='inline-flex items-center justify-center rounded-full bg-teal-500 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-300 disabled:cursor-not-allowed disabled:opacity-60'
                      type='submit'
                      disabled={isSaving}
                    >
                      {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>

          <section className='rounded-2xl border border-red-200 bg-white p-6 shadow-sm'>
            <div className='flex items-center justify-between'>
              <div>
                <h3 className='text-lg font-semibold text-red-700'>
                  Zone de danger
                </h3>
                <p className='text-sm text-gray-500'>
                  Supprimez votre compte ou vos clés API. Action irréversible.
                </p>
              </div>
              <span className='rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600'>
                Sensible
              </span>
            </div>
            <div className='mt-4 flex flex-wrap gap-3'>
              <button
                className='inline-flex justify-center rounded-full border border-red-300 px-4 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50'
                type='button'
              >
                Supprimer le compte
              </button>
              <button
                className='inline-flex justify-center rounded-full border border-red-300 px-4 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60'
                type='button'
                onClick={() =>
                  setConfirmDelete({ open: true, provider: 'openai' })
                }
                disabled={!apiStatus.openai || isDeleting}
              >
                Supprimer la clé OpenAI
              </button>
              <button
                className='inline-flex justify-center rounded-full border border-red-300 px-4 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60'
                type='button'
                onClick={() =>
                  setConfirmDelete({ open: true, provider: 'gemini' })
                }
                disabled={!apiStatus.gemini || isDeleting}
              >
                Supprimer la clé Gemini
              </button>
              <button
                className='inline-flex justify-center rounded-full border border-red-300 px-4 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60'
                type='button'
                onClick={() =>
                  setConfirmDelete({ open: true, provider: 'claude' })
                }
                disabled={!apiStatus.claude || isDeleting}
              >
                Supprimer la clé Claude
              </button>
              <button
                className='inline-flex justify-center rounded-full border border-red-300 px-4 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60'
                type='button'
                onClick={() =>
                  setConfirmDelete({ open: true, provider: 'mistral' })
                }
                disabled={!apiStatus.mistral || isDeleting}
              >
                Supprimer la clé Mistral
              </button>
            </div>
          </section>
        </form>

        {confirmDelete.open && (
          <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4'>
            <div className='w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-[fadeIn_160ms_ease-out]'>
              <h4 className='text-lg font-semibold text-gray-900'>
                Supprimer la clé API
              </h4>
              <p className='mt-2 text-sm text-gray-600'>
                Confirmer la suppression de la clé{' '}
                <span className='font-semibold'>
                  {confirmDelete.provider?.toUpperCase()}
                </span>
                . Cette action est irréversible.
              </p>
              <div className='mt-6 flex justify-end gap-3'>
                <button
                  type='button'
                  className='rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50'
                  onClick={() =>
                    setConfirmDelete({ open: false, provider: null })
                  }
                  disabled={isDeleting}
                >
                  Annuler
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
                  {isDeleting ? 'Suppression...' : 'Supprimer'}
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
