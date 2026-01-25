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
        setSuccessMessage('Compte créé avec succès');
        setErrorMessage('');
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

  return (
    <section
      className={
        isModal ? 'py-8 bg-white' : 'py-16 xl:pb-56 bg-white overflow-hidden'
      }
    >
      <div className='container px-4 mx-auto'>
        <div className='text-center max-w-md mx-auto'>
          <div className='inline-block w-32'>
            <img src={code} alt='Gif annimé robot' />
          </div>
          <h2 className='mb-9 text-6xl md:text-5xl text-center font-bold font-heading tracking-px-n leading-tight'>
            Créez un compte et commencez.
          </h2>
          <form onSubmit={handleSubmit(onSubmit)}>
            <label className='block mb-5'>
              <input
                className='px-4 py-3.5 w-full text-gray-500 font-medium placeholder-gray-500 bg-white outline-none border border-gray-300 rounded-lg focus:ring focus:ring-teal-300'
                id='signUpInput2-1'
                type='text'
                placeholder="Nom d'utilisateur"
                autoComplete='name'
                {...register('name', { required: true })}
              />
            </label>
            <label className='block mb-5'>
              <input
                className='px-4 py-3.5 w-full text-gray-500 font-medium placeholder-gray-500 bg-white outline-none border border-gray-300 rounded-lg focus:ring focus:ring-teal-300'
                id='signUpInput2-2'
                type='text'
                placeholder='Adresse e-mail'
                autoComplete='email'
                {...register('email', { required: true })}
              />
            </label>

            <label className='block mb-5 relative'>
              <input
                className='px-4 py-3.5 w-full text-gray-500 font-medium placeholder-gray-500 bg-white outline-none border border-gray-300 rounded-lg focus:ring focus:ring-teal-300'
                id='signUpInput2-3'
                type={showPassword ? 'text' : 'password'}
                placeholder='Créer un mot de passe'
                autoComplete='new-password'
                {...register('password', { required: true })}
              />
              <button
                type='button'
                onClick={togglePasswordVisibility}
                className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-teal-500'
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
                className='px-4 py-3.5 w-full text-gray-500 font-medium placeholder-gray-500 bg-white outline-none border border-gray-300 rounded-lg focus:ring focus:ring-teal-300'
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
                className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-teal-500'
              >
                {showPassword ? (
                  <img src={seePassword} alt='Masquer le mot de passe' />
                ) : (
                  <img src={hidePassword} alt='Afficher le mot de passe' />
                )}
              </button>
            </label>
            <p className='font-thin text-xs italic mb-5'>
              Le mot de passe doit contenir au moins 8 caractères, une
              majuscule et un chiffre
            </p>
            {/* 
            {errorMessage && (
              <p className='text-red-500 mb-5'>{errorMessage}</p>
            )} */}

            {errors.confirmPassword && (
              <p className='text-red-500 mb-5'>
                {errors.confirmPassword.message}
              </p>
            )}

            {successMessage && (
              <p className='text-green-500 mb-5'>{successMessage}</p>
            )}

            <button
              className='mb-8 py-4 px-9 w-full text-white font-semibold border border-teal-500 rounded-xl shadow-xl focus:ring focus:ring-teal-300 bg-teal-400 hover:bg-teal-500 transition ease-in-out duration-200'
              type='submit'
            >
              Créer un compte
            </button>
            <p className='font-medium'>
              <span>Déjà un compte ? </span>
              <span className='text-teal-600 hover:text-teal-700 cursor-pointer'>
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
