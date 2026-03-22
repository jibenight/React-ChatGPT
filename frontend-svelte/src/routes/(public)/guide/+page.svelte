<script lang="ts">
  import { X, MessageSquare, Key, FolderOpen, Settings, Zap } from 'lucide-svelte';
  import { authStore } from '$lib/stores/auth.svelte';
  import { i18n } from '$lib/i18n';

  // Lien retour conditionnel selon l'état d'auth
  let backHref = $derived(authStore.isAuthenticated ? '/chat' : '/');
</script>

<div class="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
  <div class="mx-auto max-w-4xl px-4 py-10">
    <!-- Header -->
    <div class="mb-8 flex items-start justify-between">
      <div>
        <p class="text-xs uppercase tracking-[0.2em] text-gray-400 dark:text-muted-foreground">Documentation</p>
        <h1 class="text-3xl font-semibold text-gray-900 dark:text-foreground">{i18n.t('guideWelcome')}</h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-muted-foreground">
          {i18n.t('guideIntro')}
        </p>
      </div>
      <a
        href={backHref}
        class="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-100 dark:border-border dark:bg-muted dark:text-muted-foreground dark:hover:bg-muted"
      >
        <X class="h-3.5 w-3.5" />
        {i18n.t('close')}
      </a>
    </div>

    <div class="space-y-6 text-sm text-gray-600 dark:text-muted-foreground">
      <!-- Getting started -->
      <section class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-border dark:bg-card/60 dark:shadow-none">
        <div class="flex items-center gap-3">
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-500/10">
            <Zap class="h-5 w-5 text-teal-500" />
          </div>
          <h2 class="text-base font-semibold text-gray-900 dark:text-foreground">{i18n.t('guideQuickStart')}</h2>
        </div>
        <ol class="mt-4 space-y-3 pl-2">
          <li class="flex gap-3">
            <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700 dark:bg-teal-500/20 dark:text-teal-300">1</span>
            <span>{i18n.t('guideStep1')}</span>
          </li>
          <li class="flex gap-3">
            <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700 dark:bg-teal-500/20 dark:text-teal-300">2</span>
            <span>{i18n.t('guideStep2')}</span>
          </li>
          <li class="flex gap-3">
            <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700 dark:bg-teal-500/20 dark:text-teal-300">3</span>
            <span>{i18n.t('guideStep3')}</span>
          </li>
        </ol>
      </section>

      <!-- Chat -->
      <section class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-border dark:bg-card/60 dark:shadow-none">
        <div class="flex items-center gap-3">
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-500/10">
            <MessageSquare class="h-5 w-5 text-blue-500" />
          </div>
          <h2 class="text-base font-semibold text-gray-900 dark:text-foreground">{i18n.t('guideConversationsTitle')}</h2>
        </div>
        <ul class="mt-4 space-y-2 pl-2">
          <li>• {i18n.t('guideConversations1')}</li>
          <li>• {i18n.t('guideConversations2')}</li>
          <li>• {i18n.t('guideConversations3New')} {i18n.t('guideConversations3')}</li>
          <li>• {i18n.t('guideConversations4')}</li>
        </ul>
      </section>

      <!-- API Keys -->
      <section class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-border dark:bg-card/60 dark:shadow-none">
        <div class="flex items-center gap-3">
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-500/10">
            <Key class="h-5 w-5 text-amber-500" />
          </div>
          <h2 class="text-base font-semibold text-gray-900 dark:text-foreground">{i18n.t('guideApiKeysTitle')}</h2>
        </div>
        <ul class="mt-4 space-y-2 pl-2">
          <li>• {i18n.t('guideApiKeysSupported')} <span class="font-semibold text-gray-800 dark:text-foreground">OpenAI, Gemini, Claude, Mistral, Groq</span>.</li>
          <li>• {i18n.t('guideApiKeysEncrypted')}</li>
          <li>• {i18n.t('guideApiKeysDelete')}</li>
          <li>• {i18n.t('guideApiKeysIndicator')}</li>
        </ul>
      </section>

      <!-- Projects -->
      <section class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-border dark:bg-card/60 dark:shadow-none">
        <div class="flex items-center gap-3">
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-500/10">
            <FolderOpen class="h-5 w-5 text-purple-500" />
          </div>
          <h2 class="text-base font-semibold text-gray-900 dark:text-foreground">{i18n.t('guideProjectsTitle')}</h2>
        </div>
        <ul class="mt-4 space-y-2 pl-2">
          <li>• {i18n.t('guideProjects1')}</li>
          <li>• {i18n.t('guideProjects2')}</li>
          <li>• {i18n.t('guideProjects3')}</li>
          <li>• {i18n.t('guideProjects4')} <span class="font-semibold text-gray-800 dark:text-foreground">{i18n.t('projects')}</span>.</li>
        </ul>
      </section>

      <!-- Settings -->
      <section class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-border dark:bg-card/60 dark:shadow-none">
        <div class="flex items-center gap-3">
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 dark:bg-muted">
            <Settings class="h-5 w-5 text-gray-500 dark:text-muted-foreground" />
          </div>
          <h2 class="text-base font-semibold text-gray-900 dark:text-foreground">{i18n.t('guideSettingsTitle')}</h2>
        </div>
        <ul class="mt-4 space-y-2 pl-2">
          <li>• {i18n.t('guideSettings1')}</li>
          <li>• {i18n.t('guideSettings2')}</li>
        </ul>
      </section>
    </div>
  </div>
</div>
