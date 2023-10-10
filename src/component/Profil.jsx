import React, { useState } from 'react';
import { useUser } from '../UserContext';
import { useForm } from 'react-hook-form';
import axios from 'axios';
const port = 5173;
const token = localStorage.getItem('token');

function Profil() {
  const { userData, setUserData } = useUser();
  const [profilData, setprofilData] = useState(true);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: async data => {
      const errors = {};
      if (data.password !== data.passwordConfirmation) {
        errors.passwordConfirmation = {
          type: 'manual',
          message: 'Passwords do not match',
        };
      }
      return {
        values: data.password === data.passwordConfirmation ? data : {},
        errors,
      };
    },
  });

  const toogleProfilData = () => {
    setprofilData(!profilData);
  };

  const onSubmit = async data => {
    console.log(data);
    // Filtrer les clés-valeurs pour lesquelles les valeurs ne sont pas vides
    const updatedData = Object.fromEntries(
      Object.entries(data).filter(([key, value]) => value && value.trim())
    );
    console.log('Submitting data:', updatedData); // Ajoutez cette ligne pour voir les données soumises

    if (Object.keys(updatedData).length === 0) {
      console.log('No data to update');
      return;
    }
    if (data.username || data.password) {
      try {
        const response = await axios.post(
          `http://localhost:${port}/api/update-user-data`,
          updatedData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (response.data.message === 'User data updated successfully') {
          // Mettre à jour le contexte utilisateur avec les nouvelles données
          setUserData(prevUserData => ({
            ...prevUserData,
            username: updatedData.username || prevUserData.username, // Mise à jour conditionnelle
            password: updatedData.password || prevUserData.password, // Mise à jour conditionnelle
          }));
          reset();
        }
        toogleProfilData();
      } catch (err) {
        console.error(err);
      }
    }

    if (data.api_key) {
      try {
        const response = await axios.post(
          `http://localhost:${port}/api/update-api-key`,
          { apiKey: data.api_key },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        console.log('API Key updated:', response.data);
        reset({ api_key: '' });
      } catch (err) {
        console.error(err);
      }
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
              <p className='m-2 text-lg'>OpenAi: </p>
            </>
          )}
          {!profilData && (
            <div className='flex flex-col'>
              <input
                {...register('username')}
                placeholder='Enter new username'
                className='mb-4 p-2 border rounded'
              />
              <input
                {...register('password')}
                placeholder='Enter new password'
                className='mb-4 p-2 border rounded'
              />
              <input
                {...register('passwordConfirmation')}
                placeholder='Confirm new password'
                className='mb-4 p-2 border rounded'
              />

              <input
                {...register('api_key')}
                placeholder='Enter new API Key'
                className='mb-4 p-2 border rounded'
              />

              {errors.passwordConfirmation && (
                <span className='text-red-500'>
                  {errors.passwordConfirmation.message}
                </span>
              )}

              <button
                className='mt-5 py-2 px-6 w-28 text-white font-semibold border border-teal-500 rounded-xl shadow-4xl focus:ring focus:ring-teal-200 bg-teal-400 hover:bg-teal-500 transition ease-in-out duration-200'
                type='submit'
              >
                Update
              </button>
            </div>
          )}
          <button
            onClick={toogleProfilData}
            className='mt-5 py-2 px-6 w-28 text-white font-semibold border border-teal-500 rounded-xl shadow-4xl focus:ring focus:ring-teal-200 bg-teal-400 hover:bg-teal-500 transition ease-in-out duration-200'
            type='button'
          >
            {profilData ? 'Change' : 'Cancel'}
          </button>
        </div>

        <div className='bg-slate-200 m-5 p-5 rounded-lg'>
          <button
            className='mr-3 py-2 px-6 w-48 text-white font-semibold border border-teal-500 rounded-xl shadow-4xl focus:ring focus:ring-teal-200 bg-teal-400 hover:bg-teal-500 transition ease-in-out duration-200'
            type='submit'
          >
            Delete Account
          </button>
          <button
            className='py-2 px-6 w-48 text-white font-semibold border border-teal-500 rounded-xl shadow-4xl focus:ring focus:ring-teal-200 bg-teal-400 hover:bg-teal-500 transition ease-in-out duration-200'
            type='submit'
          >
            Delete openAi API
          </button>
        </div>
      </form>
    </div>
  );
}

export default Profil;
