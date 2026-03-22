import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MatrixBackground from '@/components/common/MatrixBackground';
import { useUser } from '@/UserContext';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setUserData } = useUser();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL || '';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError(t('auth:emailRequired'));
      return;
    }
    if (!password) {
      setError(t('auth:passwordRequired'));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403 && data?.error?.includes('verify')) {
          setError(t('auth:emailNotVerified'));
        } else {
          setError(t('auth:invalidCredentials'));
        }
        return;
      }

      const user = data.user ?? data;
      const normalized = {
        id: user.id,
        userId: user.id,
        username: user.username,
        email: user.email,
      };
      setUserData(normalized);
      localStorage.setItem('user', JSON.stringify(normalized));
      navigate('/chat');
    } catch {
      setError(t('auth:invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='relative min-h-screen flex items-center justify-center bg-background overflow-hidden'>
      <MatrixBackground />

      <div className='relative z-10 w-full max-w-sm mx-4'>
        <div className='bg-background/80 dark:bg-background/90 backdrop-blur-md border border-border rounded-2xl shadow-xl p-8'>
          <div className='mb-8 text-center'>
            <div className='inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4'>
              <span className='text-2xl'>✦</span>
            </div>
            <h1 className='text-2xl font-bold text-foreground'>{t('auth:loginTitle')}</h1>
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

            <div>
              <label className='block text-sm font-medium text-foreground mb-1.5'>
                {t('auth:password')}
              </label>
              <input
                type='password'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth:passwordPlaceholder')}
                autoComplete='current-password'
                className='w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow'
              />
            </div>

            <div className='flex justify-end'>
              <Link
                to='/reset-password'
                className='text-xs text-muted-foreground hover:text-primary transition-colors'
              >
                {t('auth:forgotPassword')}
              </Link>
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
              {loading ? t('auth:connecting') : t('auth:loginButton')}
            </button>
          </form>

          <p className='mt-6 text-center text-sm text-muted-foreground'>
            {t('auth:noAccount')}{' '}
            <Link to='/register' className='font-medium text-primary hover:underline'>
              {t('auth:createAccount')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
