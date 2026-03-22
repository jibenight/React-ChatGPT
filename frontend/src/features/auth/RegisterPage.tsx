import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MatrixBackground from '@/components/common/MatrixBackground';

export default function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL || '';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError(t('auth:usernameRequired'));
      return;
    }
    if (!email) {
      setError(t('auth:emailRequired'));
      return;
    }
    if (!password) {
      setError(t('auth:passwordRequired'));
      return;
    }
    if (password.length < 8) {
      setError(t('auth:passwordTooShort'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('auth:passwordMismatch'));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: username.trim(), email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data?.error?.toLowerCase().includes('email')) {
          setError(t('auth:emailTaken'));
        } else {
          setError(data?.error || t('common:error'));
        }
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
      <div className='relative min-h-screen flex items-center justify-center bg-background overflow-hidden'>
        <MatrixBackground />
        <div className='relative z-10 w-full max-w-sm mx-4'>
          <div className='bg-background/80 dark:bg-background/90 backdrop-blur-md border border-border rounded-2xl shadow-xl p-8 text-center'>
            <div className='inline-flex items-center justify-center w-12 h-12 rounded-xl bg-green-500/10 mb-4'>
              <span className='text-2xl'>✓</span>
            </div>
            <h1 className='text-xl font-bold text-foreground mb-2'>
              {t('auth:registerSuccess')}
            </h1>
            <p className='text-sm text-muted-foreground mb-6'>
              {t('auth:checkEmail')}
            </p>
            <button
              onClick={() => navigate('/login')}
              className='w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90'
            >
              {t('auth:loginButton')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='relative min-h-screen flex items-center justify-center bg-background overflow-hidden'>
      <MatrixBackground />

      <div className='relative z-10 w-full max-w-sm mx-4'>
        <div className='bg-background/80 dark:bg-background/90 backdrop-blur-md border border-border rounded-2xl shadow-xl p-8'>
          <div className='mb-8 text-center'>
            <div className='inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4'>
              <span className='text-2xl'>✦</span>
            </div>
            <h1 className='text-2xl font-bold text-foreground'>{t('auth:registerTitle')}</h1>
          </div>

          <form onSubmit={handleSubmit} className='space-y-4'>
            <div>
              <label className='block text-sm font-medium text-foreground mb-1.5'>
                {t('auth:username')}
              </label>
              <input
                type='text'
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t('auth:usernamePlaceholder')}
                autoComplete='username'
                className='w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow'
              />
            </div>

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

            <div>
              <label className='block text-sm font-medium text-foreground mb-1.5'>
                {t('auth:password')}
              </label>
              <input
                type='password'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
              {loading ? t('auth:registering') : t('auth:registerButton')}
            </button>
          </form>

          <p className='mt-6 text-center text-sm text-muted-foreground'>
            {t('auth:alreadyAccount')}{' '}
            <Link to='/login' className='font-medium text-primary hover:underline'>
              {t('auth:loginButton')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
