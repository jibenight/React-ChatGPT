import '../../css/App.css';
import React, { useState } from 'react';
import code from '../../assets/code.gif';
import { NavLink } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import seePassword from '../../assets/eye.svg';
import hidePassword from '../../assets/no-eye.svg';
import { API_BASE } from '../../apiConfig';

const Register = ({ isModal, onSwitchToLogin }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [isResending, setIsResending] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm();

  const onSubmit = data => {
    const { name, email, password } = data;
    axios
      .post(`${API_BASE}/register`, {
        username: name,
        email,
        password,
      })
      .then(response => {
        setSuccessMessage(
          "Compte créé. Vérifiez votre e-mail pour activer votre compte.",
        );
        setErrorMessage('');
        setVerificationEmail(email);
        reset();
      })
      .catch(error => {
        if (error.response.data.error === 'exists') {
          setErrorMessage('Cet e-mail existe déjà');
        } else if (error.response.data.error === 'characters') {
          setErrorMessage(
            'Le mot de passe doit contenir au moins 8 caractères, une majuscule et un chiffre',
          );
        } else {
          setErrorMessage('Une erreur est survenue');
        }
      });
  };

  const handleResendVerification = async () => {
    if (!verificationEmail) return;
    setIsResending(true);
    setErrorMessage('');
    try {
      await axios.post(`${API_BASE}/verify-email-request`, {
        email: verificationEmail,
      });
      setSuccessMessage("E-mail de vérification renvoyé.");
    } catch (error) {
      if (error.response?.status === 404) {
        setErrorMessage('E-mail introuvable.');
      } else {
        setErrorMessage("Impossible d'envoyer l'e-mail.");
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <section
      className={
        isModal
          ? 'relative py-8 bg-white dark:bg-slate-950'
          : 'relative py-16 xl:pb-56 bg-white overflow-hidden dark:bg-slate-950'
      }
    >
      {!isModal && (
        <div className='absolute left-6 top-6'>
          <NavLink
            to='/'
            className='inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 shadow-sm transition hover:border-teal-200 hover:text-teal-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-teal-500/40 dark:hover:text-teal-200'
          >
            Retour accueil
          </NavLink>
        </div>
      )}
      <div className='container px-4 mx-auto'>
        <div className='text-center max-w-md mx-auto'>
          <div className='inline-block w-32'>
            <img src={code} alt='Gif annimé robot' />
          </div>
          <h2 className='mb-9 text-6xl md:text-5xl text-center font-bold font-heading tracking-px-n leading-tight text-gray-900 dark:text-slate-100'>
            Créez un compte et commencez.
          </h2>
          <form onSubmit={handleSubmit(onSubmit)}>
            <label className='block mb-5'>
              <input
                className='px-4 py-3.5 w-full text-gray-500 font-medium placeholder-gray-500 bg-white outline-none border border-gray-300 rounded-lg focus:ring focus:ring-teal-300 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500 dark:border-slate-700 dark:focus:ring-teal-400/30'
                id='signUpInput2-1'
                type='text'
                placeholder="Nom d'utilisateur"
                autoComplete='name'
                {...register('name', { required: true })}
              />
            </label>
            <label className='block mb-5'>
              <input
                className='px-4 py-3.5 w-full text-gray-500 font-medium placeholder-gray-500 bg-white outline-none border border-gray-300 rounded-lg focus:ring focus:ring-teal-300 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500 dark:border-slate-700 dark:focus:ring-teal-400/30'
                id='signUpInput2-2'
                type='text'
                placeholder='Adresse e-mail'
                autoComplete='email'
                {...register('email', { required: true })}
              />
            </label>

            <label className='block mb-5 relative'>
              <input
                className='px-4 py-3.5 w-full text-gray-500 font-medium placeholder-gray-500 bg-white outline-none border border-gray-300 rounded-lg focus:ring focus:ring-teal-300 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500 dark:border-slate-700 dark:focus:ring-teal-400/30'
                id='signUpInput2-3'
                type={showPassword ? 'text' : 'password'}
                placeholder='Créer un mot de passe'
                autoComplete='new-password'
                {...register('password', { required: true })}
              />
              <button
                type='button'
                onClick={togglePasswordVisibility}
                className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-teal-500 dark:text-slate-400 dark:hover:text-teal-300'
              >
                {showPassword ? (
                  <img src={seePassword} alt='Masquer le mot de passe' />
                ) : (
                  <img src={hidePassword} alt='Afficher le mot de passe' />
                )}
              </button>
            </label>
            <label className='block mb-1 relative'>
              <input
                className='px-4 py-3.5 w-full text-gray-500 font-medium placeholder-gray-500 bg-white outline-none border border-gray-300 rounded-lg focus:ring focus:ring-teal-300 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500 dark:border-slate-700 dark:focus:ring-teal-400/30'
                id='signUpInput2-4'
                type={showPassword ? 'text' : 'password'}
                placeholder='Confirmer le mot de passe'
                autoComplete='new-password'
                {...register('confirmPassword', {
                  required: true,
                  validate: value =>
                    value === watch('password') ||
                    'Les mots de passe ne correspondent pas',
                })}
              />
              <button
                type='button'
                onClick={togglePasswordVisibility}
                className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-teal-500 dark:text-slate-400 dark:hover:text-teal-300'
              >
                {showPassword ? (
                  <img src={seePassword} alt='Masquer le mot de passe' />
                ) : (
                  <img src={hidePassword} alt='Afficher le mot de passe' />
                )}
              </button>
            </label>
            <p className='font-thin text-xs italic mb-5 text-gray-500 dark:text-slate-400'>
              Le mot de passe doit contenir au moins 8 caractères, une
              majuscule et un chiffre
            </p>
            {/* 
            {errorMessage && (
              <p className='text-red-500 mb-5'>{errorMessage}</p>
            )} */}

            {errors.confirmPassword && (
              <p className='text-red-500 mb-5 dark:text-red-300'>
                {errors.confirmPassword.message}
              </p>
            )}

            {errorMessage && (
              <p className='text-red-500 mb-5 dark:text-red-300'>
                {errorMessage}
              </p>
            )}

            {successMessage && (
              <p className='text-green-500 mb-5 dark:text-emerald-300'>
                {successMessage}
              </p>
            )}

            {verificationEmail && (
              <button
                type='button'
                className='mb-6 w-full rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-700 transition hover:bg-teal-100 dark:border-teal-500/40 dark:bg-teal-500/10 dark:text-teal-200 dark:hover:bg-teal-500/20 disabled:cursor-not-allowed disabled:opacity-60'
                onClick={handleResendVerification}
                disabled={isResending}
              >
                {isResending
                  ? 'Envoi en cours...'
                  : "Renvoyer l'e-mail de vérification"}
              </button>
            )}

            <button
              className='mb-8 py-4 px-9 w-full text-white font-semibold border border-teal-500 rounded-xl shadow-xl focus:ring focus:ring-teal-300 bg-teal-400 hover:bg-teal-500 transition ease-in-out duration-200 dark:focus:ring-teal-400/30'
              type='submit'
            >
              Créer un compte
            </button>
            <p className='font-medium text-gray-700 dark:text-slate-300'>
              <span>Déjà un compte ? </span>
              <span className='text-teal-600 hover:text-teal-700 cursor-pointer dark:text-teal-300 dark:hover:text-teal-200'>
                {isModal && onSwitchToLogin ? (
                  <a
                    onClick={e => {
                      e.preventDefault();
                      onSwitchToLogin();
                    }}
                  >
                    Se connecter
                  </a>
                ) : (
                  <NavLink to='/login'>Se connecter</NavLink>
                )}
              </span>
            </p>
          </form>
        </div>
      </div>
    </section>
  );
};

export default Register;
