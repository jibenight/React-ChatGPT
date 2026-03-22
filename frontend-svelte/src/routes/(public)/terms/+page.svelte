<script lang="ts">
  import { i18n } from '$lib/i18n/i18n.svelte';
  import LegalLayout from '$lib/components/common/LegalLayout.svelte';
</script>

<svelte:head>
  <title>ChatBot AI — {i18n.t('termsPageTitle')}</title>
</svelte:head>

<LegalLayout title={i18n.t('termsPageTitle')}>
  <p class="text-sm text-gray-500 dark:text-muted-foreground">
    {i18n.t('legalEffectiveDate', { date: i18n.t('termsEffectiveDate') })}
  </p>

  <!-- Objet -->
  <section>
    <h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-foreground">
      1. {i18n.t('termsScopeTitle')}
    </h2>
    <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
      {i18n.t('termsScopeContent')}
    </p>
  </section>

  <!-- Accès -->
  <section>
    <h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-foreground">
      2. {i18n.t('termsAccessTitle')}
    </h2>
    <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
      {i18n.t('termsAccessContent')}
    </p>
  </section>

  <!-- Description -->
  <section>
    <h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-foreground">
      3. {i18n.t('termsDescriptionTitle')}
    </h2>
    <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
      {i18n.t('termsDescriptionContent')}
    </p>
  </section>

  <!-- Plans -->
  <section>
    <h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-foreground">
      4. {i18n.t('termsPricingTitle')}
    </h2>
    <p class="mb-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
      {i18n.t('termsPricingContent')}
    </p>
    <ul class="space-y-2 rounded-xl border border-gray-200 bg-white p-5 dark:border-border dark:bg-card/60">
      <li class="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
        <span class="mt-0.5 text-green-500">✓</span>
        {i18n.t('termsPricingFree')}
      </li>
      <li class="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
        <span class="mt-0.5 text-primary">✓</span>
        {i18n.t('termsPricingPro')}
      </li>
      <li class="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
        <span class="mt-0.5 text-green-500">✓</span>
        {i18n.t('termsPricingTeam')}
      </li>
      <li class="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
        <span class="mt-0.5 text-green-500">✓</span>
        {i18n.t('termsPricingDesktop')}
      </li>
    </ul>
  </section>

  <!-- BYOK -->
  <section>
    <h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-foreground">
      5. {i18n.t('termsByokTitle')}
    </h2>
    <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
      {i18n.t('termsByokContent')}
    </p>
  </section>

  <!-- Obligations -->
  <section>
    <h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-foreground">
      6. {i18n.t('termsObligationsTitle')}
    </h2>
    <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
      {i18n.t('termsObligationsContent')}
    </p>
  </section>

  <!-- Propriété intellectuelle -->
  <section>
    <h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-foreground">
      7. {i18n.t('termsIpTitle')}
    </h2>
    <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
      {i18n.t('termsIpContent')}
    </p>
  </section>

  <!-- Données personnelles -->
  <section>
    <h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-foreground">
      8. {i18n.t('termsPrivacyTitle')}
    </h2>
    <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
      {i18n.t('termsPrivacyContent')}{' '}
      <a href="/privacy" class="text-primary hover:underline">/privacy</a>.
    </p>
  </section>

  <!-- Limitation de responsabilité -->
  <section>
    <h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-foreground">
      9. {i18n.t('termsLiabilityTitle')}
    </h2>
    <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
      {i18n.t('termsLiabilityContent')}
    </p>
  </section>

  <!-- Résiliation -->
  <section>
    <h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-foreground">
      10. {i18n.t('termsTerminationTitle')}
    </h2>
    <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
      {i18n.t('termsTerminationContent')}
    </p>
  </section>

  <!-- Modification -->
  <section>
    <h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-foreground">
      11. {i18n.t('termsModificationTitle')}
    </h2>
    <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
      {i18n.t('termsModificationContent')}
    </p>
  </section>

  <!-- Droit applicable -->
  <section>
    <h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-foreground">
      12. {i18n.t('termsLawTitle')}
    </h2>
    <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
      {i18n.t('termsLawContent')}
    </p>
  </section>

  <!-- Liens connexes -->
  <div class="flex flex-wrap gap-3 rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-border dark:bg-muted/30">
    <a href="/privacy" class="text-sm text-primary hover:underline">Politique de confidentialité</a>
    <span class="text-gray-300 dark:text-gray-600">·</span>
    <a href="/cookies" class="text-sm text-primary hover:underline">Politique de cookies</a>
    <span class="text-gray-300 dark:text-gray-600">·</span>
    <a href="/refund" class="text-sm text-primary hover:underline">Politique de remboursement</a>
    <span class="text-gray-300 dark:text-gray-600">·</span>
    <a href="/legal" class="text-sm text-primary hover:underline">Mentions légales</a>
  </div>
</LegalLayout>
