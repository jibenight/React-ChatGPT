import '../css/App.css';
import chatGPT from '../assets/chatGPT.gif';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import React, { useState, useEffect } from 'react';
import { useUser } from '../UserContext';
import { API_BASE } from '../apiConfig';

const Login = ({ isModal }) => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();
  const { userData, setUserData } = useUser();

  const onSubmit = data => {
    const { email, password } = data;
    axios
      .post(`${API_BASE}/login`, {
        email,
        password,
      })
      .then(response => {
        if (response.status === 200) {
          const { token, userId, username, email } = response.data;
          localStorage.setItem('token', token);
          localStorage.setItem(
            'user',
            JSON.stringify({ userId, username, email }),
          );
          setUserData({
            id: userId,
            username: username,
            email: email,
          });
          window.location.href = '/';
        }
      })
      .catch(error => {
        if (error.response && error.response.status === 401) {
          if (
            error.response.data &&
            error.response.data.message === 'invalid email'
          ) {
            console.log('email invalide');
          }
        }
      });
  };

  return (
    <section
      className={
        isModal
          ? 'py-8 bg-white'
          : 'py-16 xl:pb-56 bg-white overflow-hidden h-screen w-screen'
      }
    >
      <div className='container px-4 mx-auto'>
        <div className='text-center max-w-md mx-auto'>
          <div className='inline-block w-32'>
            <img src={chatGPT} alt='Gif annimé robot' />
          </div>
          <h2 className='mb-4 text-6xl md:text-7xl text-center font-bold font-heading tracking-px-n leading-tight'>
            Welcome Back
          </h2>
          <p className='mb-12 font-medium text-lg text-gray-600 leading-normal'>
            Lorem ipsum dolor sit amet, to the con adipiscing. Volutpat tempor
            to the condim entum.
          </p>
          <form onSubmit={handleSubmit(onSubmit)}>
            <label className='block mb-5'>
              <input
                className='px-4 py-3.5 w-full text-gray-500 font-medium placeholder-gray-500 bg-white outline-none border border-gray-300 rounded-lg focus:ring focus:ring-teal-200'
                id='signInInput2-1'
                type='text'
                placeholder='Email address'
                {...register('email', { required: true })}
                autoComplete='email'
              />
            </label>
            <label className='relative block mb-5'>
              <div className='absolute right-4 top-1/2 transform -translate-y-1/2'>
                <a
                  className='text-sm text-teal-600 hover:text-teal-700 font-medium'
                  href='/reset-password-request'
                >
                  Forgot Password?
                </a>
              </div>
              <input
                className='px-4 pr-36 py-3.5 w-full text-gray-500 font-medium placeholder-gray-500 bg-white outline-none border border-gray-300 rounded-lg focus:ring focus:ring-teal-200'
                id='signInInput2-2'
                type='password'
                placeholder='Password'
                {...register('password', { required: true })}
                autoComplete='current-password'
              />
            </label>
            <button
              className='mb-8 py-4 px-9 w-full text-white font-semibold border border-teal-500 rounded-xl shadow-4xl focus:ring focus:ring-teal-200 bg-teal-400 hover:bg-teal-500 transition ease-in-out duration-200'
              type='submit'
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default Login;
