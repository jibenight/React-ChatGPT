import '../../css/App.css';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

const UserGuide = () => {
  const { t } = useTranslation();

  return (
    <section className='min-h-screen bg-white text-gray-900 dark:bg-background dark:text-foreground'>
      <div className='mx-auto w-full max-w-5xl px-6 py-16'>
        <div className='flex items-center justify-between gap-4'>
          <div>
            <p className='text-xs uppercase tracking-[0.2em] text-gray-400 dark:text-muted-foreground'>
              {t('guide:userGuide')}
            </p>
            <h1 className='mt-2 text-3xl font-semibold text-gray-900 dark:text-foreground'>
              {t('guide:guideTitle')}
            </h1>
            <p className='mt-2 text-base text-gray-600 dark:text-muted-foreground'>
              {t('guide:guideSubtitle')}
            </p>
          </div>
          <Link
            to='/'
            className='inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 shadow-sm transition hover:border-teal-200 hover:text-teal-600 dark:border-border dark:bg-card dark:text-muted-foreground dark:hover:border-teal-500/40 dark:hover:text-teal-200'
          >
            {t('common:backHome')}
          </Link>
        </div>

        <div className='mt-10 grid gap-6 md:grid-cols-2'>
          <div className='rounded-2xl border border-gray-200 bg-gray-50 p-6 shadow-sm dark:border-border dark:bg-card/60 dark:shadow-none'>
            <h2 className='text-lg font-semibold text-gray-900 dark:text-foreground'>
              {t('guide:section1Title')}
            </h2>
            <ul className='mt-3 space-y-2 text-sm text-gray-600 dark:text-muted-foreground'>
              <li>{t('guide:section1Item1')}</li>
              <li>{t('guide:section1Item2')}</li>
              <li>{t('guide:section1Item3')}</li>
              <li>{t('guide:section1Item4')}</li>
            </ul>
          </div>

          <div className='rounded-2xl border border-gray-200 bg-gray-50 p-6 shadow-sm dark:border-border dark:bg-card/60 dark:shadow-none'>
            <h2 className='text-lg font-semibold text-gray-900 dark:text-foreground'>
              {t('guide:section2Title')}
            </h2>
            <ul className='mt-3 space-y-2 text-sm text-gray-600 dark:text-muted-foreground'>
              <li>{t('guide:section2Item1')}</li>
              <li>{t('guide:section2Item2')}</li>
              <li>{t('guide:section2Item3')}</li>
            </ul>
          </div>

          <div className='rounded-2xl border border-gray-200 bg-gray-50 p-6 shadow-sm dark:border-border dark:bg-card/60 dark:shadow-none'>
            <h2 className='text-lg font-semibold text-gray-900 dark:text-foreground'>
              {t('guide:section3Title')}
            </h2>
            <ul className='mt-3 space-y-2 text-sm text-gray-600 dark:text-muted-foreground'>
              <li>{t('guide:section3Item1')}</li>
              <li>{t('guide:section3Item2')}</li>
              <li>{t('guide:section3Item3')}</li>
              <li>{t('guide:section3Item4')}</li>
            </ul>
          </div>

          <div className='rounded-2xl border border-gray-200 bg-gray-50 p-6 shadow-sm dark:border-border dark:bg-card/60 dark:shadow-none'>
            <h2 className='text-lg font-semibold text-gray-900 dark:text-foreground'>
              {t('guide:section4Title')}
            </h2>
            <ul className='mt-3 space-y-2 text-sm text-gray-600 dark:text-muted-foreground'>
              <li>{t('guide:section4Item1')}</li>
              <li>{t('guide:section4Item2')}</li>
              <li>{t('guide:section4Item3')}</li>
            </ul>
          </div>

          <div className='rounded-2xl border border-gray-200 bg-gray-50 p-6 shadow-sm dark:border-border dark:bg-card/60 dark:shadow-none'>
            <h2 className='text-lg font-semibold text-gray-900 dark:text-foreground'>
              {t('guide:section5Title')}
            </h2>
            <ul className='mt-3 space-y-2 text-sm text-gray-600 dark:text-muted-foreground'>
              <li>{t('guide:section5Item1')}</li>
              <li>{t('guide:section5Item2')}</li>
              <li>{t('guide:section5Item3')}</li>
            </ul>
          </div>

          <div className='rounded-2xl border border-gray-200 bg-gray-50 p-6 shadow-sm dark:border-border dark:bg-card/60 dark:shadow-none'>
            <h2 className='text-lg font-semibold text-gray-900 dark:text-foreground'>
              {t('guide:section6Title')}
            </h2>
            <ul className='mt-3 space-y-2 text-sm text-gray-600 dark:text-muted-foreground'>
              <li>{t('guide:section6Item1')}</li>
              <li>{t('guide:section6Item2')}</li>
              <li>{t('guide:section6Item3')}</li>
            </ul>
          </div>
        </div>

        <div className='mt-12 rounded-2xl border border-teal-100 bg-teal-50/70 p-6 text-sm text-teal-700 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-200'>
          {t('guide:featureRequest')}
        </div>
      </div>
    </section>
  );
};

export default UserGuide;
