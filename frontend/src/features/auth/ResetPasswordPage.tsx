import { useState, type FormEvent, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MatrixBackground from '@/components/common/MatrixBackground';

const apiUrl = import.meta.env.VITE_API_URL || '';

function RequestForm() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email) {
      setError(t('auth:emailRequired'));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/reset-password-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || t('common:error'));
        return;
      }
      setSuccess(true);
    } catch {
      setError(t('common:error'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className='text-center'>
        <div className='inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4'>
          <svg className='h-6 w-6 text-primary' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
          </svg>
        </div>
        <h2 className='text-lg font-semibold text-foreground mb-2'>{t('auth:emailSent')}</h2>
        <p className='text-sm text-muted-foreground mb-6'>
          {t('auth:checkEmail')}
        </p>
        <Link to='/login' className='text-sm font-medium text-primary hover:underline'>
          {t('auth:login')}
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className='mb-8 text-center'>
        <div className='inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4'>
          <span className='text-2xl'>✦</span>
        </div>
        <h1 className='text-2xl font-bold text-foreground'>{t('auth:resetPasswordRequest')}</h1>
        <p className='mt-1 text-sm text-muted-foreground'>{t('auth:forgotPassword')}</p>
      </div>

      <form onSubmit={handleSubmit} className='space-y-4'>
        <div>
          <label className='block text-sm font-medium text-foreground mb-1.5'>
            {t('auth:email')}
          </label>
          <input
            type='email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('auth:emailPlaceholder')}
            autoComplete='email'
            className='w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow'
          />
        </div>

        {error && (
          <p className='text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2'>
            {error}
          </p>
        )}

        <button
          type='submit'
          disabled={loading}
          className='w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed'
        >
          {loading ? t('common:loading') : t('common:submit')}
        </button>
      </form>

      <p className='mt-6 text-center text-sm text-muted-foreground'>
        <Link to='/login' className='font-medium text-primary hover:underline'>
          {t('auth:login')}
        </Link>
      </p>
    </>
  );
}

function ResetForm({ token }: { token: string }) {
  const { t } = useTranslation();
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) {
      setError(t('auth:passwordTooShort'));
      return;
    }
    if (newPassword !== confirm) {
      setError(t('auth:passwordMismatch'));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token, newPassword }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || t('common:error'));
        return;
      }
      setSuccess(true);
    } catch {
      setError(t('common:error'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className='text-center'>
        <div className='inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4'>
          <svg className='h-6 w-6 text-primary' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
          </svg>
        </div>
        <h2 className='text-lg font-semibold text-foreground mb-2'>{t('auth:loginSuccess')}</h2>
        <p className='text-sm text-muted-foreground mb-6'>
          {t('auth:resetPassword')}
        </p>
        <Link to='/login' className='text-sm font-medium text-primary hover:underline'>
          {t('auth:loginButton')}
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className='mb-8 text-center'>
        <div className='inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4'>
          <span className='text-2xl'>✦</span>
        </div>
        <h1 className='text-2xl font-bold text-foreground'>{t('auth:resetPassword')}</h1>
      </div>

      <form onSubmit={handleSubmit} className='space-y-4'>
        <div>
          <label className='block text-sm font-medium text-foreground mb-1.5'>
            {t('auth:password')}
          </label>
          <input
            type='password'
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder={t('auth:passwordPlaceholder')}
            autoComplete='new-password'
            className='w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow'
          />
        </div>

        <div>
          <label className='block text-sm font-medium text-foreground mb-1.5'>
            {t('auth:confirmPassword')}
          </label>
          <input
            type='password'
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={t('auth:passwordPlaceholder')}
            autoComplete='new-password'
            className='w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow'
          />
        </div>

        {error && (
          <p className='text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2'>
            {error}
          </p>
        )}

        <button
          type='submit'
          disabled={loading}
          className='w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed'
        >
          {loading ? t('common:loading') : t('auth:resetPassword')}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    document.title = 'Réinitialisation du mot de passe';
  }, []);

  return (
    <div className='relative min-h-screen flex items-center justify-center bg-background overflow-hidden'>
      <MatrixBackground />

      <div className='relative z-10 w-full max-w-sm mx-4'>
        <div className='bg-background/80 dark:bg-background/90 backdrop-blur-md border border-border rounded-2xl shadow-xl p-8'>
          {token ? <ResetForm token={token} /> : <RequestForm />}
        </div>
      </div>
    </div>
  );
}
