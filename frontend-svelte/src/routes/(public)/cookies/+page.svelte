<script lang="ts">
  import { i18n } from '$lib/i18n/i18n.svelte';
  import LegalLayout from '$lib/components/common/LegalLayout.svelte';
</script>

<svelte:head>
  <title>ChatBot AI — {i18n.t('cookiesPageTitle')}</title>
</svelte:head>

<LegalLayout title={i18n.t('cookiesPageTitle')}>
  <p class="text-sm text-gray-500 dark:text-muted-foreground">
    {i18n.t('legalLastUpdated', { date: '22 mars 2026' })}
  </p>

  <!-- Qu'est-ce qu'un cookie -->
  <section>
    <h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-foreground">
      1. {i18n.t('cookiesIntroTitle')}
    </h2>
    <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
      {i18n.t('cookiesIntroContent')}
    </p>
  </section>

  <!-- Cookies essentiels -->
  <section>
    <h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-foreground">
      2. {i18n.t('cookiesEssentialTitle')}
    </h2>
    <p class="mb-4 text-sm text-gray-600 dark:text-gray-300">
      {i18n.t('cookiesEssentialDesc')}
    </p>
    <div class="overflow-hidden rounded-xl border border-gray-200 dark:border-border">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-200 bg-gray-50 dark:border-border dark:bg-muted/50">
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-muted-foreground">Cookie</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-muted-foreground">Description</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 bg-white dark:divide-border dark:bg-card/60">
          <tr>
            <td class="px-4 py-3 font-mono text-xs font-medium text-gray-900 dark:text-foreground">
              {i18n.t('cookieAuthToken')}
            </td>
            <td class="px-4 py-3 text-gray-600 dark:text-gray-300">{i18n.t('cookieAuthTokenDesc')}</td>
          </tr>
          <tr>
            <td class="px-4 py-3 font-mono text-xs font-medium text-gray-900 dark:text-foreground">
              {i18n.t('cookieCsrf')}
            </td>
            <td class="px-4 py-3 text-gray-600 dark:text-gray-300">{i18n.t('cookieCsrfDesc')}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <!-- Stockage local fonctionnel -->
  <section>
    <h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-foreground">
      3. {i18n.t('cookiesFunctionalTitle')}
    </h2>
    <p class="mb-4 text-sm text-gray-600 dark:text-gray-300">
      {i18n.t('cookiesFunctionalDesc')}
    </p>
    <div class="overflow-hidden rounded-xl border border-gray-200 dark:border-border">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-200 bg-gray-50 dark:border-border dark:bg-muted/50">
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-muted-foreground">Clé</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-muted-foreground">Description</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 bg-white dark:divide-border dark:bg-card/60">
          <tr>
            <td class="px-4 py-3 font-mono text-xs font-medium text-gray-900 dark:text-foreground">
              {i18n.t('cookieLang')}
            </td>
            <td class="px-4 py-3 text-gray-600 dark:text-gray-300">{i18n.t('cookieLangDesc')}</td>
          </tr>
          <tr>
            <td class="px-4 py-3 font-mono text-xs font-medium text-gray-900 dark:text-foreground">
              {i18n.t('cookieTheme')}
            </td>
            <td class="px-4 py-3 text-gray-600 dark:text-gray-300">{i18n.t('cookieThemeDesc')}</td>
          </tr>
          <tr>
            <td class="px-4 py-3 font-mono text-xs font-medium text-gray-900 dark:text-foreground">
              {i18n.t('cookieAppStore')}
            </td>
            <td class="px-4 py-3 text-gray-600 dark:text-gray-300">{i18n.t('cookieAppStoreDesc')}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <!-- Cookies tiers -->
  <section>
    <h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-foreground">
      4. {i18n.t('cookiesThirdPartyTitle')}
    </h2>
    <p class="mb-4 text-sm text-gray-600 dark:text-gray-300">
      {i18n.t('cookiesThirdPartyDesc')}
    </p>
    <div class="rounded-xl border border-gray-200 bg-white p-5 dark:border-border dark:bg-card/60">
      <h3 class="mb-2 text-sm font-semibold text-gray-900 dark:text-foreground">
        {i18n.t('cookieStripe')}
      </h3>
      <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
        {i18n.t('cookieStripeDesc')}
      </p>
    </div>
  </section>

  <!-- Gestion -->
  <section>
    <h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-foreground">
      5. {i18n.t('cookiesManageTitle')}
    </h2>
    <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
      {i18n.t('cookiesManageContent')}
    </p>
  </section>
</LegalLayout>
