<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { appStore } from '$lib/stores/app.svelte';
  import { planStore } from '$lib/stores/plan.svelte';
  import { authStore } from '$lib/stores/auth.svelte';
  import Sidebar from '$lib/components/layout/Sidebar.svelte';
  import TopBar from '$lib/components/layout/TopBar.svelte';
  import ProfileOverlay from '$lib/components/overlays/ProfileOverlay.svelte';
  import SettingsOverlay from '$lib/components/overlays/SettingsOverlay.svelte';

  let { children } = $props();

  let activeModelLabel = $derived(
    appStore.selectedOption?.name ||
    `${appStore.selectedOption?.provider || 'OpenAI'} – ${appStore.selectedOption?.model || 'gpt-4o'}`,
  );

  let messagesCount = $state(0);

  let showOverlay = $derived(appStore.profil || appStore.settingsOpen);

  $effect(() => {
    if (authStore.isLoading) return;
    if (!authStore.isAuthenticated) {
      goto('/login', { replaceState: true });
    }
  });

  onMount(() => {
    if (!authStore.isTauri) {
      planStore.fetchPlan().catch(() => null);
    }

    const handler = (e: CustomEvent) => {
      messagesCount = e.detail ?? 0;
    };
    window.addEventListener('messages-count', handler as EventListener);
    return () => window.removeEventListener('messages-count', handler as EventListener);
  });

  function handleClearChat() {
    window.dispatchEvent(new Event('clear-chat'));
  }
</script>

{#if authStore.isLoading || !authStore.isAuthenticated}
  <div class="flex h-screen items-center justify-center bg-gray-100 dark:bg-slate-950">
    <div class="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
  </div>
{:else}
  <div class="flex h-screen gap-2 overflow-hidden bg-gray-100 p-2 dark:bg-slate-950">
    <!-- Sidebar -->
    <Sidebar />

    <!-- Main content area -->
    <main class="relative flex min-h-0 flex-1 flex-col gap-2">
      <!-- Top bar -->
      <TopBar
        {activeModelLabel}
        {messagesCount}
        onClear={handleClearChat}
      />

      <!-- Page content (always mounted, hidden when overlay is active) -->
      <div
        class="relative min-h-0 flex-1 overflow-hidden rounded-2xl bg-white dark:border dark:border-border dark:bg-background"
        class:hidden={showOverlay}
      >
        {@render children()}
      </div>

      <!-- Profile overlay (replaces chat zone visually) -->
      {#if appStore.profil}
        <div class="relative min-h-0 flex-1 overflow-hidden rounded-2xl bg-white dark:border dark:border-border dark:bg-card">
          <ProfileOverlay onClose={() => appStore.setProfil(false)} />
        </div>
      {/if}

      <!-- Settings overlay (replaces chat zone visually) -->
      {#if appStore.settingsOpen}
        <div class="relative min-h-0 flex-1 overflow-hidden rounded-2xl bg-white dark:border dark:border-border dark:bg-card">
          <SettingsOverlay onClose={() => appStore.setSettingsOpen(false)} />
        </div>
      {/if}
    </main>
  </div>
{/if}
