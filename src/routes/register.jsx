import '../css/App.css';
import React, { useState } from 'react';
import code from '../assets/code.gif';
import { NavLink } from 'react-router-dom';

const Register = () => {
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
          <form>
            <label className='block mb-5'>
              <input
                className='px-4 py-3.5 w-full text-gray-500 font-medium placeholder-gray-500 bg-white outline-none border border-gray-300 rounded-lg focus:ring focus:ring-teal-300'
                id='signUpInput2-1'
                type='text'
                placeholder='First &amp; Last Name'
              />
            </label>
            <label className='block mb-5'>
              <input
                className='px-4 py-3.5 w-full text-gray-500 font-medium placeholder-gray-500 bg-white outline-none border border-gray-300 rounded-lg focus:ring focus:ring-teal-300'
                id='signUpInput2-2'
                type='text'
                placeholder='Email Address'
              />
            </label>
            <label className='block mb-5'>
              <input
                className='px-4 py-3.5 w-full text-gray-500 font-medium placeholder-gray-500 bg-white outline-none border border-gray-300 rounded-lg focus:ring focus:ring-teal-300'
                id='signUpInput2-3'
                type='password'
                placeholder='Create Password'
              />
            </label>
            <button
              className='mb-8 py-4 px-9 w-full text-white font-semibold border border-teal-500 rounded-xl shadow-4xl focus:ring focus:ring-teal-300 bg-teal-400 hover:bg-teal-500 transition ease-in-out duration-200'
              type='button'
            >
              Create Account
            </button>
            <p className='font-medium'>
              <span>Already have an account? </span>
              <a className='text-teal-600 hover:text-teal-700' href='#'>
                <NavLink to='/login'>Sign In</NavLink>
              </a>
            </p>
          </form>
        </div>
      </div>
    </section>
  );
};

export default Register;
