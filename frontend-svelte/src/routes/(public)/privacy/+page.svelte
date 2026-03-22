<script lang="ts">
  import { i18n } from '$lib/i18n/i18n.svelte';
  import LegalLayout from '$lib/components/common/LegalLayout.svelte';
</script>

<svelte:head>
  <title>ChatBot AI — {i18n.t('privacyPageTitle')}</title>
</svelte:head>

<LegalLayout title={i18n.t('privacyPageTitle')}>
  <p class="text-sm text-gray-500 dark:text-muted-foreground">
    {i18n.t('legalLastUpdated', { date: '22 mars 2026' })}
  </p>

  <!-- Responsable -->
  <section>
    <h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-foreground">
      1. {i18n.t('privacyControllerTitle')}
    </h2>
    <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
      {i18n.t('privacyControllerContent')}
    </p>
  </section>

  <!-- Données collectées -->
  <section>
    <h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-foreground">
      2. {i18n.t('privacyDataTitle')}
    </h2>
    <p class="mb-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
      {i18n.t('privacyDataContent')}
    </p>
    <ul class="space-y-2 rounded-xl border border-gray-200 bg-white p-5 dark:border-border dark:bg-card/60">
      <li class="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
        <span class="mt-0.5 shrink-0 text-primary">•</span>
        {i18n.t('privacyDataEmail')}
      </li>
      <li class="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
        <span class="mt-0.5 shrink-0 text-primary">•</span>
        {i18n.t('privacyDataUsername')}
      </li>
      <li class="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
        <span class="mt-0.5 shrink-0 text-primary">•</span>
        {i18n.t('privacyDataApiKeys')}
      </li>
      <li class="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
        <span class="mt-0.5 shrink-0 text-primary">•</span>
        {i18n.t('privacyDataMessages')}
      </li>
      <li class="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
        <span class="mt-0.5 shrink-0 text-primary">•</span>
        {i18n.t('privacyDataTechnical')}
      </li>
    </ul>
  </section>

  <!-- Finalités -->
  <section>
    <h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-foreground">
      3. {i18n.t('privacyPurposesTitle')}
    </h2>
    <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
      {i18n.t('privacyPurposesContent')}
    </p>
  </section>

  <!-- Base légale -->
  <section>
    <h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-foreground">
      4. {i18n.t('privacyBasisTitle')}
    </h2>
    <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
      {i18n.t('privacyBasisContent')}
    </p>
  </section>

  <!-- Durée de conservation -->
  <section>
    <h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-foreground">
      5. {i18n.t('privacyRetentionTitle')}
    </h2>
    <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
      {i18n.t('privacyRetentionContent')}
    </p>
  </section>

  <!-- Destinataires -->
  <section>
    <h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-foreground">
      6. {i18n.t('privacyRecipientsTitle')}
    </h2>
    <p class="mb-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
      {i18n.t('privacyRecipientsContent')}
    </p>
    <ul class="space-y-2 rounded-xl border border-gray-200 bg-white p-5 dark:border-border dark:bg-card/60">
      <li class="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
        <span class="mt-0.5 shrink-0 text-primary">•</span>
        {i18n.t('privacyRecipientsStripe')}
      </li>
      <li class="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
        <span class="mt-0.5 shrink-0 text-primary">•</span>
        {i18n.t('privacyRecipientsSmtp')}
      </li>
      <li class="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
        <span class="mt-0.5 shrink-0 text-primary">•</span>
        {i18n.t('privacyRecipientsAi')}
      </li>
    </ul>
  </section>

  <!-- Transferts hors UE -->
  <section>
    <h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-foreground">
      7. {i18n.t('privacyTransfersTitle')}
    </h2>
    <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
      {i18n.t('privacyTransfersContent')}
    </p>
  </section>

  <!-- Droits des utilisateurs -->
  <section>
    <h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-foreground">
      8. {i18n.t('privacyRightsTitle')}
    </h2>
    <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
      {i18n.t('privacyRightsContent')}
    </p>
  </section>

  <!-- Sécurité -->
  <section>
    <h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-foreground">
      9. {i18n.t('privacySecurityTitle')}
    </h2>
    <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
      {i18n.t('privacySecurityContent')}
    </p>
  </section>

  <!-- Cookies -->
  <section>
    <h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-foreground">
      10. {i18n.t('privacyCookiesTitle')}
    </h2>
    <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
      {i18n.t('privacyCookiesContent')}{' '}
      <a href="/cookies" class="text-primary hover:underline">/cookies</a>.
    </p>
  </section>

  <!-- Modifications -->
  <section>
    <h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-foreground">
      11. {i18n.t('privacyModificationTitle')}
    </h2>
    <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
      {i18n.t('privacyModificationContent')}
    </p>
  </section>

  <!-- Contact DPO -->
  <section>
    <h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-foreground">
      12. {i18n.t('privacyDpoTitle')}
    </h2>
    <div class="rounded-xl border border-gray-200 bg-white p-5 dark:border-border dark:bg-card/60">
      <p class="text-sm text-gray-600 dark:text-gray-300">
        {i18n.t('privacyDpoContent')}{' '}
        <a href="mailto:contact@jean-nguyen.dev" class="text-primary hover:underline">
          contact@jean-nguyen.dev
        </a>
      </p>
    </div>
  </section>
</LegalLayout>
