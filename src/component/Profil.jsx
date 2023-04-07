import { useState } from 'react';
import { useUser } from '../UserContext';

function Profil() {
  const [profilData, setprofilData] = useState(true);
  const { userData } = useUser();

  const toogleProfilData = () => {
    setprofilData(!profilData);
  };

  return (
    <div className='relative bg-gray-100 h-screen'>
      <div className='m-5'>
        <h1 className='text-4xl italic text-center'>Your profil</h1>
      </div>
      <hr className='my-12 h-px border-t-0 bg-transparent bg-gradient-to-r from-transparent via-neutral-500 to-transparent opacity-25 dark:opacity-100' />

      <div className='bg-slate-200 m-5 p-5 rounded-lg'>
        {userData && (
          <>
            <p className='m-2 text-lg'>Username:{userData.username}</p>
            <p className='m-2 text-lg'>Email:{userData.email}</p>
            <p className='m-2 text-lg'>Password:</p>
          </>
        )}
        {profilData ? (
          <button
            onClick={toogleProfilData}
            className='mt-5 py-2 px-6 text-white font-semibold border border-teal-500 rounded-xl shadow-4xl focus:ring focus:ring-teal-200 bg-teal-400 hover:bg-teal-500 transition ease-in-out duration-200'
            type='submit'
          >
            Change
          </button>
        ) : (
          <button
            onClick={toogleProfilData}
            className='mt-5 py-2 px-6 text-white font-semibold border border-teal-500 rounded-xl shadow-4xl focus:ring focus:ring-teal-200 bg-teal-400 hover:bg-teal-500 transition ease-in-out duration-200'
            type='submit'
          >
            Update
          </button>
        )}
      </div>

      <div className='bg-slate-200 m-5 p-5 rounded-lg'>
        <p className='m-2 text-lg'>Openai API:</p>
        <button
          className='mt-5 py-2 px-6 text-white font-semibold border border-teal-500 rounded-xl shadow-4xl focus:ring focus:ring-teal-200 bg-teal-400 hover:bg-teal-500 transition ease-in-out duration-200'
          type='submit'
        >
          Update
        </button>
      </div>
    </div>
  );
}

export default Profil;
