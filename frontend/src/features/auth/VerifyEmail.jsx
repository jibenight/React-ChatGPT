import '../../css/App.css';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import chatGPT from '../../assets/chatGPT.gif';
import { API_BASE } from '../../apiConfig';
import { useUser } from '../../UserContext';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUserData } = useUser();
  const [status, setStatus] = useState({ type: 'loading', message: 'Vérification en cours...' });

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus({ type: 'error', message: 'Lien de vérification invalide.' });
      return;
    }

    const verify = async () => {
      try {
        const response = await axios.get(`${API_BASE}/verify-email`, {
          params: { token },
        });
        const { token: authToken, userId, username, email } = response.data || {};
        if (authToken && userId) {
          localStorage.setItem('token', authToken);
          localStorage.setItem(
            'user',
            JSON.stringify({ userId, username, email }),
          );
          setUserData({ id: userId, username, email });
          setStatus({ type: 'success', message: 'Email vérifié. Connexion en cours...' });
          navigate('/chat');
          return;
        }
        setStatus({ type: 'success', message: 'Email vérifié. Vous pouvez vous connecter.' });
      } catch (error) {
        if (error.response?.status === 404) {
          setStatus({ type: 'error', message: 'Lien expiré ou invalide.' });
        } else {
          setStatus({ type: 'error', message: "Impossible de vérifier l'email." });
        }
      }
    };

    verify();
  }, [searchParams]);

  return (
    <section className='relative py-16 xl:pb-56 bg-white overflow-hidden h-screen w-screen dark:bg-slate-950'>
      <div className='absolute left-6 top-6'>
        <Link
          to='/'
          className='inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 shadow-sm transition hover:border-teal-200 hover:text-teal-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-teal-500/40 dark:hover:text-teal-200'
        >
          Retour accueil
        </Link>
      </div>
      <div className='container px-4 mx-auto'>
        <div className='text-center max-w-md mx-auto'>
          <div className='inline-block w-32'>
            <img src={chatGPT} alt='Gif animé robot' />
          </div>
          <h2 className='mb-4 text-5xl md:text-6xl text-center font-bold font-heading tracking-px-n leading-tight text-gray-900 dark:text-slate-100'>
            Vérification email
          </h2>
          <p
            className={`mb-6 text-lg font-medium ${
              status.type === 'success'
                ? 'text-emerald-600 dark:text-emerald-300'
                : status.type === 'error'
                  ? 'text-red-500 dark:text-red-300'
                  : 'text-gray-600 dark:text-slate-300'
            }`}
          >
            {status.message}
          </p>
          <Link
            to='/login'
            className='inline-flex items-center justify-center rounded-xl bg-teal-500 px-6 py-3 text-white font-semibold shadow-md transition hover:bg-teal-600'
          >
            Aller à la connexion
          </Link>
        </div>
      </div>
    </section>
  );
};

export default VerifyEmail;
