import { useState, useEffect, useCallback, useRef } from 'react';
import { authenticate } from '@choochmeque/tauri-plugin-biometry-api';
import { updateUsername } from '@/tauriClient';
import { Fingerprint, User } from 'lucide-react';

const DEFAULT_USERNAME = 'Utilisateur';

interface LockScreenProps {
  onUnlocked: () => void;
  currentUsername: string;
}

export default function LockScreen({
  onUnlocked,
  currentUsername,
}: LockScreenProps) {
  const needsUsername = currentUsername === DEFAULT_USERNAME;
  const [step, setStep] = useState<'username' | 'biometric'>(
    needsUsername ? 'username' : 'biometric',
  );
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const tryAuthenticate = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      await authenticate('Déverrouillez pour accéder à l\'application', {
        allowDeviceCredential: true,
      });
      onUnlocked();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Échec de l\'authentification',
      );
    } finally {
      setLoading(false);
    }
  }, [onUnlocked]);

  // Auto-trigger biometric when entering that step
  useEffect(() => {
    if (step === 'biometric') tryAuthenticate();
  }, [step, tryAuthenticate]);

  // Focus input on username step
  useEffect(() => {
    if (step === 'username') inputRef.current?.focus();
  }, [step]);

  const handleSubmitName = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setError(null);
    setLoading(true);
    try {
      await updateUsername(trimmed);
      setStep('biometric');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Impossible de sauvegarder le nom',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='fixed inset-0 z-50 flex flex-col items-center justify-center bg-background'>
      <div className='flex flex-col items-center gap-6 text-center'>
        <div className='rounded-full bg-primary/10 p-6'>
          {step === 'username' ? (
            <User className='h-16 w-16 text-primary' />
          ) : (
            <Fingerprint className='h-16 w-16 text-primary' />
          )}
        </div>

        {step === 'username' ? (
          <>
            <div className='space-y-2'>
              <h1 className='text-2xl font-semibold text-foreground'>
                Bienvenue
              </h1>
              <p className='text-sm text-muted-foreground'>
                Choisissez votre nom d&apos;utilisateur
              </p>
            </div>

            <form onSubmit={handleSubmitName} className='flex flex-col gap-3'>
              <input
                ref={inputRef}
                type='text'
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='Votre nom'
                maxLength={100}
                className='w-64 rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary'
              />
              {error && (
                <p className='max-w-xs text-sm text-destructive'>{error}</p>
              )}
              <button
                type='submit'
                disabled={loading || !name.trim()}
                className='rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50'
              >
                {loading ? 'Enregistrement...' : 'Continuer'}
              </button>
            </form>
          </>
        ) : (
          <>
            <div className='space-y-2'>
              <h1 className='text-2xl font-semibold text-foreground'>
                Application verrouillée
              </h1>
              <p className='text-sm text-muted-foreground'>
                Utilisez la biométrie pour déverrouiller
              </p>
            </div>

            {error && (
              <p className='max-w-xs text-sm text-destructive'>{error}</p>
            )}

            <button
              onClick={tryAuthenticate}
              disabled={loading}
              className='rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50'
            >
              {loading ? 'Vérification...' : 'Déverrouiller'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
