import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MatrixBackground from '@/components/common/MatrixBackground';

const FEATURES = [
  { icon: '⚡', key: 'MultiProvider' },
  { icon: '📁', key: 'Projects' },
  { icon: '🔍', key: 'Search' },
  { icon: '🖥️', key: 'Desktop' },
  { icon: '🔒', key: 'Security' },
  { icon: '🌍', key: 'I18n' },
];

const FAQS = [
  { qKey: 'faqByokQ', aKey: 'faqByokA' },
  { qKey: 'faqSecurityQ', aKey: 'faqSecurityA' },
  { qKey: 'faqOfflineQ', aKey: 'faqOfflineA' },
  { qKey: 'faqProvidersQ', aKey: 'faqProvidersA' },
];

export default function LandingPage() {
  const { t } = useTranslation();
  const featuresRef = useRef<HTMLElement>(null);

  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const year = new Date().getFullYear();

  return (
    <div className='min-h-screen bg-background text-foreground'>
      {/* Nav */}
      <header className='fixed top-0 inset-x-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md'>
        <div className='max-w-6xl mx-auto px-4 h-14 flex items-center justify-between'>
          <span className='font-bold text-foreground'>✦ MultiAI</span>
          <nav className='flex items-center gap-3'>
            <Link
              to='/guide'
              className='text-sm text-muted-foreground hover:text-foreground transition-colors'
            >
              {t('auth:footerGuide')}
            </Link>
            <Link
              to='/login'
              className='text-sm text-muted-foreground hover:text-foreground transition-colors'
            >
              {t('auth:footerLogin')}
            </Link>
            <Link
              to='/register'
              className='rounded-lg bg-primary px-3.5 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors'
            >
              {t('auth:registerButton')}
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className='relative min-h-screen flex flex-col items-center justify-center text-center px-4 pt-14 overflow-hidden'>
        <MatrixBackground />
        <div className='relative z-10 max-w-3xl mx-auto'>
          <div className='inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/60 backdrop-blur-sm px-4 py-1.5 text-xs text-muted-foreground mb-8'>
            <span className='h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse' />
            OpenAI · Gemini · Claude · Mistral · Groq
          </div>

          <h1 className='text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground mb-6 leading-tight'>
            {t('auth:heroTitle')}
          </h1>

          <p className='text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed'>
            {t('auth:heroSubtitle')}
          </p>

          <div className='flex flex-col sm:flex-row gap-3 justify-center'>
            <Link
              to='/register'
              className='rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/20'
            >
              {t('auth:heroCta')}
            </Link>
            <button
              onClick={scrollToFeatures}
              className='rounded-xl border border-border px-6 py-3 text-sm font-semibold text-foreground hover:bg-muted transition-colors'
            >
              {t('auth:heroSecondary')}
            </button>
          </div>
        </div>

        <div className='absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-muted-foreground/50'>
          <svg className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
          </svg>
        </div>
      </section>

      {/* Features */}
      <section ref={featuresRef} className='py-24 px-4'>
        <div className='max-w-6xl mx-auto'>
          <h2 className='text-3xl font-bold text-center text-foreground mb-4'>
            {t('auth:featuresTitle')}
          </h2>
          <p className='text-center text-muted-foreground mb-16 max-w-xl mx-auto'>
            {t('auth:featuresSubtitle')}
          </p>

          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
            {FEATURES.map(({ icon, key }) => (
              <div
                key={key}
                className='group rounded-2xl border border-border bg-card p-6 hover:border-primary/50 hover:shadow-md transition-all'
              >
                <div className='text-3xl mb-4'>{icon}</div>
                <h3 className='text-base font-semibold text-foreground mb-2'>
                  {t(`auth:features${key}`)}
                </h3>
                <p className='text-sm text-muted-foreground leading-relaxed'>
                  {t(`auth:features${key}Desc`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className='py-24 px-4 bg-muted/30'>
        <div className='max-w-5xl mx-auto'>
          <h2 className='text-3xl font-bold text-center text-foreground mb-4'>
            {t('auth:pricingTitle')}
          </h2>
          <p className='text-center text-muted-foreground mb-16'>
            {t('auth:pricingSubtitle')}
          </p>

          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            {/* Free */}
            <div className='rounded-2xl border border-border bg-card p-8 flex flex-col'>
              <div className='mb-6'>
                <h3 className='text-lg font-bold text-foreground mb-1'>{t('auth:pricingFree')}</h3>
                <div className='flex items-baseline gap-1'>
                  <span className='text-3xl font-bold text-foreground'>0€</span>
                  <span className='text-sm text-muted-foreground'>{t('auth:pricingPerMonth')}</span>
                </div>
                <p className='text-xs text-muted-foreground mt-1'>{t('auth:pricingFreePriceLabel')}</p>
              </div>
              <ul className='space-y-3 flex-1 mb-8'>
                {(['pricingFreature1Free', 'pricingFreature2Free', 'pricingFreature3Free'] as const).map((k) => (
                  <li key={k} className='flex items-start gap-2 text-sm text-muted-foreground'>
                    <span className='text-green-500 mt-0.5'>✓</span>
                    {t(`auth:${k}`)}
                  </li>
                ))}
              </ul>
              <Link
                to='/register'
                className='block rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground text-center hover:bg-muted transition-colors'
              >
                {t('auth:pricingCtaFree')}
              </Link>
            </div>

            {/* Pro */}
            <div className='rounded-2xl border-2 border-primary bg-card p-8 flex flex-col relative shadow-lg shadow-primary/10'>
              <div className='absolute -top-3 left-1/2 -translate-x-1/2'>
                <span className='rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground'>
                  {t('auth:popular')}
                </span>
              </div>
              <div className='mb-6'>
                <h3 className='text-lg font-bold text-foreground mb-1'>{t('auth:pricingPro')}</h3>
                <div className='flex items-baseline gap-1'>
                  <span className='text-3xl font-bold text-foreground'>{t('auth:pricingProPrice')}€</span>
                  <span className='text-sm text-muted-foreground'>{t('auth:pricingPerMonth')}</span>
                </div>
              </div>
              <ul className='space-y-3 flex-1 mb-8'>
                {(['pricingFreature1Pro', 'pricingFreature2Pro', 'pricingFreature3Pro'] as const).map((k) => (
                  <li key={k} className='flex items-start gap-2 text-sm text-muted-foreground'>
                    <span className='text-primary mt-0.5'>✓</span>
                    {t(`auth:${k}`)}
                  </li>
                ))}
              </ul>
              <Link
                to='/register'
                className='block rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground text-center hover:bg-primary/90 transition-colors'
              >
                {t('auth:pricingCtaPro')}
              </Link>
            </div>

            {/* Team */}
            <div className='rounded-2xl border border-border bg-card p-8 flex flex-col'>
              <div className='mb-6'>
                <h3 className='text-lg font-bold text-foreground mb-1'>{t('auth:pricingTeam')}</h3>
                <div className='flex items-baseline gap-1'>
                  <span className='text-3xl font-bold text-foreground'>{t('auth:pricingTeamPrice')}€</span>
                  <span className='text-sm text-muted-foreground'>{t('auth:pricingPerUserPerMonth')}</span>
                </div>
              </div>
              <ul className='space-y-3 flex-1 mb-8'>
                {(['pricingFreature1Team', 'pricingFreature2Team', 'pricingFreature3Team'] as const).map((k) => (
                  <li key={k} className='flex items-start gap-2 text-sm text-muted-foreground'>
                    <span className='text-green-500 mt-0.5'>✓</span>
                    {t(`auth:${k}`)}
                  </li>
                ))}
              </ul>
              <Link
                to='/register'
                className='block rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground text-center hover:bg-muted transition-colors'
              >
                {t('auth:pricingCtaTeam')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className='py-24 px-4'>
        <div className='max-w-3xl mx-auto'>
          <h2 className='text-3xl font-bold text-center text-foreground mb-16'>
            {t('auth:faqTitle')}
          </h2>

          <div className='space-y-4'>
            {FAQS.map(({ qKey, aKey }) => (
              <details
                key={qKey}
                className='group rounded-2xl border border-border bg-card overflow-hidden'
              >
                <summary className='flex items-center justify-between px-6 py-4 cursor-pointer list-none font-medium text-foreground hover:bg-muted/50 transition-colors'>
                  {t(`auth:${qKey}`)}
                  <svg
                    className='h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform group-open:rotate-180'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                  >
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
                  </svg>
                </summary>
                <p className='px-6 pb-5 text-sm text-muted-foreground leading-relaxed'>
                  {t(`auth:${aKey}`)}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className='py-20 px-4 bg-primary/5 border-y border-border'>
        <div className='max-w-2xl mx-auto text-center'>
          <h2 className='text-2xl font-bold text-foreground mb-4'>
            {t('auth:heroTitle')}
          </h2>
          <p className='text-muted-foreground mb-8'>
            {t('auth:ctaSubtitle')}
          </p>
          <Link
            to='/register'
            className='inline-flex rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/20'
          >
            {t('auth:heroCta')}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className='border-t border-border py-10 px-4'>
        <div className='max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4'>
          <span className='font-bold text-foreground'>✦ MultiAI</span>
          <nav className='flex flex-wrap items-center gap-4 text-sm text-muted-foreground'>
            <Link to='/login' className='hover:text-foreground transition-colors'>
              {t('auth:footerLogin')}
            </Link>
            <Link to='/register' className='hover:text-foreground transition-colors'>
              {t('auth:footerRegister')}
            </Link>
            <Link to='/guide' className='hover:text-foreground transition-colors'>
              {t('auth:footerGuide')}
            </Link>
            <a
              href='https://github.com'
              target='_blank'
              rel='noopener noreferrer'
              className='hover:text-foreground transition-colors'
            >
              {t('auth:footerGithub')}
            </a>
          </nav>
          <p className='text-xs text-muted-foreground'>
            {t('auth:footerCopyright', { year })}
          </p>
        </div>
      </footer>
    </div>
  );
}
