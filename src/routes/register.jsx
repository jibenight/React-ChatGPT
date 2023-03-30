import '../css/App.css';
import React, { useState } from 'react';
import code from '../assets/code.gif';
import { NavLink } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import axios from 'axios';
const port = 5173;

const Register = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = data => {
    const { name, email, password } = data;
    axios
      .post(`http://localhost:${port}/register`, {
        username: name,
        email,
        password,
      })
      .then(response => {
        console.log(response.data); // afficher la réponse du serveur
        // faire quelque chose en cas de succès, comme rediriger vers une autre page
      })
      .catch(error => {
        console.error(error.response.data); // afficher l'erreur du serveur
        // faire quelque chose en cas d'erreur, comme afficher un message d'erreur à l'utilisateur
      });
  };

  return (
    <section className='py-16 xl:pb-56 h-screen bg-white overflow-hidden'>
      <div className='container px-4 mx-auto'>
        <div className='text-center max-w-md mx-auto'>
          <div className='inline-block w-32'>
            <img src={code} alt='Gif annimé robot' />
          </div>
          <h2 className='mb-9 text-6xl md:text-5xl text-center font-bold font-heading tracking-px-n leading-tight'>
            Create an account &amp; get started.
          </h2>
          <form onSubmit={handleSubmit(onSubmit)}>
            <label className='block mb-5'>
              <input
                className='px-4 py-3.5 w-full text-gray-500 font-medium placeholder-gray-500 bg-white outline-none border border-gray-300 rounded-lg focus:ring focus:ring-teal-300'
                id='signUpInput2-1'
                type='text'
                placeholder='Username'
                autoComplete='name'
                {...register('name', { required: true })}
              />
            </label>
            <label className='block mb-5'>
              <input
                className='px-4 py-3.5 w-full text-gray-500 font-medium placeholder-gray-500 bg-white outline-none border border-gray-300 rounded-lg focus:ring focus:ring-teal-300'
                id='signUpInput2-2'
                type='text'
                placeholder='Email Address'
                autoComplete='email'
                {...register('email', { required: true })}
              />
            </label>
            <label className='block mb-5'>
              <input
                className='px-4 py-3.5 w-full text-gray-500 font-medium placeholder-gray-500 bg-white outline-none border border-gray-300 rounded-lg focus:ring focus:ring-teal-300'
                id='signUpInput2-3'
                type='password'
                placeholder='Create Password'
                autoComplete='new-password'
                {...register('password', { required: true })}
              />
            </label>
            <button
              className='mb-8 py-4 px-9 w-full text-white font-semibold border border-teal-500 rounded-xl shadow-4xl focus:ring focus:ring-teal-300 bg-teal-400 hover:bg-teal-500 transition ease-in-out duration-200'
              type='submit'
            >
              Create Account
            </button>
            <p className='font-medium'>
              <span>Already have an account? </span>
              <span className='text-teal-600 hover:text-teal-700' href='#'>
                <NavLink to='/login'>Sign In</NavLink>
              </span>
            </p>
          </form>
        </div>
      </div>
    </section>
  );
};

export default Register;
