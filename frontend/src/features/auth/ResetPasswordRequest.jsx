import '../../css/App.css';
import chatGPT from '../../assets/chatGPT.gif';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import React from 'react';
import { useState } from 'react';
import { API_BASE } from '../../apiConfig';

const ResetPasswordRequest = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const [status, setStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async data => {
    const { email } = data;
    setStatus(null);
    setIsSubmitting(true);
    try {
      await axios.post(`${API_BASE}/reset-password-request`, {
        email,
      });
      setStatus({
        type: 'success',
        message:
          "Si un compte existe pour cet e-mail, un lien de réinitialisation a été envoyé.",
      });
    } catch (error) {
      setStatus({
        type: 'success',
        message:
          "Si un compte existe pour cet e-mail, un lien de réinitialisation a été envoyé.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className='relative py-16 xl:pb-56 bg-white overflow-hidden h-screen w-screen dark:bg-slate-950'>
      <div className='absolute left-6 top-6'>
        <a
          href='/'
          className='inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 shadow-sm transition hover:border-teal-200 hover:text-teal-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-teal-500/40 dark:hover:text-teal-200'
        >
          Retour accueil
        </a>
      </div>
      <div className='container px-4 mx-auto'>
        <div className='text-center max-w-md mx-auto'>
          <div className='inline-block w-32'>
            <img src={chatGPT} alt='Gif animé robot' />
          </div>
          <h2 className='mb-4 text-6xl md:text-7xl text-center font-bold font-heading tracking-px-n leading-tight text-gray-900 dark:text-slate-100'>
            Réinitialisation du mot de passe
          </h2>
          <p className='mb-12 font-medium text-lg text-gray-600 leading-normal dark:text-slate-300'>
            Entrez votre adresse e-mail et nous vous enverrons un lien pour
            réinitialiser votre mot de passe.
          </p>
          <form onSubmit={handleSubmit(onSubmit)}>
            <label className='block mb-5'>
              <input
                className='px-4 py-3.5 w-full text-gray-500 font-medium placeholder-gray-500 bg-white outline-none border border-gray-300 rounded-lg focus:ring focus:ring-teal-200 dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500 dark:border-slate-700 dark:focus:ring-teal-400/30'
                id='resetPasswordInput'
                type='text'
                placeholder='Adresse e-mail'
                {...register('email', { required: true })}
                autoComplete='email'
              />
            </label>
            <button
              className='mb-6 py-4 px-9 w-full text-white font-semibold border border-teal-500 rounded-xl shadow-xl focus:ring focus:ring-teal-200 bg-teal-400 hover:bg-teal-500 transition ease-in-out duration-200 dark:focus:ring-teal-400/30 disabled:cursor-not-allowed disabled:opacity-60'
              type='submit'
              disabled={isSubmitting}
            >
              {isSubmitting
                ? 'Envoi en cours...'
                : 'Envoyer le lien de réinitialisation'}
            </button>
            {errors.email && (
              <p className='mb-4 text-sm text-red-500 dark:text-red-300'>
                L'adresse e-mail est requise.
              </p>
            )}
            {status && (
              <p
                className={`text-sm ${
                  status.type === 'success'
                    ? 'text-emerald-600 dark:text-emerald-300'
                    : 'text-red-500 dark:text-red-300'
                }`}
              >
                {status.message}
              </p>
            )}
          </form>
        </div>
      </div>
    </section>
  );
};

export default ResetPasswordRequest;
