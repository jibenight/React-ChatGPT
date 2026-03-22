<script lang="ts">
  import { goto } from '$app/navigation';
  import { i18n } from '$lib/i18n/i18n.svelte';
  import MatrixBackground from '$lib/components/common/MatrixBackground.svelte';

  let username = $state('');
  let email = $state('');
  let password = $state('');
  let confirmPassword = $state('');
  let error = $state<string | null>(null);
  let success = $state(false);
  let loading = $state(false);

  const API_URL = import.meta.env.VITE_API_URL || '';

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    error = null;

    if (!username.trim()) {
      error = i18n.t('usernameRequired');
      return;
    }
    if (!email) {
      error = i18n.t('emailRequired');
      return;
    }
    if (!password) {
      error = i18n.t('passwordRequired');
      return;
    }
    if (password.length < 8) {
      error = i18n.t('passwordTooShort');
      return;
    }
    if (password !== confirmPassword) {
      error = i18n.t('passwordMismatch');
      return;
    }

    loading = true;
    try {
      const res = await fetch(`${API_URL}/register`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), email, password }),
      });

      const data: { error?: string } = await res.json();

      if (!res.ok) {
        if (data?.error?.toLowerCase().includes('email')) {
          error = i18n.t('emailTaken');
        } else {
          error = data?.error || i18n.t('error');
        }
        return;
      }

      success = true;
    } catch {
      error = i18n.t('error');
    } finally {
      loading = false;
    }
  }
</script>

<div class="relative min-h-screen flex items-center justify-center bg-background overflow-hidden">
  <MatrixBackground />

  <div class="relative z-10 w-full max-w-sm mx-4">
    {#if success}
      <div class="bg-background/80 dark:bg-background/90 backdrop-blur-md border border-border rounded-2xl shadow-xl p-8 text-center">
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-green-500/10 mb-4">
          <svg class="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 class="text-xl font-bold text-foreground mb-2">{i18n.t('registerSuccess')}</h1>
        <p class="text-sm text-muted-foreground mb-6">{i18n.t('checkEmail')}</p>
        <button
          onclick={() => goto('/login')}
          class="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90"
        >
          {i18n.t('loginButton')}
        </button>
      </div>
    {:else}
      <div class="bg-background/80 dark:bg-background/90 backdrop-blur-md border border-border rounded-2xl shadow-xl p-8">
        <div class="mb-8 text-center">
          <div class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
            <span class="text-2xl">✦</span>
          </div>
          <h1 class="text-2xl font-bold text-foreground">{i18n.t('registerTitle')}</h1>
        </div>

        <form onsubmit={handleSubmit} class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-foreground mb-1.5" for="username">
              {i18n.t('usernameLabel')}
            </label>
            <input
              id="username"
              type="text"
              bind:value={username}
              placeholder={i18n.t('usernamePlaceholder')}
              autocomplete="username"
              class="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
            />
          </div>

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
              autocomplete="new-password"
              class="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-foreground mb-1.5" for="confirm-password">
              {i18n.t('confirmPassword')}
            </label>
            <input
              id="confirm-password"
              type="password"
              bind:value={confirmPassword}
              placeholder={i18n.t('passwordPlaceholder')}
              autocomplete="new-password"
              class="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
            />
          </div>

          {#if error}
            <p class="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
          {/if}

          <button
            type="submit"
            disabled={loading}
            class="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? i18n.t('registering') : i18n.t('registerButton')}
          </button>
        </form>

        <p class="mt-6 text-center text-sm text-muted-foreground">
          {i18n.t('alreadyAccount')}
          <a href="/login" class="font-medium text-primary hover:underline ml-1">
            {i18n.t('loginButton')}
          </a>
        </p>
      </div>
    {/if}
  </div>
</div>
