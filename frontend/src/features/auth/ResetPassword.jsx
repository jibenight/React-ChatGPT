import '../../css/App.css';
import chatGPT from '../../assets/chatGPT.gif';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { API_BASE } from '../../apiConfig';

const ResetPassword = () => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const onSubmit = data => {
    const { password } = data;
    axios
      .post(`${API_BASE}/reset-password`, {
        token,
        newPassword: password,
      })
      .then(response => {
        if (response.status === 200) {
          alert('Mot de passe réinitialisé avec succès.');
          navigate('/login');
        }
      })
      .catch(error => {
        if (error.response) {
          alert('Erreur: ' + (error.response.data.error || 'Une erreur est survenue.'));
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
            Nouveau mot de passe
          </h2>
          <p className='mb-12 font-medium text-lg text-gray-600 leading-normal'>
            Entrez votre nouveau mot de passe.
          </p>
          <form onSubmit={handleSubmit(onSubmit)}>
            <label className='block mb-5'>
              <input
                className='px-4 py-3.5 w-full text-gray-500 font-medium placeholder-gray-500 bg-white outline-none border border-gray-300 rounded-lg focus:ring focus:ring-teal-200'
                id='resetPasswordInput'
                type='password'
                placeholder='Nouveau mot de passe'
                {...register('password', {
                  required: true,
                  pattern: /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/
                })}
                autoComplete='new-password'
              />
              {errors.password && errors.password.type === 'pattern' && (
                <span className='text-red-500 text-sm'>
                  Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre.
                </span>
              )}
            </label>
            <button
              className='mb-8 py-4 px-9 w-full text-white font-semibold border border-teal-500 rounded-xl shadow-4xl focus:ring focus:ring-teal-200 bg-teal-400 hover:bg-teal-500 transition ease-in-out duration-200'
              type='submit'
            >
              Réinitialiser le mot de passe
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default ResetPassword;
