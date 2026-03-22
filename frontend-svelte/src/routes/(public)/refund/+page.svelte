<script lang="ts">
  import { i18n } from '$lib/i18n/i18n.svelte';
  import LegalLayout from '$lib/components/common/LegalLayout.svelte';
</script>

<svelte:head>
  <title>ChatBot AI — {i18n.t('refundPageTitle')}</title>
</svelte:head>

<LegalLayout title={i18n.t('refundPageTitle')}>
  <p class="text-sm text-gray-500 dark:text-muted-foreground">
    {i18n.t('legalLastUpdated', { date: '22 mars 2026' })}
  </p>

  <!-- Droit de rétractation -->
  <section>
    <h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-foreground">
      1. {i18n.t('refundWithdrawalTitle')}
    </h2>
    <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
      {i18n.t('refundWithdrawalContent')}
    </p>
  </section>

  <!-- Procédure -->
  <section>
    <h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-foreground">
      2. {i18n.t('refundProcedureTitle')}
    </h2>
    <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
      {i18n.t('refundProcedureContent')}
    </p>
  </section>

  <!-- Exclusions -->
  <section>
    <h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-foreground">
      3. {i18n.t('refundExclusionsTitle')}
    </h2>
    <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
      {i18n.t('refundExclusionsContent')}
    </p>
  </section>

  <!-- Prorata annuel -->
  <section>
    <h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-foreground">
      4. {i18n.t('refundProrataTitle')}
    </h2>
    <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
      {i18n.t('refundProrataContent')}
    </p>
  </section>

  <!-- Desktop -->
  <section>
    <h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-foreground">
      5. {i18n.t('refundDesktopTitle')}
    </h2>
    <div class="rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-500/30 dark:bg-amber-500/10">
      <p class="text-sm leading-relaxed text-amber-800 dark:text-amber-300">
        {i18n.t('refundDesktopContent')}
      </p>
    </div>
  </section>

  <!-- Contact -->
  <section>
    <h2 class="mb-3 text-xl font-semibold text-gray-900 dark:text-foreground">
      6. {i18n.t('refundContactTitle')}
    </h2>
    <div class="rounded-xl border border-gray-200 bg-white p-5 dark:border-border dark:bg-card/60">
      <p class="text-sm text-gray-600 dark:text-gray-300">
        {i18n.t('refundContactContent')}{' '}
        <a href="mailto:contact@jean-nguyen.dev" class="text-primary hover:underline">
          contact@jean-nguyen.dev
        </a>
      </p>
    </div>
  </section>
</LegalLayout>
