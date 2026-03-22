<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { planStore } from '$lib/stores/plan.svelte';
  import { i18n } from '$lib/i18n';

  let countdown = $state(3);
  let sessionId = $derived($page.url.searchParams.get('session_id'));

  onMount(() => {
    planStore.fetchPlan().catch(() => null);

    const interval = setInterval(() => {
      countdown -= 1;
      if (countdown <= 0) {
        clearInterval(interval);
        goto('/chat', { replaceState: true });
      }
    }, 1000);

    return () => clearInterval(interval);
  });
</script>

<div class="flex min-h-screen items-center justify-center bg-background px-4">
  <div class="w-full max-w-md rounded-2xl border border-border bg-card p-10 text-center shadow-lg">
    <!-- Icône succès -->
    <div class="mb-6 flex justify-center">
      <div class="flex h-16 w-16 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-500/20">
        <svg
          class="h-8 w-8 text-teal-600 dark:text-teal-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
    </div>

    <h1 class="mb-2 text-2xl font-bold text-foreground">
      {i18n.t('billingSuccess')}
    </h1>
    <p class="mb-2 text-sm text-muted-foreground">
      {i18n.t('billingSuccessDesc')}
    </p>

    {#if sessionId}
      <p class="mb-4 font-mono text-xs text-muted-foreground/60">
        {sessionId}
      </p>
    {/if}

    <p class="mt-6 text-sm text-muted-foreground">
      {i18n.t('billingRedirecting')} {countdown}s...
    </p>

    <button
      type="button"
      onclick={() => goto('/chat', { replaceState: true })}
      class="mt-4 inline-flex rounded-full bg-teal-500 px-6 py-2 text-sm font-semibold text-white transition hover:bg-teal-600"
    >
      {i18n.t('chat')}
    </button>
  </div>
</div>
