<script lang="ts">
  import { i18n } from '$lib/i18n/i18n.svelte';
  import LegalLayout from '$lib/components/common/LegalLayout.svelte';
</script>

<svelte:head>
  <title>ChatBot AI — {i18n.t('legalPageTitle')}</title>
</svelte:head>

<LegalLayout title={i18n.t('legalPageTitle')}>
  <p class="text-sm text-gray-500 dark:text-muted-foreground">
    {i18n.t('legalLastUpdated', { date: '22 mars 2026' })}
  </p>

  <!-- Éditeur -->
  <section>
    <h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-foreground">
      1. {i18n.t('legalEditorTitle')}
    </h2>
    <div class="rounded-xl border border-gray-200 bg-white p-5 dark:border-border dark:bg-card/60">
      <ul class="space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
        <li><span class="font-medium text-gray-900 dark:text-foreground">Nom :</span> {i18n.t('legalEditorName')}</li>
        <li><span class="font-medium text-gray-900 dark:text-foreground">Adresse :</span> {i18n.t('legalEditorAddress')}</li>
        <li>
          <span class="font-medium text-gray-900 dark:text-foreground">{i18n.t('legalContactEmail')} :</span>{' '}
          <a href="mailto:{i18n.t('legalEditorEmail')}" class="text-primary hover:underline">
            {i18n.t('legalEditorEmail')}
          </a>
        </li>
        <li>
          <span class="font-medium text-gray-900 dark:text-foreground">Site web :</span>{' '}
          <a href="https://jean-nguyen.dev" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">
            {i18n.t('legalEditorSite')}
          </a>
        </li>
      </ul>
    </div>
  </section>

  <!-- Hébergeur -->
  <section>
    <h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-foreground">
      2. {i18n.t('legalHostTitle')}
    </h2>
    <div class="rounded-xl border border-gray-200 bg-white p-5 dark:border-border dark:bg-card/60">
      <ul class="space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
        <li><span class="font-medium text-gray-900 dark:text-foreground">Société :</span> {i18n.t('legalHostName')}</li>
        <li><span class="font-medium text-gray-900 dark:text-foreground">Adresse :</span> {i18n.t('legalHostAddress')}</li>
        <li>
          <span class="font-medium text-gray-900 dark:text-foreground">Site web :</span>{' '}
          <a href={i18n.t('legalHostUrl')} target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">
            {i18n.t('legalHostUrl')}
          </a>
        </li>
      </ul>
    </div>
  </section>

  <!-- Directeur de publication -->
  <section>
    <h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-foreground">
      3. {i18n.t('legalDirectorTitle')}
    </h2>
    <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
      {i18n.t('legalDirectorContent')}
    </p>
  </section>

  <!-- Propriété intellectuelle -->
  <section>
    <h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-foreground">
      4. {i18n.t('legalIpTitle')}
    </h2>
    <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
      {i18n.t('legalIpContent')}
    </p>
  </section>

  <!-- Responsabilité -->
  <section>
    <h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-foreground">
      5. {i18n.t('legalResponsibilityTitle')}
    </h2>
    <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
      {i18n.t('legalResponsibilityContent')}
    </p>
  </section>

  <!-- Liens hypertextes -->
  <section>
    <h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-foreground">
      6. {i18n.t('legalLinksTitle')}
    </h2>
    <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
      {i18n.t('legalLinksContent')}
    </p>
  </section>
</LegalLayout>
