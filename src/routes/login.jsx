import '../css/App.css';
import React, { useState } from 'react';
import chatGPT from '../assets/chatGPT.gif';

const Login = () => {
  return (
    <section className='py-16 xl:pb-56 bg-white overflow-hidden h-screen w-screen'>
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
          <form>
            <label className='block mb-5'>
              <input
                className='px-4 py-3.5 w-full text-gray-500 font-medium placeholder-gray-500 bg-white outline-none border border-gray-300 rounded-lg focus:ring focus:ring-teal-200'
                id='signInInput2-1'
                type='text'
                placeholder='Email address'
              />
            </label>
            <label className='relative block mb-5'>
              <div className='absolute right-4 top-1/2 transform -translate-y-1/2'>
                <a
                  className='text-sm text-teal-600 hover:text-teal-700 font-medium'
                  href='#'
                >
                  Forgot Password?
                </a>
              </div>
              <input
                className='px-4 pr-36 py-3.5 w-full text-gray-500 font-medium placeholder-gray-500 bg-white outline-none border border-gray-300 rounded-lg focus:ring focus:ring-teal-200'
                id='signInInput2-2'
                type='password'
                placeholder='Password'
              />
            </label>
            <button
              className='mb-8 py-4 px-9 w-full text-white font-semibold border border-teal-500 rounded-xl shadow-4xl focus:ring focus:ring-teal-200 bg-teal-400 hover:bg-teal-500 transition ease-in-out duration-200'
              type='button'
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