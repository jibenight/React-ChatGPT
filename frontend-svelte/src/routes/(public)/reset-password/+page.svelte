<script lang="ts">
  import { page } from '$app/stores';
  import { i18n } from '$lib/i18n/i18n.svelte';
  import MatrixBackground from '$lib/components/common/MatrixBackground.svelte';

  const API_URL = import.meta.env.VITE_API_URL || '';

  let token = $derived($page.url.searchParams.get('token'));

  // --- Request form state ---
  let reqEmail = $state('');
  let reqLoading = $state(false);
  let reqSuccess = $state(false);
  let reqError = $state<string | null>(null);

  async function handleRequestSubmit(e: SubmitEvent) {
    e.preventDefault();
    reqError = null;
    if (!reqEmail) {
      reqError = i18n.t('emailRequired');
      return;
    }
    reqLoading = true;
    try {
      const res = await fetch(`${API_URL}/reset-password-request`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: reqEmail }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        reqError = data?.error || i18n.t('error');
        return;
      }
      reqSuccess = true;
    } catch {
      reqError = i18n.t('error');
    } finally {
      reqLoading = false;
    }
  }

  // --- Reset form state ---
  let newPassword = $state('');
  let confirmPwd = $state('');
  let resetLoading = $state(false);
  let resetSuccess = $state(false);
  let resetError = $state<string | null>(null);

  async function handleResetSubmit(e: SubmitEvent) {
    e.preventDefault();
    resetError = null;
    if (newPassword.length < 8) {
      resetError = i18n.t('passwordTooShort');
      return;
    }
    if (newPassword !== confirmPwd) {
      resetError = i18n.t('passwordMismatch');
      return;
    }
    resetLoading = true;
    try {
      const res = await fetch(`${API_URL}/reset-password`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        resetError = data?.error || i18n.t('error');
        return;
      }
      resetSuccess = true;
    } catch {
      resetError = i18n.t('error');
    } finally {
      resetLoading = false;
    }
  }
</script>

<div class="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
  <MatrixBackground />

  <div class="relative z-10 mx-4 w-full max-w-sm">
    <div class="rounded-2xl border border-border bg-background/80 p-8 shadow-xl backdrop-blur-md dark:bg-background/90">

      {#if token}
        <!-- Formulaire de réinitialisation avec token -->
        {#if resetSuccess}
          <div class="text-center">
            <div class="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <svg class="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 class="mb-2 text-lg font-semibold text-foreground">{i18n.t('loginSuccess')}</h2>
            <p class="mb-6 text-sm text-muted-foreground">{i18n.t('resetPassword')}</p>
            <a href="/login" class="text-sm font-medium text-primary hover:underline">
              {i18n.t('loginButton')}
            </a>
          </div>
        {:else}
          <div class="mb-8 text-center">
            <div class="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <span class="text-2xl">✦</span>
            </div>
            <h1 class="text-2xl font-bold text-foreground">{i18n.t('resetPassword')}</h1>
          </div>

          <form onsubmit={handleResetSubmit} class="space-y-4">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-foreground" for="new-password">
                {i18n.t('newPassword')}
              </label>
              <input
                id="new-password"
                type="password"
                bind:value={newPassword}
                placeholder={i18n.t('passwordPlaceholder')}
                autocomplete="new-password"
                class="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-foreground" for="confirm-password">
                {i18n.t('confirmPassword')}
              </label>
              <input
                id="confirm-password"
                type="password"
                bind:value={confirmPwd}
                placeholder={i18n.t('passwordPlaceholder')}
                autocomplete="new-password"
                class="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {#if resetError}
              <p class="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{resetError}</p>
            {/if}

            <button
              type="submit"
              disabled={resetLoading}
              class="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {resetLoading ? i18n.t('loading') : i18n.t('resetPassword')}
            </button>
          </form>
        {/if}

      {:else}
        <!-- Formulaire de demande de réinitialisation -->
        {#if reqSuccess}
          <div class="text-center">
            <div class="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <svg class="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 class="mb-2 text-lg font-semibold text-foreground">{i18n.t('emailSent')}</h2>
            <p class="mb-6 text-sm text-muted-foreground">{i18n.t('checkEmail')}</p>
            <a href="/login" class="text-sm font-medium text-primary hover:underline">
              {i18n.t('login')}
            </a>
          </div>
        {:else}
          <div class="mb-8 text-center">
            <div class="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <span class="text-2xl">✦</span>
            </div>
            <h1 class="text-2xl font-bold text-foreground">{i18n.t('resetPasswordRequest')}</h1>
            <p class="mt-1 text-sm text-muted-foreground">{i18n.t('forgotPassword')}</p>
          </div>

          <form onsubmit={handleRequestSubmit} class="space-y-4">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-foreground" for="req-email">
                {i18n.t('email')}
              </label>
              <input
                id="req-email"
                type="email"
                bind:value={reqEmail}
                placeholder={i18n.t('emailPlaceholder')}
                autocomplete="email"
                class="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {#if reqError}
              <p class="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{reqError}</p>
            {/if}

            <button
              type="submit"
              disabled={reqLoading}
              class="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {reqLoading ? i18n.t('loading') : i18n.t('submit')}
            </button>
          </form>

          <p class="mt-6 text-center text-sm text-muted-foreground">
            <a href="/login" class="font-medium text-primary hover:underline">
              {i18n.t('login')}
            </a>
          </p>
        {/if}
      {/if}

    </div>
  </div>
</div>
