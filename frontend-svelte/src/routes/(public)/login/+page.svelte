<script lang="ts">
  import { goto } from '$app/navigation';
  import { i18n } from '$lib/i18n/i18n.svelte';
  import { authStore } from '$lib/stores/auth.svelte';
  import MatrixBackground from '$lib/components/common/MatrixBackground.svelte';

  let email = $state('');
  let password = $state('');
  let error = $state<string | null>(null);
  let loading = $state(false);

  const API_URL = import.meta.env.VITE_API_URL || '';

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    error = null;

    if (!email) {
      error = i18n.t('emailRequired');
      return;
    }
    if (!password) {
      error = i18n.t('passwordRequired');
      return;
    }

    loading = true;
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data: { user?: Record<string, unknown>; error?: string } & Record<string, unknown> = await res.json();

      if (!res.ok) {
        if (res.status === 403 && (data?.error as string)?.includes('verify')) {
          error = i18n.t('emailNotVerified');
        } else {
          error = i18n.t('invalidCredentials');
        }
        return;
      }

      const user = (data.user ?? data) as Record<string, unknown>;
      const normalized = {
        id: user.id as number,
        userId: user.id as number,
        username: user.username as string,
        email: user.email as string,
      };
      authStore.onLogin(normalized);
      goto('/chat');
    } catch {
      error = i18n.t('invalidCredentials');
    } finally {
      loading = false;
    }
  }
</script>

<div class="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
  <MatrixBackground />

  <div class="relative z-10 mx-4 w-full max-w-sm">
    <div class="rounded-2xl border border-border bg-background/80 p-8 shadow-xl backdrop-blur-md dark:bg-background/90">
      <div class="mb-8 text-center">
        <div class="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <span class="text-2xl">✦</span>
        </div>
        <h1 class="text-2xl font-bold text-foreground">{i18n.t('loginTitle')}</h1>
      </div>

      <form onsubmit={handleSubmit} class="space-y-4">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-foreground" for="email">
            {i18n.t('email')}
          </label>
          <input
            id="email"
            type="email"
            bind:value={email}
            placeholder={i18n.t('emailPlaceholder')}
            autocomplete="email"
            class="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div>
          <label class="mb-1.5 block text-sm font-medium text-foreground" for="password">
            {i18n.t('password')}
          </label>
          <input
            id="password"
            type="password"
            bind:value={password}
            placeholder={i18n.t('passwordPlaceholder')}
            autocomplete="current-password"
            class="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div class="flex justify-end">
          <a
            href="/reset-password"
            class="text-xs text-muted-foreground transition-colors hover:text-primary"
          >
            {i18n.t('forgotPassword')}
          </a>
        </div>

        {#if error}
          <p class="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        {/if}

        <button
          type="submit"
          disabled={loading}
          class="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? i18n.t('connecting') : i18n.t('loginButton')}
        </button>
      </form>

      <p class="mt-6 text-center text-sm text-muted-foreground">
        {i18n.t('noAccount')}
        <a href="/register" class="ml-1 font-medium text-primary hover:underline">
          {i18n.t('createAccount')}
        </a>
      </p>
    </div>
  </div>
</div>
