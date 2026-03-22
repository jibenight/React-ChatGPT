<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/auth.svelte';

  let { children } = $props();

  const REDIRECT_IF_LOGGED = ['/', '/login', '/register'];

  $effect(() => {
    if (authStore.isLoading) return;
    if (authStore.isTauri) {
      goto('/chat', { replaceState: true });
      return;
    }
    if (authStore.isAuthenticated && REDIRECT_IF_LOGGED.includes($page.url.pathname)) {
      goto('/chat', { replaceState: true });
    }
  });
</script>

{#if authStore.isLoading}
  <div class="flex h-screen items-center justify-center bg-gray-100 dark:bg-slate-950">
    <div class="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
  </div>
{:else}
  {@render children()}
{/if}
