import '../css/App.css';
import chatGPT from '../assets/chatGPT.gif';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import React from 'react';

const ResetPasswordRequest = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = data => {
    const { email } = data;
    axios
      .post('http://localhost:5173/reset-password-request', {
        email,
      })
      .then(response => {
        if (response.status === 200) {
          // Gérer la réponse réussie ici, par exemple :
          alert('Email de réinitialisation envoyé.');
        }
      })
      .catch(error => {
        if (error.response && error.response.status === 404) {
          // Gérer les erreurs ici, par exemple :
          alert('Email non trouvé.');
        }
      });
  };

  return (
    <section className='py-16 xl:pb-56 bg-white overflow-hidden h-screen w-screen'>
      <div className='container px-4 mx-auto'>
        <div className='text-center max-w-md mx-auto'>
          <div className='inline-block w-32'>
            <img src={chatGPT} alt='Gif animé robot' />
          </div>
          <h2 className='mb-4 text-6xl md:text-7xl text-center font-bold font-heading tracking-px-n leading-tight'>
            Réinitialisation du mot de passe
          </h2>
          <p className='mb-12 font-medium text-lg text-gray-600 leading-normal'>
            Entrez votre adresse e-mail et nous vous enverrons un lien pour
            réinitialiser votre mot de passe.
          </p>
          <form onSubmit={handleSubmit(onSubmit)}>
            <label className='block mb-5'>
              <input
                className='px-4 py-3.5 w-full text-gray-500 font-medium placeholder-gray-500 bg-white outline-none border border-gray-300 rounded-lg focus:ring focus:ring-teal-200'
                id='resetPasswordInput'
                type='text'
                placeholder='Adresse e-mail'
                {...register('email', { required: true })}
                autoComplete='email'
              />
            </label>
            <button
              className='mb-8 py-4 px-9 w-full text-white font-semibold border border-teal-500 rounded-xl shadow-4xl focus:ring focus:ring-teal-200 bg-teal-400 hover:bg-teal-500 transition ease-in-out duration-200'
              type='submit'
            >
              Envoyer le lien de réinitialisation
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default ResetPasswordRequest;
