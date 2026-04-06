<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { i18n } from '$lib/i18n/i18n.svelte';
  import MatrixBackground from '$lib/components/common/MatrixBackground.svelte';
  import { API_URL } from '$lib/api';

  type Status = 'loading' | 'success' | 'error';

  let status = $state<Status>('loading');
  let resendEmail = $state('');
  let resendLoading = $state(false);
  let resendSuccess = $state(false);
  let resendError = $state<string | null>(null);

  let token = $derived($page.url.searchParams.get('token'));

  onMount(async () => {
    if (!token) {
      status = 'error';
      return;
    }
    try {
      const res = await fetch(`${API_URL}/verify-email?token=${encodeURIComponent(token)}`, {
        credentials: 'include',
      });
      if (res.ok) {
        status = 'success';
      } else {
        status = 'error';
      }
    } catch {
      status = 'error';
    }
  });

  async function handleResend() {
    resendError = null;
    if (!resendEmail) {
      resendError = i18n.t('emailRequired');
      return;
    }
    resendLoading = true;
    try {
      const res = await fetch(`${API_URL}/verify-email-request`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resendEmail }),
      });
      if (res.ok) {
        resendSuccess = true;
      } else {
        const data = await res.json().catch(() => ({}));
        resendError = data?.error || i18n.t('error');
      }
    } catch {
      resendError = i18n.t('error');
    } finally {
      resendLoading = false;
    }
  }
</script>

<svelte:head>
  <title>MultiAI — {i18n.t('verifyEmailTitle')}</title>
</svelte:head>

<div class="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
  <MatrixBackground />

  <div class="relative z-10 mx-4 w-full max-w-sm">
    <div class="rounded-2xl border border-border bg-background/80 p-8 text-center shadow-xl backdrop-blur-md dark:bg-background/90">

      {#if status === 'loading'}
        <!-- Chargement -->
        <div class="mb-4 flex justify-center">
          <div class="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
        <h1 class="text-xl font-bold text-foreground">{i18n.t('verifyEmailLoading')}</h1>

      {:else if status === 'success'}
        <!-- Succès -->
        <div class="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10">
          <svg class="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 class="mb-2 text-xl font-bold text-foreground">{i18n.t('verifyEmailSuccess')}</h1>
        <p class="mb-6 text-sm text-muted-foreground">{i18n.t('verifyEmailSuccessDesc')}</p>
        <div class="flex flex-col gap-3">
          <button
            onclick={() => goto('/chat')}
            class="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90"
          >
            {i18n.t('goToChat')}
          </button>
          <a
            href="/login"
            class="block rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            {i18n.t('goToLogin')}
          </a>
        </div>

      {:else}
        <!-- Erreur -->
        <div class="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
          <svg class="h-6 w-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 class="mb-2 text-xl font-bold text-foreground">{i18n.t('verifyEmailError')}</h1>
        <p class="mb-6 text-sm text-muted-foreground">{i18n.t('verifyEmailErrorDesc')}</p>

        {#if resendSuccess}
          <p class="mb-4 rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-600 dark:text-green-400">
            {i18n.t('verifyEmailResent')}
          </p>
        {:else}
          <div class="space-y-3 text-left">
            <input
              type="email"
              bind:value={resendEmail}
              placeholder={i18n.t('emailPlaceholder')}
              class="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {#if resendError}
              <p class="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{resendError}</p>
            {/if}
            <button
              onclick={handleResend}
              disabled={resendLoading}
              class="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {resendLoading ? i18n.t('loading') : i18n.t('resendVerification')}
            </button>
          </div>
        {/if}

        <a
          href="/login"
          class="mt-4 block text-sm font-medium text-primary hover:underline"
        >
          {i18n.t('goToLogin')}
        </a>
      {/if}

    </div>
  </div>
</div>
