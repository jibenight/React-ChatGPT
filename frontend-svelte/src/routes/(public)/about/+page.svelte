<script lang="ts">
  import { i18n } from '$lib/i18n/i18n.svelte';
  import LegalLayout from '$lib/components/common/LegalLayout.svelte';

  const FEATURES = [
    'aboutFeature1',
    'aboutFeature2',
    'aboutFeature3',
    'aboutFeature4',
    'aboutFeature5',
  ] as const;

  const TECHS = [
    'aboutTechFrontend',
    'aboutTechBackend',
    'aboutTechDesktop',
    'aboutTechReact',
  ] as const;
</script>

<svelte:head>
  <title>ChatBot AI — {i18n.t('aboutPageTitle')}</title>
</svelte:head>

<LegalLayout title={i18n.t('aboutPageTitle')}>
  <!-- Mission -->
  <section>
    <h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-foreground">
      {i18n.t('aboutMissionTitle')}
    </h2>
    <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
      {i18n.t('aboutMissionContent')}
    </p>
  </section>

  <!-- BYOK -->
  <section>
    <div class="rounded-xl border border-primary/30 bg-primary/5 p-6 dark:border-primary/20 dark:bg-primary/10">
      <h2 class="mb-2 text-xl font-semibold text-gray-900 dark:text-foreground">
        {i18n.t('aboutByokTitle')}
      </h2>
      <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
        {i18n.t('aboutByokContent')}
      </p>
    </div>
  </section>

  <!-- Fonctionnalités -->
  <section>
    <h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-foreground">
      {i18n.t('aboutFeaturesTitle')}
    </h2>
    <ul class="space-y-3">
      {#each FEATURES as key (key)}
        <li class="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
          <span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">✓</span>
          {i18n.t(key)}
        </li>
      {/each}
    </ul>
  </section>

  <!-- Technologies -->
  <section>
    <h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-foreground">
      {i18n.t('aboutTechTitle')}
    </h2>
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {#each TECHS as key (key)}
        <div class="rounded-xl border border-gray-200 bg-white p-4 dark:border-border dark:bg-card/60">
          <p class="text-sm text-gray-600 dark:text-gray-300">{i18n.t(key)}</p>
        </div>
      {/each}
    </div>
  </section>

  <!-- Équipe -->
  <section>
    <h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-foreground">
      {i18n.t('aboutTeamTitle')}
    </h2>
    <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
      {i18n.t('aboutTeamContent')}
    </p>
  </section>

  <!-- Open source -->
  <section>
    <h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-foreground">
      {i18n.t('aboutOpenSourceTitle')}
    </h2>
    <p class="mb-4 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
      {i18n.t('aboutOpenSourceContent')}
    </p>
    <a
      href="https://github.com"
      target="_blank"
      rel="noopener noreferrer"
      class="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-border dark:bg-card/60 dark:text-foreground dark:hover:bg-card"
    >
      <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
      </svg>
      {i18n.t('aboutGithubLink')}
    </a>
  </section>
</LegalLayout>
