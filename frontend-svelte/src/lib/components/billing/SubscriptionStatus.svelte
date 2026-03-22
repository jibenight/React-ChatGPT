<script lang="ts">
  import { planStore } from '$lib/stores/plan.svelte';
  import { i18n } from '$lib/i18n';

  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

  const PLAN_BADGE: Record<string, string> = {
    free: 'border-gray-200 bg-gray-100 text-gray-600 dark:border-border dark:bg-muted dark:text-muted-foreground',
    pro: 'border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-300',
    team: 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-300',
  };

  let loadingPortal = $state(false);
  let error = $state<string | null>(null);

  async function handleManage() {
    if (isTauri) return;
    loadingPortal = true;
    error = null;
    try {
      const url = await planStore.createPortalSession();
      if (url) window.open(url, '_blank');
    } catch {
      error = i18n.t('billingPortalError');
    } finally {
      loadingPortal = false;
    }
  }

  function formatDate(dateStr: string | null): string | null {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  let planName = $derived(planStore.planName);
  let badgeClass = $derived(PLAN_BADGE[planName] || PLAN_BADGE.free);
  let renewalDate = $derived(formatDate(planStore.subscription?.currentPeriodEnd ?? null));
</script>

<div class="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-border dark:bg-card/60">
  <div class="flex items-center justify-between">
    <div>
      <p class="text-xs uppercase tracking-[0.15em] text-gray-400 dark:text-muted-foreground">
        {i18n.t('billingPlan')}
      </p>
      <div class="mt-1 flex items-center gap-2">
        <span class="rounded-full border px-2.5 py-0.5 text-xs font-semibold {badgeClass}">
          {planStore.planDisplay}
        </span>
        {#if planStore.subscription?.cancelAtPeriodEnd}
          <span class="text-xs text-amber-600 dark:text-amber-400">
            ({i18n.t('billingCancel')})
          </span>
        {/if}
      </div>
      {#if renewalDate}
        <p class="mt-1 text-xs text-gray-500 dark:text-muted-foreground">
          {i18n.t('billingRenewalDate')} : {renewalDate}
        </p>
      {/if}
    </div>

    <div class="flex flex-col gap-2">
      {#if planName === 'free'}
        <button
          type="button"
          onclick={() => planStore.openUpgrade(i18n.t('billingUpgrade'))}
          class="rounded-full bg-teal-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-600"
        >
          {i18n.t('billingUpgrade')}
        </button>
      {:else}
        <button
          type="button"
          onclick={handleManage}
          disabled={loadingPortal || isTauri}
          class="rounded-full border border-gray-200 px-4 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-border dark:text-muted-foreground dark:hover:bg-muted"
        >
          {loadingPortal ? i18n.t('loading') : i18n.t('billingManage')}
        </button>
      {/if}
    </div>
  </div>

  {#if error}
    <p class="mt-2 text-xs text-red-500 dark:text-red-400">{error}</p>
  {/if}
</div>
