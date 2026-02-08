import '../../css/App.css';
import chatGPT from '../../assets/chatGPT.gif';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../../apiClient';
import React, { useState, useEffect } from 'react';
import { useUser } from '../../UserContext';

type LoginProps = {
  isModal?: boolean;
};

const Login = ({ isModal }: LoginProps) => {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({ mode: 'onChange' });
  const { userData, setUserData } = useUser();
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const emailError = errors.email?.message;
  const passwordError = errors.password?.message;

  const onSubmit = data => {
    const { email, password } = data;
    setIsSubmitting(true);
    apiClient
      .post('/login', {
        email,
        password,
      })
      .then(response => {
        if (response.status === 200) {
          const { userId, username, email } = response.data;
          const normalizedUser = { id: userId, userId, username, email };
          localStorage.setItem(
            'user',
            JSON.stringify(normalizedUser),
          );
          setUserData(normalizedUser);
          setErrorMessage('');
          setInfoMessage('');
          navigate('/chat');
        }
      })
      .catch(error => {
        if (!error.response) {
          setErrorMessage('Serveur injoignable. Vérifie que le serveur tourne.');
          setInfoMessage('');
          return;
        }
        const status = error.response.status;
        const apiError = error.response.data?.error;
        if (status === 401 && apiError === 'invalid_credentials') {
          setErrorMessage('Identifiants invalides.');
          setInfoMessage('');
        } else if (status === 403 && apiError === 'email_not_verified') {
          setErrorMessage('Email non vérifié. Vérifie ta boîte de réception.');
          setInfoMessage("Tu peux renvoyer l'e-mail de vérification.");
        } else if (apiError) {
          setErrorMessage(apiError);
          setInfoMessage('');
        } else {
          setErrorMessage('Une erreur est survenue.');
          setInfoMessage('');
        }
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const handleResendVerification = async () => {
    const email = watch('email');
    if (!email) {
      setErrorMessage("Renseigne ton e-mail pour renvoyer la vérification.");
      setInfoMessage('');
      return;
    }
    if (resendCooldown > 0) return;
    setIsResending(true);
    setErrorMessage('');
    setInfoMessage('');
    try {
      await apiClient.post('/verify-email-request', { email });
      setInfoMessage(
        "Si un compte existe pour cet e-mail, un lien de vérification a été renvoyé.",
      );
      setResendCooldown(60);
    } catch (resendError) {
      setInfoMessage(
        "Si un compte existe pour cet e-mail, un lien de vérification a été renvoyé.",
      );
      setResendCooldown(60);
    } finally {
      setIsResending(false);
    }
  };

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const timer = setInterval(() => {
      setResendCooldown(value => Math.max(0, value - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  return (
      <section
        className={
          isModal
            ? 'relative py-8 bg-white dark:bg-slate-950'
            : 'relative py-16 xl:pb-56 bg-white overflow-hidden h-screen w-screen dark:bg-slate-950'
        }
      >
        {!isModal && (
          <div className='absolute left-6 top-6'>
            <Link
              to='/'
              className='inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 shadow-sm transition hover:border-teal-200 hover:text-teal-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-teal-500/40 dark:hover:text-teal-200'
            >
              Retour accueil
            </Link>
          </div>
        )}
      <div className='container px-4 mx-auto'>
        <div className='text-center max-w-md mx-auto'>
          <div className='inline-block w-32'>
            <img src={chatGPT} alt='Gif annimé robot' />
          </div>
          <h2 className='mb-4 text-6xl md:text-7xl text-center font-bold font-heading tracking-px-n leading-tight text-gray-900 dark:text-slate-100'>
            Bon retour
          </h2>
          <p className='mb-12 font-medium text-lg text-gray-600 leading-normal dark:text-slate-300'>
            Connectez-vous pour retrouver vos conversations et vos projets.
          </p>
          <form onSubmit={handleSubmit(onSubmit)}>
            <label className='block mb-5'>
              <input
                className='px-4 py-3.5 w-full text-gray-500 font-medium placeholder-gray-500 bg-white outline-none border border-gray-300 rounded-lg focus:ring focus:ring-teal-200 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500 dark:border-slate-700 dark:focus:ring-teal-400/30'
                id='signInInput2-1'
                type='text'
                placeholder='Adresse e-mail'
                aria-label='Adresse e-mail'
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'login-email-error' : undefined}
                {...register('email', {
                  required: 'Adresse e-mail requise',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Adresse e-mail invalide',
                  },
                })}
                autoComplete='email'
              />
            </label>
            {errors.email && (
              <p id='login-email-error' role='alert' className='text-red-500 mb-4 text-sm dark:text-red-300'>
                {typeof emailError === 'string' ? emailError : 'Erreur'}
              </p>
            )}
            <label className='relative block mb-5'>
              <div className='absolute right-4 top-1/2 transform -translate-y-1/2'>
                <Link
                  className='text-sm text-teal-600 hover:text-teal-700 font-medium dark:text-teal-300 dark:hover:text-teal-200'
                  to='/reset-password-request'
                >
                  Mot de passe oublié ?
                </Link>
              </div>
              <input
                className='px-4 pr-36 py-3.5 w-full text-gray-500 font-medium placeholder-gray-500 bg-white outline-none border border-gray-300 rounded-lg focus:ring focus:ring-teal-200 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500 dark:border-slate-700 dark:focus:ring-teal-400/30'
                id='signInInput2-2'
                type='password'
                placeholder='Mot de passe'
                aria-label='Mot de passe'
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'login-password-error' : undefined}
                {...register('password', {
                  required: 'Mot de passe requis',
                })}
                autoComplete='current-password'
              />
            </label>
            {errors.password && (
              <p id='login-password-error' role='alert' className='text-red-500 mb-4 text-sm dark:text-red-300'>
                {typeof passwordError === 'string' ? passwordError : 'Erreur'}
              </p>
            )}
            <button
              className='mb-8 py-4 px-9 w-full text-white font-semibold border border-teal-500 rounded-xl shadow-xl focus:ring focus:ring-teal-200 bg-teal-400 hover:bg-teal-500 transition ease-in-out duration-200 dark:focus:ring-teal-400/30 disabled:cursor-not-allowed disabled:opacity-60'
              type='submit'
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Connexion en cours...' : 'Se connecter'}
            </button>
            {errorMessage && (
              <p role='alert' className='text-red-500 mb-3 dark:text-red-300'>{errorMessage}</p>
            )}
            {infoMessage && (
              <p className='text-emerald-600 mb-4 dark:text-emerald-300'>
                {infoMessage}
              </p>
            )}
            {errorMessage.includes('Email non vérifié') && (
              <button
                type='button'
                className='w-full rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-700 transition hover:bg-teal-100 dark:border-teal-500/40 dark:bg-teal-500/10 dark:text-teal-200 dark:hover:bg-teal-500/20 disabled:cursor-not-allowed disabled:opacity-60'
                onClick={handleResendVerification}
                disabled={isResending || resendCooldown > 0}
              >
                {isResending
                  ? 'Envoi en cours...'
                  : resendCooldown > 0
                    ? `Renvoyer dans ${resendCooldown}s`
                    : "Renvoyer l'e-mail de vérification"}
              </button>
            )}
          </form>
        </div>
      </div>
    </section>
  );
};

export default Login;
