<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { i18n } from '$lib/i18n/i18n.svelte';
  import { authStore } from '$lib/stores/auth.svelte';
  import MatrixBackground from '$lib/components/common/MatrixBackground.svelte';
  import { API_URL } from '$lib/api';

  // Check for OAuth error in URL
  let oauthError = $derived($page.url.searchParams.get('error'));

  let email = $state('');
  let password = $state('');
  let error = $state<string | null>(null);
  let loading = $state(false);
  let showPassword = $state(false);

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

      if (!res.ok) {
        const data: { error?: string } = await res.json().catch(() => ({}));
        if (res.status === 403 && (data?.error ?? '').includes('verify')) {
          error = i18n.t('emailNotVerified');
        } else {
          error = i18n.t('invalidCredentials');
        }
        return;
      }

      const data = await res.json();
      const user = (data.user ?? data) as Record<string, unknown>;
      const id = (user.id ?? user.userId) as number;
      const normalized = {
        id,
        userId: id,
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
          <div class="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              bind:value={password}
              placeholder={i18n.t('passwordPlaceholder')}
              autocomplete="current-password"
              class="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              type="button"
              onclick={() => showPassword = !showPassword}
              class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {#if showPassword}
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                </svg>
              {:else}
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              {/if}
            </button>
          </div>
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

        {#if oauthError}
          <p class="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {oauthError === 'oauth_denied' ? i18n.t('oauthDenied') :
             oauthError === 'oauth_email_conflict' ? i18n.t('oauthEmailConflict') :
             i18n.t('oauthFailed')}
          </p>
        {/if}

        <button
          type="submit"
          disabled={loading}
          class="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? i18n.t('connecting') : i18n.t('loginButton')}
        </button>
      </form>

      <!-- Social login divider -->
      <div class="relative mt-6">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-border"></div>
        </div>
        <div class="relative flex justify-center text-xs">
          <span class="bg-background/80 px-2 text-muted-foreground">{i18n.t('orContinueWith')}</span>
        </div>
      </div>

      <!-- Social login buttons -->
      <div class="mt-4 grid grid-cols-3 gap-3">
        <a
          href="{API_URL}/auth/google"
          class="flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <svg class="h-4 w-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          <span class="hidden sm:inline">{i18n.t('continueWithGoogle')}</span>
        </a>
        <a
          href="{API_URL}/auth/github"
          class="flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
          <span class="hidden sm:inline">{i18n.t('continueWithGithub')}</span>
        </a>
        <a
          href="{API_URL}/auth/apple"
          class="flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
          </svg>
          <span class="hidden sm:inline">{i18n.t('continueWithApple')}</span>
        </a>
      </div>

      <p class="mt-6 text-center text-sm text-muted-foreground">
        {i18n.t('noAccount')}
        <a href="/register" class="ml-1 font-medium text-primary hover:underline">
          {i18n.t('createAccount')}
        </a>
      </p>
    </div>
  </div>
</div>
