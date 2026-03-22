<script lang="ts">
  import './layout.css';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { appStore } from '$lib/stores/app.svelte';
  import { userStore } from '$lib/stores/user.svelte';
  import { planStore } from '$lib/stores/plan.svelte';
  import Sidebar from '$lib/components/layout/Sidebar.svelte';
  import TopBar from '$lib/components/layout/TopBar.svelte';
  import ProfileOverlay from '$lib/components/overlays/ProfileOverlay.svelte';
  import SettingsOverlay from '$lib/components/overlays/SettingsOverlay.svelte';
  import UpgradeModal from '$lib/components/billing/UpgradeModal.svelte';
  import { Toaster } from 'svelte-sonner';

  let { children } = $props();

  // Routes sans sidebar (pages auth et landing)
  const AUTH_ROUTES = ['/login', '/register', '/reset-password', '/landing'];
  let isAuthRoute = $derived(AUTH_ROUTES.some((r) => $page.url.pathname.startsWith(r)));

  let activeModelLabel = $derived(
    appStore.selectedOption?.name ||
    `${appStore.selectedOption?.provider || 'OpenAI'} – ${appStore.selectedOption?.model || 'gpt-4o'}`,
  );

  let messagesCount = $state(0);

  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

  onMount(() => {
    userStore.loadUser();

    // Charger le plan uniquement en mode web et si l'utilisateur est connecté
    if (!isTauri) {
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

  let showOverlay = $derived(appStore.profil || appStore.settingsOpen);
</script>

{#if isAuthRoute}
  <!-- Layout sans sidebar pour les pages auth / landing -->
  {@render children()}
{:else}
  <!-- Layout applicatif avec sidebar -->
  <div class="flex h-screen gap-2 overflow-hidden bg-gray-100 p-2 dark:bg-slate-950">
    <!-- Sidebar -->
    <Sidebar />

    <!-- Main content area -->
    <main class="relative flex flex-1 flex-col gap-2 min-h-0">
      <!-- Top bar -->
      <TopBar
        {activeModelLabel}
        {messagesCount}
        onClear={handleClearChat}
      />

      <!-- Page content (always mounted, hidden when overlay is active) -->
      <div class="flex-1 min-h-0 relative rounded-2xl bg-white overflow-hidden dark:border dark:border-border dark:bg-background" class:hidden={showOverlay}>
        {@render children()}
      </div>

      <!-- Profile overlay (replaces chat zone visually) -->
      {#if appStore.profil}
        <div class="flex-1 min-h-0 relative rounded-2xl bg-white overflow-hidden dark:border dark:border-border dark:bg-card">
          <ProfileOverlay onClose={() => appStore.setProfil(false)} />
        </div>
      {/if}

      <!-- Settings overlay (replaces chat zone visually) -->
      {#if appStore.settingsOpen}
        <div class="flex-1 min-h-0 relative rounded-2xl bg-white overflow-hidden dark:border dark:border-border dark:bg-card">
          <SettingsOverlay onClose={() => appStore.setSettingsOpen(false)} />
        </div>
      {/if}
    </main>
  </div>
{/if}

<Toaster richColors position="bottom-right" />

<!-- Modale d'upgrade globale, montée au niveau du layout -->
<UpgradeModal />
