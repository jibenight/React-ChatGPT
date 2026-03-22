<script lang="ts">
  import { i18n } from '$lib/i18n/i18n.svelte';
  import type { Snippet } from 'svelte';

  let { title, children }: { title: string; children: Snippet } = $props();
</script>

<div class="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
  <!-- Header nav -->
  <header class="border-b border-gray-200 bg-white/80 backdrop-blur-md dark:border-border/50 dark:bg-slate-950/80">
    <div class="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
      <a href="/" class="font-bold text-foreground">
        ✦ ChatBot AI
      </a>
      <a
        href="/"
        class="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-100 dark:border-border dark:bg-muted dark:text-muted-foreground dark:hover:bg-muted/80"
      >
        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        {i18n.t('backToHome')}
      </a>
    </div>
  </header>

  <!-- Content -->
  <main class="mx-auto max-w-4xl px-4 py-12">
    <h1 class="mb-8 text-3xl font-bold text-gray-900 dark:text-foreground">{title}</h1>

    <div class="prose-legal space-y-8 text-gray-700 dark:text-gray-300">
      {@render children()}
    </div>
  </main>

  <!-- Footer -->
  <footer class="mt-16 border-t border-gray-200 px-4 py-8 dark:border-border">
    <div class="mx-auto max-w-4xl flex flex-col items-center justify-between gap-4 sm:flex-row">
      <span class="text-sm font-semibold text-gray-700 dark:text-foreground">✦ ChatBot AI</span>
      <nav class="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-muted-foreground">
        <a href="/terms" class="transition-colors hover:text-gray-900 dark:hover:text-foreground">{i18n.t('navTerms')}</a>
        <a href="/privacy" class="transition-colors hover:text-gray-900 dark:hover:text-foreground">{i18n.t('navPrivacy')}</a>
        <a href="/cookies" class="transition-colors hover:text-gray-900 dark:hover:text-foreground">{i18n.t('navCookies')}</a>
        <a href="/legal" class="transition-colors hover:text-gray-900 dark:hover:text-foreground">{i18n.t('navLegal')}</a>
        <a href="/contact" class="transition-colors hover:text-gray-900 dark:hover:text-foreground">{i18n.t('navContact')}</a>
      </nav>
      <a
        href="/"
        class="text-xs text-gray-500 transition-colors hover:text-gray-900 dark:text-muted-foreground dark:hover:text-foreground"
      >
        {i18n.t('backToHome')}
      </a>
    </div>
  </footer>
</div>
