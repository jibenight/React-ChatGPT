<script lang="ts">
  import { i18n } from '$lib/i18n/i18n.svelte';
  import MatrixBackground from '$lib/components/common/MatrixBackground.svelte';
  import type { TranslationKey } from '$lib/i18n/i18n.svelte';

  type Feature = { icon: string; titleKey: TranslationKey; descKey: TranslationKey };
  type Faq = { qKey: TranslationKey; aKey: TranslationKey };
  type PricingRow = { key: TranslationKey };

  const FEATURES: Feature[] = [
    { icon: '⚡', titleKey: 'featuresMultiProvider', descKey: 'featuresMultiProviderDesc' },
    { icon: '📁', titleKey: 'featuresProjects', descKey: 'featuresProjectsDesc' },
    { icon: '🔍', titleKey: 'featuresSearch', descKey: 'featuresSearchDesc' },
    { icon: '🖥️', titleKey: 'featuresDesktop', descKey: 'featuresDesktopDesc' },
    { icon: '🔒', titleKey: 'featuresSecurity', descKey: 'featuresSecurityDesc' },
    { icon: '🌍', titleKey: 'featuresI18n', descKey: 'featuresI18nDesc' },
  ];

  const FAQS: Faq[] = [
    { qKey: 'faqByokQ', aKey: 'faqByokA' },
    { qKey: 'faqSecurityQ', aKey: 'faqSecurityA' },
    { qKey: 'faqOfflineQ', aKey: 'faqOfflineA' },
    { qKey: 'faqProvidersQ', aKey: 'faqProvidersA' },
  ];

  const FREE_ROWS: PricingRow[] = [
    { key: 'pricingFreature1Free' },
    { key: 'pricingFreature2Free' },
    { key: 'pricingFreature3Free' },
  ];
  const PRO_ROWS: PricingRow[] = [
    { key: 'pricingFreature1Pro' },
    { key: 'pricingFreature2Pro' },
    { key: 'pricingFreature3Pro' },
  ];
  const TEAM_ROWS: PricingRow[] = [
    { key: 'pricingFreature1Team' },
    { key: 'pricingFreature2Team' },
    { key: 'pricingFreature3Team' },
  ];

  let featuresEl: HTMLElement;
  const year = new Date().getFullYear();

  function scrollToFeatures() {
    featuresEl?.scrollIntoView({ behavior: 'smooth' });
  }
</script>

<svelte:head>
  <title>MultiAI — {i18n.t('heroTitle')}</title>
</svelte:head>

