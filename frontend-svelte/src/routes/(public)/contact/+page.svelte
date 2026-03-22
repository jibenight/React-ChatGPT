<script lang="ts">
  import { i18n } from '$lib/i18n/i18n.svelte';
  import LegalLayout from '$lib/components/common/LegalLayout.svelte';
</script>

<svelte:head>
  <title>ChatBot AI — {i18n.t('contactPageTitle')}</title>
</svelte:head>

<LegalLayout title={i18n.t('contactPageTitle')}>
  <!-- Intro -->
  <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
    {i18n.t('contactIntroContent')}
  </p>

  <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
    <!-- Email -->
    <div class="rounded-xl border border-gray-200 bg-white p-6 dark:border-border dark:bg-card/60">
      <div class="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
        <svg class="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <h2 class="mb-2 text-base font-semibold text-gray-900 dark:text-foreground">
        {i18n.t('contactEmailTitle')}
      </h2>
      <p class="mb-3 text-sm text-gray-600 dark:text-gray-300">
        {i18n.t('contactEmailContent')}
      </p>
      <a
        href="mailto:{i18n.t('contactEmailAddress')}"
        class="text-sm font-medium text-primary hover:underline"
      >
        {i18n.t('contactEmailAddress')}
      </a>
    </div>

    <!-- GitHub -->
    <div class="rounded-xl border border-gray-200 bg-white p-6 dark:border-border dark:bg-card/60">
      <div class="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 dark:bg-muted">
        <svg class="h-5 w-5 text-gray-700 dark:text-foreground" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
        </svg>
      </div>
      <h2 class="mb-2 text-base font-semibold text-gray-900 dark:text-foreground">
        {i18n.t('contactGithubTitle')}
      </h2>
      <p class="mb-3 text-sm text-gray-600 dark:text-gray-300">
        {i18n.t('contactGithubContent')}
      </p>
      <a
        href="https://github.com"
        target="_blank"
        rel="noopener noreferrer"
        class="text-sm font-medium text-primary hover:underline"
      >
        {i18n.t('contactGithubLink')}
      </a>
    </div>

    <!-- Horaires -->
    <div class="rounded-xl border border-gray-200 bg-white p-6 dark:border-border dark:bg-card/60">
      <div class="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 dark:bg-green-500/10">
        <svg class="h-5 w-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h2 class="mb-2 text-base font-semibold text-gray-900 dark:text-foreground">
        {i18n.t('contactHoursTitle')}
      </h2>
      <p class="text-sm text-gray-600 dark:text-gray-300">
        {i18n.t('contactHoursContent')}
      </p>
    </div>

    <!-- Temps de réponse -->
    <div class="rounded-xl border border-gray-200 bg-white p-6 dark:border-border dark:bg-card/60">
      <div class="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-500/10">
        <svg class="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <h2 class="mb-2 text-base font-semibold text-gray-900 dark:text-foreground">
        {i18n.t('contactResponseTitle')}
      </h2>
      <p class="text-sm text-gray-600 dark:text-gray-300">
        {i18n.t('contactResponseContent')}
      </p>
    </div>
  </div>

  <!-- Formulaire de contact (MVP : liens directs) -->
  <section>
    <div class="rounded-xl border border-gray-200 bg-gray-50 p-6 dark:border-border dark:bg-muted/30">
      <p class="mb-4 text-sm text-gray-600 dark:text-gray-300">
        Pour nous contacter directement, utilisez l'e-mail ci-dessous ou ouvrez une issue sur GitHub pour les demandes techniques.
      </p>
      <div class="flex flex-wrap gap-3">
        <a
          href="mailto:contact@jean-nguyen.dev"
          class="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          {i18n.t('contactEmailAddress')}
        </a>
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-border dark:bg-card/60 dark:text-foreground dark:hover:bg-card"
        >
          GitHub
        </a>
      </div>
    </div>
  </section>
</LegalLayout>
