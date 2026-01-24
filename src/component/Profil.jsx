import React, { useState } from 'react';
import { useUser } from '../UserContext';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { API_BASE } from '../apiConfig';

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
      Object.entries(data).filter(([key, value]) => value && value.trim()),
    );
    console.log('Submitting data:', updatedData); // Ajoutez cette ligne pour voir les données soumises

    if (Object.keys(updatedData).length === 0) {
      console.log('No data to update');
      return;
    }
    if (data.username || data.password) {
      const token = localStorage.getItem('token');
      try {
        const response = await axios.post(
          `${API_BASE}/api/update-user-data`,
          updatedData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
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
      const token = localStorage.getItem('token');
      try {
        const response = await axios.post(
          `${API_BASE}/api/update-api-key`,
          { apiKey: data.api_key },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        console.log('API Key updated:', response.data);
        reset({ api_key: '' });
      } catch (err) {
        console.error(err);
      }
    }
  };
  return (
    <div className='relative bg-gray-50 h-screen flex-1 overflow-y-auto'>
      <div className='max-w-3xl mx-auto px-4 py-10'>
        <h1 className='text-3xl font-bold text-gray-900 text-center mb-8'>
          Your Profile
        </h1>
        <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
          <div className='bg-white shadow rounded-xl overflow-hidden'>
            <div className='px-6 py-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center'>
              <h3 className='text-lg font-medium leading-6 text-gray-900'>
                User Information
              </h3>
              <button
                onClick={toogleProfilData}
                className='text-sm font-medium text-teal-600 hover:text-teal-500 focus:outline-none'
                type='button'
              >
                {profilData ? 'Edit' : 'Cancel'}
              </button>
            </div>

            <div className='px-6 py-5 space-y-6'>
              {userData && (
                <dl className='grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2'>
                  <div className='sm:col-span-1'>
                    <dt className='text-sm font-medium text-gray-500'>
                      Username
                    </dt>
                    <dd className='mt-1 text-sm text-gray-900'>
                      {userData.username}
                    </dd>
                  </div>
                  <div className='sm:col-span-1'>
                    <dt className='text-sm font-medium text-gray-500'>Email</dt>
                    <dd className='mt-1 text-sm text-gray-900'>
                      {userData.email}
                    </dd>
                  </div>
                  <div className='sm:col-span-2'>
                    <dt className='text-sm font-medium text-gray-500'>
                      OpenAI API Key
                    </dt>
                    <dd className='mt-1 text-sm text-gray-900'>••••••••</dd>
                  </div>
                </dl>
              )}

              {!profilData && (
                <div className='border-t border-gray-200 pt-6 mt-6'>
                  <div className='grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6'>
                    <div className='sm:col-span-4'>
                      <label className='block text-sm font-medium text-gray-700'>
                        New Username
                      </label>
                      <div className='mt-1'>
                        <input
                          {...register('username')}
                          type='text'
                          className='shadow-sm focus:ring-teal-500 focus:border-teal-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border'
                          placeholder='Enter new username'
                        />
                      </div>
                    </div>

                    <div className='sm:col-span-3'>
                      <label className='block text-sm font-medium text-gray-700'>
                        New Password
                      </label>
                      <div className='mt-1'>
                        <input
                          {...register('password')}
                          type='password'
                          className='shadow-sm focus:ring-teal-500 focus:border-teal-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border'
                          placeholder='Enter new password'
                        />
                      </div>
                    </div>

                    <div className='sm:col-span-3'>
                      <label className='block text-sm font-medium text-gray-700'>
                        Confirm Password
                      </label>
                      <div className='mt-1'>
                        <input
                          {...register('passwordConfirmation')}
                          type='password'
                          className='shadow-sm focus:ring-teal-500 focus:border-teal-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border'
                          placeholder='Confirm new password'
                        />
                      </div>
                    </div>
                    {errors.passwordConfirmation && (
                      <p className='text-red-500 text-sm sm:col-span-6'>
                        {errors.passwordConfirmation.message}
                      </p>
                    )}

                    <div className='sm:col-span-6'>
                      <label className='block text-sm font-medium text-gray-700'>
                        API Key
                      </label>
                      <div className='mt-1'>
                        <input
                          {...register('api_key')}
                          type='text'
                          className='shadow-sm focus:ring-teal-500 focus:border-teal-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border'
                          placeholder='sk-...'
                        />
                      </div>
                    </div>
                  </div>

                  <div className='mt-6 flex justify-end'>
                    <button
                      className='inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500'
                      type='submit'
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className='bg-white shadow rounded-xl overflow-hidden'>
            <div className='px-6 py-5 border-b border-gray-200 bg-red-50'>
              <h3 className='text-lg font-medium leading-6 text-red-800'>
                Danger Zone
              </h3>
            </div>
            <div className='px-6 py-5'>
              <p className='text-sm text-gray-500 mb-4'>
                Once you delete your account or API key, there is no going back.
                Please be certain.
              </p>
              <div className='flex flex-col sm:flex-row gap-3'>
                <button
                  className='inline-flex justify-center py-2 px-4 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
                  type='submit'
                >
                  Delete Account
                </button>
                <button
                  className='inline-flex justify-center py-2 px-4 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
                  type='submit'
                >
                  Delete OpenAI API
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Profil;