<div class="min-h-screen bg-background text-foreground">

  <!-- Nav -->
  <header class="fixed inset-x-0 top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
    <div class="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
      <span class="font-bold text-foreground">✦ MultiAI</span>
      <nav class="flex items-center gap-3">
        <a
          href="/guide"
          class="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {i18n.t('footerGuide')}
        </a>
        <a
          href="/login"
          class="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {i18n.t('footerLogin')}
        </a>
        <a
          href="/register"
          class="rounded-lg bg-primary px-3.5 py-1.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {i18n.t('registerButton')}
        </a>
      </nav>
    </div>
  </header>

  <!-- Hero -->
  <section class="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 pt-14 text-center">
    <MatrixBackground />
    <div class="relative z-10 mx-auto max-w-3xl">
      <div class="mb-8 inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/60 px-4 py-1.5 text-xs text-muted-foreground backdrop-blur-sm">
        <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400"></span>
        OpenAI · Gemini · Claude · Mistral · Groq
      </div>

      <h1 class="mb-6 text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl md:text-6xl">
        {i18n.t('heroTitle')}
      </h1>

      <p class="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
        {i18n.t('heroSubtitle')}
      </p>

      <div class="flex flex-col justify-center gap-3 sm:flex-row">
        <a
          href="/register"
          class="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90"
        >
          {i18n.t('heroCta')}
        </a>
        <button
          onclick={scrollToFeatures}
          class="rounded-xl border border-border px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
        >
          {i18n.t('heroSecondary')}
        </button>
      </div>
    </div>

    <div class="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-muted-foreground/50">
      <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  </section>

  <!-- Features -->
  <section bind:this={featuresEl} class="px-4 py-24">
    <div class="mx-auto max-w-6xl">
      <h2 class="mb-4 text-center text-3xl font-bold text-foreground">
        {i18n.t('featuresTitle')}
      </h2>
      <p class="mx-auto mb-16 max-w-xl text-center text-muted-foreground">
        {i18n.t('featuresSubtitle')}
      </p>

      <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {#each FEATURES as feature (feature.titleKey)}
          <div class="group rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-md">
            <div class="mb-4 text-3xl">{feature.icon}</div>
            <h3 class="mb-2 text-base font-semibold text-foreground">{i18n.t(feature.titleKey)}</h3>
            <p class="text-sm leading-relaxed text-muted-foreground">{i18n.t(feature.descKey)}</p>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Pricing -->
  <section class="bg-muted/30 px-4 py-24">
    <div class="mx-auto max-w-5xl">
      <h2 class="mb-4 text-center text-3xl font-bold text-foreground">
        {i18n.t('pricingTitle')}
      </h2>
      <p class="mb-16 text-center text-muted-foreground">
        {i18n.t('pricingSubtitle')}
      </p>

      <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
        <!-- Free -->
        <div class="flex flex-col rounded-2xl border border-border bg-card p-8">
          <div class="mb-6">
            <h3 class="mb-1 text-lg font-bold text-foreground">{i18n.t('pricingFree')}</h3>
            <div class="flex items-baseline gap-1">
              <span class="text-3xl font-bold text-foreground">0€</span>
              <span class="text-sm text-muted-foreground">{i18n.t('pricingPerMonth')}</span>
            </div>
            <p class="mt-1 text-xs text-muted-foreground">{i18n.t('pricingFreePriceLabel')}</p>
          </div>
          <ul class="mb-8 flex-1 space-y-3">
            {#each FREE_ROWS as row (row.key)}
              <li class="flex items-start gap-2 text-sm text-muted-foreground">
                <span class="mt-0.5 text-green-500">✓</span>
                {i18n.t(row.key)}
              </li>
            {/each}
          </ul>
          <a
            href="/register"
            class="block rounded-lg border border-border px-4 py-2.5 text-center text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            {i18n.t('pricingCtaFree')}
          </a>
        </div>

        <!-- Pro -->
        <div class="relative flex flex-col rounded-2xl border-2 border-primary bg-card p-8 shadow-lg shadow-primary/10">
          <div class="absolute -top-3 left-1/2 -translate-x-1/2">
            <span class="rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
              {i18n.t('popular')}
            </span>
          </div>
          <div class="mb-6">
            <h3 class="mb-1 text-lg font-bold text-foreground">{i18n.t('pricingPro')}</h3>
            <div class="flex items-baseline gap-1">
              <span class="text-3xl font-bold text-foreground">{i18n.t('pricingProPrice')}€</span>
              <span class="text-sm text-muted-foreground">{i18n.t('pricingPerMonth')}</span>
            </div>
          </div>
          <ul class="mb-8 flex-1 space-y-3">
            {#each PRO_ROWS as row (row.key)}
              <li class="flex items-start gap-2 text-sm text-muted-foreground">
                <span class="mt-0.5 text-primary">✓</span>
                {i18n.t(row.key)}
              </li>
            {/each}
          </ul>
          <a
            href="/register"
            class="block rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {i18n.t('pricingCtaPro')}
          </a>
        </div>

        <!-- Team -->
        <div class="flex flex-col rounded-2xl border border-border bg-card p-8">
          <div class="mb-6">
            <h3 class="mb-1 text-lg font-bold text-foreground">{i18n.t('pricingTeam')}</h3>
            <div class="flex items-baseline gap-1">
              <span class="text-3xl font-bold text-foreground">{i18n.t('pricingTeamPrice')}€</span>
              <span class="text-sm text-muted-foreground">{i18n.t('pricingPerUserPerMonth')}</span>
            </div>
          </div>
          <ul class="mb-8 flex-1 space-y-3">
            {#each TEAM_ROWS as row (row.key)}
              <li class="flex items-start gap-2 text-sm text-muted-foreground">
                <span class="mt-0.5 text-green-500">✓</span>
                {i18n.t(row.key)}
              </li>
            {/each}
          </ul>
          <a
            href="/register"
            class="block rounded-lg border border-border px-4 py-2.5 text-center text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            {i18n.t('pricingCtaTeam')}
          </a>
        </div>
      </div>
    </div>
  </section>

  <!-- FAQ -->
  <section class="px-4 py-24">
    <div class="mx-auto max-w-3xl">
      <h2 class="mb-16 text-center text-3xl font-bold text-foreground">
        {i18n.t('faqTitle')}
      </h2>

      <div class="space-y-4">
        {#each FAQS as faq (faq.qKey)}
          <details class="group overflow-hidden rounded-2xl border border-border bg-card">
            <summary class="flex cursor-pointer list-none items-center justify-between px-6 py-4 font-medium text-foreground transition-colors hover:bg-muted/50">
              {i18n.t(faq.qKey)}
              <svg
                class="h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <p class="px-6 pb-5 text-sm leading-relaxed text-muted-foreground">
              {i18n.t(faq.aKey)}
            </p>
          </details>
        {/each}
      </div>
    </div>
  </section>

  <!-- CTA Banner -->
  <section class="border-y border-border bg-primary/5 px-4 py-20">
    <div class="mx-auto max-w-2xl text-center">
      <h2 class="mb-4 text-2xl font-bold text-foreground">{i18n.t('heroTitle')}</h2>
      <p class="mb-8 text-muted-foreground">{i18n.t('ctaSubtitle')}</p>
      <a
        href="/register"
        class="inline-flex rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90"
      >
        {i18n.t('heroCta')}
      </a>
    </div>
  </section>

  <!-- Footer -->
  <footer class="border-t border-border px-4 py-14">
    <div class="mx-auto max-w-6xl">
      <!-- Colonnes -->
      <div class="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:grid-cols-4">
        <!-- Produit -->
        <div>
          <h3 class="mb-4 text-xs font-semibold uppercase tracking-wider text-foreground">
            {i18n.t('footerProduct')}
          </h3>
          <ul class="space-y-2.5">
            <li>
              <button
                onclick={scrollToFeatures}
                class="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {i18n.t('footerFeatures')}
              </button>
            </li>
            <li>
              <a href="/pricing" class="text-sm text-muted-foreground transition-colors hover:text-foreground">
                {i18n.t('footerPricing')}
              </a>
            </li>
            <li>
              <a href="/changelog" class="text-sm text-muted-foreground transition-colors hover:text-foreground">
                {i18n.t('footerChangelog')}
              </a>
            </li>
            <li>
              <a href="/guide" class="text-sm text-muted-foreground transition-colors hover:text-foreground">
                {i18n.t('footerGuide')}
              </a>
            </li>
          </ul>
        </div>

        <!-- Légal -->
        <div>
          <h3 class="mb-4 text-xs font-semibold uppercase tracking-wider text-foreground">
            {i18n.t('footerLegal')}
          </h3>
          <ul class="space-y-2.5">
            <li>
              <a href="/terms" class="text-sm text-muted-foreground transition-colors hover:text-foreground">
                {i18n.t('footerTerms')}
              </a>
            </li>
            <li>
              <a href="/privacy" class="text-sm text-muted-foreground transition-colors hover:text-foreground">
                {i18n.t('footerPrivacy')}
              </a>
            </li>
            <li>
              <a href="/cookies" class="text-sm text-muted-foreground transition-colors hover:text-foreground">
                {i18n.t('footerCookies')}
              </a>
            </li>
            <li>
              <a href="/refund" class="text-sm text-muted-foreground transition-colors hover:text-foreground">
                {i18n.t('footerRefund')}
              </a>
            </li>
            <li>
              <a href="/legal" class="text-sm text-muted-foreground transition-colors hover:text-foreground">
                {i18n.t('footerMentions')}
              </a>
            </li>
          </ul>
        </div>

        <!-- Support -->
        <div>
          <h3 class="mb-4 text-xs font-semibold uppercase tracking-wider text-foreground">
            {i18n.t('footerSupport')}
          </h3>
          <ul class="space-y-2.5">
            <li>
              <a href="/contact" class="text-sm text-muted-foreground transition-colors hover:text-foreground">
                {i18n.t('footerContactPage')}
              </a>
            </li>
            <li>
              <a href="/guide" class="text-sm text-muted-foreground transition-colors hover:text-foreground">
                {i18n.t('footerGuide')}
              </a>
            </li>
            <li>
              <a href="/about" class="text-sm text-muted-foreground transition-colors hover:text-foreground">
                {i18n.t('footerAbout')}
              </a>
            </li>
            <li>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                class="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {i18n.t('footerGithub')}
              </a>
            </li>
          </ul>
        </div>

        <!-- Compte -->
        <div>
          <h3 class="mb-4 text-xs font-semibold uppercase tracking-wider text-foreground">
            Compte
          </h3>
          <ul class="space-y-2.5">
            <li>
              <a href="/login" class="text-sm text-muted-foreground transition-colors hover:text-foreground">
                {i18n.t('footerLogin')}
              </a>
            </li>
            <li>
              <a href="/register" class="text-sm text-muted-foreground transition-colors hover:text-foreground">
                {i18n.t('footerRegister')}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <!-- Séparateur + copyright -->
      <div class="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
        <span class="font-bold text-foreground">✦ MultiAI</span>
        <p class="text-xs text-muted-foreground">
          {i18n.t('footerCopyright', { year })}
        </p>
      </div>
    </div>
  </footer>
</div>
