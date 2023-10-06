import React, { useState } from 'react';
import { useUser } from '../UserContext';
import { useForm } from 'react-hook-form';
import axios from 'axios';

function Profil() {
  const { userData } = useUser();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const [profilData, setprofilData] = useState(true);

  const toogleProfilData = () => {
    setprofilData(!profilData);
  };

  const onSubmit = async data => {
    try {
      await axios.post('/api/update-user-data', data);
      console.log('success');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className='relative bg-gray-100 h-screen'>
      <div className='m-5'>
        <h1 className='text-4xl italic text-center'>Your profil</h1>
      </div>
      <hr className='my-12 h-px border-t-0 bg-transparent bg-gradient-to-r from-transparent via-neutral-500 to-transparent opacity-25 dark:opacity-100' />
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className='bg-slate-200 m-5 p-5 rounded-lg'>
          {userData && (
            <>
              <p className='m-2 text-lg'>Username: {userData.username}</p>
              <p className='m-2 text-lg'>Email: {userData.email}</p>
              <p className='m-2 text-lg'>
                Password: {userData.password?.slice(0, 3)}...
              </p>
            </>
          )}
          {!profilData && (
            <>
              <input
                {...register('username', { required: true })}
                placeholder='Enter new username'
                className='mb-4 p-2 border rounded'
              />
              <input
                {...register('password', { required: true })}
                placeholder='Enter new password'
                className='mb-4 p-2 border rounded'
              />
              {errors.username && (
                <span className='text-red-500'>Username is required</span>
              )}
              {errors.password && (
                <span className='text-red-500'>Password is required</span>
              )}
            </>
          )}
          <button
            onClick={toogleProfilData}
            className='mt-5 py-2 px-6 w-28 text-white font-semibold border border-teal-500 rounded-xl shadow-4xl focus:ring focus:ring-teal-200 bg-teal-400 hover:bg-teal-500 transition ease-in-out duration-200'
            type='button'
          >
            {profilData ? 'Change' : 'Update'}
          </button>
        </div>

        <div className='bg-slate-200 m-5 p-5 rounded-lg flex flex-col'>
          <p className='m-2 text-lg'>Openai API:</p>
          <input
            {...register('api_key', { required: true })}
            placeholder='Enter new API Key'
            className='w-1/3 cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500 sm:text-sm sm:leading-6'
          />
          {errors.api_key && (
            <span className='text-red-500'>API Key is required</span>
          )}
          <button
            className='mt-5 py-2 px-6 w-28 text-white font-semibold border border-teal-500 rounded-xl shadow-4xl focus:ring focus:ring-teal-200 bg-teal-400 hover:bg-teal-500 transition ease-in-out duration-200'
            type='submit'
          >
            Update
          </button>
        </div>
      </form>
    </div>
  );
}

export default Profil;
