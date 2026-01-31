import '../../css/App.css';
import { Link } from 'react-router-dom';

const UserGuide = () => {
  return (
    <section className='min-h-screen bg-white text-gray-900 dark:bg-slate-950 dark:text-slate-100'>
      <div className='mx-auto w-full max-w-5xl px-6 py-16'>
        <div className='flex items-center justify-between gap-4'>
          <div>
            <p className='text-xs uppercase tracking-[0.2em] text-gray-400 dark:text-slate-400'>
              Guide utilisateur
            </p>
            <h1 className='mt-2 text-3xl font-semibold text-gray-900 dark:text-slate-100'>
              Ce que vous pouvez faire avec l'app
            </h1>
            <p className='mt-2 text-base text-gray-600 dark:text-slate-300'>
              Toutes les fonctionnalites essentielles, sans jargon technique.
            </p>
          </div>
          <Link
            to='/'
            className='inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 shadow-sm transition hover:border-teal-200 hover:text-teal-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-teal-500/40 dark:hover:text-teal-200'
          >
            Retour accueil
          </Link>
        </div>

        <div className='mt-10 grid gap-6 md:grid-cols-2'>
          <div className='rounded-2xl border border-gray-200 bg-gray-50 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none'>
            <h2 className='text-lg font-semibold text-gray-900 dark:text-slate-100'>
              1) Creer un compte et se connecter
            </h2>
            <ul className='mt-3 space-y-2 text-sm text-gray-600 dark:text-slate-300'>
              <li>Inscription rapide avec verifications du mot de passe.</li>
              <li>Activation par e-mail obligatoire pour securiser le compte.</li>
              <li>Connexion classique, avec renvoi d'e-mail si besoin.</li>
              <li>Reinitialisation du mot de passe en un clic.</li>
            </ul>
          </div>

          <div className='rounded-2xl border border-gray-200 bg-gray-50 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none'>
            <h2 className='text-lg font-semibold text-gray-900 dark:text-slate-100'>
              2) Choisir votre IA
            </h2>
            <ul className='mt-3 space-y-2 text-sm text-gray-600 dark:text-slate-300'>
              <li>Selection du fournisseur : OpenAI, Gemini, Claude, Mistral.</li>
              <li>Choix du modele adapte a votre besoin.</li>
              <li>Basculer de modele a tout moment pendant une session.</li>
            </ul>
          </div>

          <div className='rounded-2xl border border-gray-200 bg-gray-50 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none'>
            <h2 className='text-lg font-semibold text-gray-900 dark:text-slate-100'>
              3) Converser et organiser
            </h2>
            <ul className='mt-3 space-y-2 text-sm text-gray-600 dark:text-slate-300'>
              <li>Historique conserve par fil de discussion.</li>
              <li>Projets pour regrouper vos conversations.</li>
              <li>Instructions et contexte par projet.</li>
              <li>Relance rapide en cas d'erreur (bouton Reessayer).</li>
            </ul>
          </div>

          <div className='rounded-2xl border border-gray-200 bg-gray-50 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none'>
            <h2 className='text-lg font-semibold text-gray-900 dark:text-slate-100'>
              4) Rechercher dans vos messages
            </h2>
            <ul className='mt-3 space-y-2 text-sm text-gray-600 dark:text-slate-300'>
              <li>Recherche dans la conversation avec surlignage.</li>
              <li>Navigation entre les resultats (Suivant / Precedent).</li>
              <li>Raccourcis clavier : Ctrl/Cmd+F, Enter, Shift+Enter.</li>
            </ul>
          </div>

          <div className='rounded-2xl border border-gray-200 bg-gray-50 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none'>
            <h2 className='text-lg font-semibold text-gray-900 dark:text-slate-100'>
              5) Pieces jointes
            </h2>
            <ul className='mt-3 space-y-2 text-sm text-gray-600 dark:text-slate-300'>
              <li>Ajout d'images pour enrichir vos demandes.</li>
              <li>Preview avant envoi.</li>
              <li>Compatible surtout avec Gemini pour l'analyse d'images.</li>
            </ul>
          </div>

          <div className='rounded-2xl border border-gray-200 bg-gray-50 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none'>
            <h2 className='text-lg font-semibold text-gray-900 dark:text-slate-100'>
              6) Confidentialite et controle
            </h2>
            <ul className='mt-3 space-y-2 text-sm text-gray-600 dark:text-slate-300'>
              <li>Vos cles API sont chiffrees.</li>
              <li>Vos conversations restent privees.</li>
              <li>Mode clair / sombre disponible.</li>
            </ul>
          </div>
        </div>

        <div className='mt-12 rounded-2xl border border-teal-100 bg-teal-50/70 p-6 text-sm text-teal-700 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-200'>
          Besoin d'une fonctionnalite en plus ? Contactez-nous avec votre cas d'usage.
        </div>
      </div>
    </section>
  );
};

export default UserGuide;
