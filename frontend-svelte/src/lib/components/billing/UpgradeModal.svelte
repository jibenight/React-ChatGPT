<script lang="ts">
  import Modal from '$lib/components/ui/Modal.svelte';
  import { planStore } from '$lib/stores/plan.svelte';
  import { i18n } from '$lib/i18n';

  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

  let loading = $state(false);
  let error = $state<string | null>(null);

  async function handleUpgrade() {
    if (isTauri) return;
    loading = true;
    error = null;
    try {
      const url = await planStore.createCheckoutSession('pro', 'monthly');
      if (url) window.location.href = url;
    } catch {
      error = i18n.t('billingCheckoutError');
    } finally {
      loading = false;
    }
  }
</script>

<Modal open={planStore.showUpgrade} onClose={() => planStore.closeUpgrade()}>
  <!-- Icône d'avertissement + titre -->
  <div class="mb-4 flex items-center gap-3">
    <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/20">
      <svg
        class="h-5 w-5 text-amber-600 dark:text-amber-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    </div>
    <h2 class="text-lg font-semibold text-gray-900 dark:text-foreground">
      {i18n.t('billingUpgradeTitle')}
    </h2>
  </div>

  <!-- Raison de la limite -->
  <p class="mb-2 text-sm text-gray-600 dark:text-muted-foreground">
    {planStore.upgradeReason || i18n.t('billingUpgradeDesc')}
  </p>

  <!-- Comparaison plan actuel vs Pro -->
  <div class="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-border dark:bg-card/60">
    <div class="flex items-center justify-between text-sm">
      <span class="font-medium text-gray-700 dark:text-foreground">
        {i18n.t('billingCurrentPlan')}
      </span>
      <span class="rounded-full border border-gray-200 bg-white px-3 py-0.5 text-xs font-semibold text-gray-700 dark:border-border dark:bg-muted dark:text-foreground">
        {planStore.planDisplay}
      </span>
    </div>
    <div class="mt-3 flex items-center justify-between text-sm">
      <span class="font-medium text-teal-700 dark:text-teal-300">
        {i18n.t('billingPro')}
      </span>
      <span class="rounded-full border border-teal-200 bg-teal-50 px-3 py-0.5 text-xs font-semibold text-teal-700 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-300">
        8€ / {i18n.t('billingPerMonth')}
      </span>
    </div>

    <!-- Avantages Pro -->
    <ul class="mt-3 space-y-1 text-xs text-gray-500 dark:text-muted-foreground">
      {#each [i18n.t('billingFeatureUnlimitedMessages'), i18n.t('billingFeatureAllProviders'), i18n.t('billingFeatureUnlimitedProjects')] as feat}
        <li class="flex items-center gap-1.5">
          <svg class="h-3.5 w-3.5 text-teal-500" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
          </svg>
          {feat}
        </li>
      {/each}
    </ul>
  </div>

  <!-- Erreur -->
  {#if error}
    <p class="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
      {error}
    </p>
  {/if}

  <!-- Actions -->
  <div class="mt-6 flex gap-3">
    <button
      type="button"
      onclick={() => planStore.closeUpgrade()}
      class="flex-1 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-border dark:text-muted-foreground dark:hover:bg-muted"
    >
      {i18n.t('close')}
    </button>
    <button
      type="button"
      onclick={handleUpgrade}
      disabled={loading || isTauri}
      class="flex-1 rounded-full bg-teal-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? i18n.t('loading') : i18n.t('billingUpgradeCta')}
    </button>
  </div>
</Modal>
