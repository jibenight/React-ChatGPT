import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import codeGif from '../../assets/code.gif';
import MatrixBackground from '../../components/common/MatrixBackground';
import Login from '../auth/Login';
import Register from '../auth/Register';
import Modal from '../../components/common/Modal.jsx';

function Home() {
  // Vérification simple de la présence du token pour adapter l'interface
  const [modalOpen, setModalOpen] = useState(null); // 'login', 'register' ou null
  const isAuthenticated = !!localStorage.getItem('token');

  return (
    <div className='min-h-screen bg-gray-50 flex flex-col font-sans'>
      {/* Navigation */}
      <nav className='bg-white shadow-sm sticky top-0 z-50'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between h-16 items-center'>
            <div className='flex-shrink-0 flex items-center gap-2'>
              <div className='h-8 w-8 bg-teal-400 rounded-full flex items-center justify-center shadow-sm'>
                <span className='text-white font-bold text-sm'>IA</span>
              </div>
              <h1 className='text-2xl font-bold text-gray-800 tracking-tight'>
                ChatBot
              </h1>
            </div>
            <div className='flex space-x-4 items-center'>
              {isAuthenticated ? (
                <Link
                  to='/chat'
                  className='bg-teal-400 hover:bg-teal-500 text-white px-5 py-2 rounded-xl text-sm font-semibold shadow-md transition duration-200 ease-in-out transform hover:scale-105 focus:ring focus:ring-teal-200'
                >
                  Accéder au Chat
                </Link>
              ) : (
                <>
                  <button
                    onClick={() => setModalOpen('login')}
                    className='text-gray-600 hover:text-teal-600 px-3 py-2 rounded-md text-sm font-medium transition duration-200 bg-transparent border-none cursor-pointer'
                  >
                    Connexion
                  </button>
                  <button
                    onClick={() => setModalOpen('register')}
                    className='bg-teal-400 hover:bg-teal-500 text-white px-5 py-2 rounded-xl text-sm font-semibold shadow-md transition duration-200 ease-in-out transform hover:scale-105 focus:ring focus:ring-teal-200 border-none cursor-pointer'
                  >
                    Inscription
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className='relative min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white overflow-hidden'>
        <MatrixBackground />
        <div className='relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center'>
          <img
            src={codeGif}
            alt='Animation de code'
            className='mx-auto w-48 mb-8'
          />
          <h2 className='text-5xl tracking-tight font-extrabold text-gray-900 sm:text-6xl md:text-7xl mb-6'>
            <span className='block'>Discutez avec</span>
            <span className='p-2 block text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-teal-600'>
              l'intelligence artificielle
            </span>
          </h2>
          <p className='mt-4 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl leading-relaxed'>
            Accédez aux modèles d'IA les plus performants (OpenAI, Gemini,
            Claude, Mistral) via une interface unique, sécurisée et conviviale.
          </p>
          <div className='mt-10 max-w-md mx-auto sm:flex sm:justify-center gap-4'>
            {isAuthenticated ? (
              <div className='rounded-md shadow'>
                <Link
                  to='/chat'
                  className='w-full flex items-center justify-center px-8 py-4 border border-transparent text-lg font-bold rounded-xl text-white bg-teal-400 hover:bg-teal-500 md:py-4 md:text-xl transition duration-200 ease-in-out shadow-lg focus:ring focus:ring-teal-200'
                >
                  Reprendre la conversation
                </Link>
              </div>
            ) : (
              <div className='rounded-md shadow'>
                <button
                  onClick={() => setModalOpen('register')}
                  className='w-full flex items-center justify-center px-8 py-4 border border-transparent text-lg font-bold rounded-xl text-white bg-teal-400 hover:bg-teal-500 md:py-4 md:text-xl transition duration-200 ease-in-out shadow-lg focus:ring focus:ring-teal-200 cursor-pointer'
                >
                  Commencer gratuitement
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className='bg-white py-24 border-t border-gray-100'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='lg:text-center mb-16'>
            <p className='text-base text-teal-600 font-semibold tracking-wide uppercase'>
              Fonctionnalités
            </p>
            <h3 className='mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl'>
              Une plateforme, plusieurs intelligences
            </h3>
            <p className='mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto'>
              Optimisez votre productivité en choisissant le bon outil pour
              chaque tâche.
            </p>
          </div>

          <div className='mt-10'>
            <dl className='space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-12 md:gap-y-16'>
              {[
                {
                  name: 'Multi-Modèles',
                  description:
                    'Basculez instantanément entre GPT-4, Claude 3, Gemini Pro et Mistral selon vos besoins spécifiques.',
                  icon: (
                    <svg
                      className='h-6 w-6'
                      fill='none'
                      viewBox='0 0 24 24'
                      stroke='currentColor'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth='2'
                        d='M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10'
                      />
                    </svg>
                  ),
                },
                {
                  name: 'Sécurité & Confidentialité',
                  description:
                    'Vos clés API sont chiffrées en base de données. Nous ne partageons pas vos conversations.',
                  icon: (
                    <svg
                      className='h-6 w-6'
                      fill='none'
                      viewBox='0 0 24 24'
                      stroke='currentColor'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth='2'
                        d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
                      />
                    </svg>
                  ),
                },
                {
                  name: 'Interface Moderne',
                  description:
                    'Une expérience utilisateur fluide, réactive et agréable, conçue avec les dernières technologies React.',
                  icon: (
                    <svg
                      className='h-6 w-6'
                      fill='none'
                      viewBox='0 0 24 24'
                      stroke='currentColor'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth='2'
                        d='M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
                      />
                    </svg>
                  ),
                },
                {
                  name: 'Historique Complet',
                  description:
                    'Retrouvez toutes vos conversations passées, organisées par session, pour ne jamais perdre une idée.',
                  icon: (
                    <svg
                      className='h-6 w-6'
                      fill='none'
                      viewBox='0 0 24 24'
                      stroke='currentColor'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth='2'
                        d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
                      />
                    </svg>
                  ),
                },
              ].map(feature => (
                <div key={feature.name} className='relative'>
                  <dt>
                    <div className='absolute flex items-center justify-center h-12 w-12 rounded-xl bg-teal-400 text-white shadow-lg'>
                      {feature.icon}
                    </div>
                    <p className='ml-16 text-xl leading-6 font-bold text-gray-900'>
                      {feature.name}
                    </p>
                  </dt>
                  <dd className='mt-2 ml-16 text-base text-gray-500 leading-relaxed'>
                    {feature.description}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className='bg-gray-900 text-white'>
        <div className='max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8'>
          <div className='flex flex-col md:flex-row justify-between items-center'>
            <div className='flex items-center gap-2 mb-4 md:mb-0'>
              <div className='h-6 w-6 bg-teal-500 rounded-full flex items-center justify-center'>
                <span className='text-white text-xs font-bold'>IA</span>
              </div>
              <span className='text-lg font-semibold'>ChatBot</span>
            </div>
            <p className='text-center text-sm text-gray-400'>
              &copy; {new Date().getFullYear()} Projet ChatBot IA. Tous droits
              réservés.
            </p>
          </div>
        </div>
      </footer>

      {/* Modal Central */}
      <Modal isOpen={!!modalOpen} onClose={() => setModalOpen(null)}>
        {modalOpen === 'login' && <Login isModal={true} />}
        {modalOpen === 'register' && (
          <Register
            isModal={true}
            onSwitchToLogin={() => setModalOpen('login')}
          />
        )}
      </Modal>
    </div>
  );
}

export default Home;
