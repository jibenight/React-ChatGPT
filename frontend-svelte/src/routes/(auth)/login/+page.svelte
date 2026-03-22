<script lang="ts">
  import { goto } from '$app/navigation';
  import { i18n } from '$lib/i18n/i18n.svelte';
  import { userStore } from '$lib/stores/user.svelte';
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
      userStore.setUserData(normalized);
      localStorage.setItem('user', JSON.stringify(normalized));
      goto('/');
    } catch {
      error = i18n.t('invalidCredentials');
    } finally {
      loading = false;
    }
  }
</script>

<div class="relative min-h-screen flex items-center justify-center bg-background overflow-hidden">
  <MatrixBackground />

  <div class="relative z-10 w-full max-w-sm mx-4">
    <div class="bg-background/80 dark:bg-background/90 backdrop-blur-md border border-border rounded-2xl shadow-xl p-8">
      <div class="mb-8 text-center">
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
          <span class="text-2xl">✦</span>
        </div>
        <h1 class="text-2xl font-bold text-foreground">{i18n.t('loginTitle')}</h1>
      </div>

      <form onsubmit={handleSubmit} class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-foreground mb-1.5" for="email">
            {i18n.t('email')}
          </label>
          <input
            id="email"
            type="email"
            bind:value={email}
            placeholder={i18n.t('emailPlaceholder')}
            autocomplete="email"
            class="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-foreground mb-1.5" for="password">
            {i18n.t('password')}
          </label>
          <input
            id="password"
            type="password"
            bind:value={password}
            placeholder={i18n.t('passwordPlaceholder')}
            autocomplete="current-password"
            class="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
          />
        </div>

        <div class="flex justify-end">
          <a
            href="/reset-password"
            class="text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            {i18n.t('forgotPassword')}
          </a>
        </div>

        {#if error}
          <p class="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
        {/if}

        <button
          type="submit"
          disabled={loading}
          class="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? i18n.t('connecting') : i18n.t('loginButton')}
        </button>
      </form>

      <p class="mt-6 text-center text-sm text-muted-foreground">
        {i18n.t('noAccount')}
        <a href="/register" class="font-medium text-primary hover:underline ml-1">
          {i18n.t('createAccount')}
        </a>
      </p>
    </div>
  </div>
</div>
