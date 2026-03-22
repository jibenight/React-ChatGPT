<script lang="ts">
  import { planStore } from '$lib/stores/plan.svelte';
  import { i18n } from '$lib/i18n';

  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

  let loading = $state(false);
  let error = $state<string | null>(null);

  async function handleOpen() {
    if (isTauri) return;
    loading = true;
    error = null;
    try {
      const url = await planStore.createPortalSession();
      if (url) window.open(url, '_blank');
    } catch {
      error = i18n.t('billingPortalError');
    } finally {
      loading = false;
    }
  }
</script>

<div class="flex flex-col items-start gap-1">
  <button
    type="button"
    onclick={handleOpen}
    disabled={loading || isTauri}
    class="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-border dark:bg-card dark:text-muted-foreground dark:hover:bg-muted"
  >
    {loading ? i18n.t('loading') : i18n.t('billingManage')}
  </button>
  {#if error}
    <p class="text-xs text-red-500 dark:text-red-400">{error}</p>
  {/if}
</div>
