<script lang="ts">
  import { Download, PanelLeftOpen } from 'lucide-svelte';
  import * as tauri from '$lib/tauri';
  import { appStore } from '$stores/app.svelte';
  import { i18n } from '$lib/i18n';

  let {
    activeModelLabel,
    messagesCount,
    onClear,
  }: {
    activeModelLabel: string;
    messagesCount: number;
    onClear: () => void;
  } = $props();

  let exportOpen = $state(false);
  let dropdownRef = $state<HTMLDivElement | null>(null);

  $effect(() => {
    if (!exportOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef && !dropdownRef.contains(e.target as Node)) {
        exportOpen = false;
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  });

  async function handleExport(format: 'md' | 'json') {
    const threadId = appStore.selectedThreadId;
    if (!threadId) return;
    exportOpen = false;
    try {
      const result = await tauri.exportThread(threadId, format);
      const blob = new Blob([result.content], { type: result.mime_type });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      // silently fail
    }
  }

  let canExport = $derived(!!appStore.selectedThreadId && messagesCount > 0);
  let showOverlay = $derived(appStore.profil || appStore.settingsOpen);
</script>

<header class="z-10 shrink-0 rounded-2xl bg-white dark:bg-card">
  <div class="flex w-full items-center gap-2 px-4 py-3">
    <!-- Sidebar toggle (visible when collapsed) -->
    {#if appStore.sidebarCollapsed}
      <button
        type="button"
        onclick={() => appStore.setSidebarCollapsed(false)}
        aria-label={i18n.t('open')}
        class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground"
      >
        <PanelLeftOpen class="h-4 w-4" />
      </button>
    {/if}

    <div class="flex-1"></div>

    <!-- Chat actions (hidden when overlay is active) -->
    {#if !showOverlay}
      <div class="relative" bind:this={dropdownRef}>
        <button
          type="button"
          onclick={() => (exportOpen = !exportOpen)}
          disabled={!canExport}
          title={i18n.t('exportConversation')}
          class="rounded-full border border-gray-200 bg-white p-1.5 text-gray-500 shadow-sm transition hover:border-gray-300 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-border dark:bg-card dark:text-muted-foreground dark:hover:border-border dark:hover:text-foreground"
        >
          <Download size={16} />
        </button>
        {#if exportOpen}
          <div class="absolute right-0 top-full mt-1 w-52 rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-border dark:bg-card" role="menu">
            <button
              type="button"
              onclick={() => handleExport('md')}
              role="menuitem"
              class="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-foreground dark:hover:bg-muted"
            >
              {i18n.t('exportMarkdown')}
            </button>
            <button
              type="button"
              onclick={() => handleExport('json')}
              role="menuitem"
              class="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-foreground dark:hover:bg-muted"
            >
              {i18n.t('exportJson')}
            </button>
          </div>
        {/if}
      </div>

      <button
        type="button"
        onclick={onClear}
        disabled={messagesCount === 0}
        class="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-500 shadow-sm transition hover:border-gray-300 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-border dark:bg-card dark:text-muted-foreground dark:hover:border-border dark:hover:text-foreground"
      >
        {i18n.t('clearConversation')}
      </button>
    {:else}
      <span class="text-sm font-semibold text-gray-700 dark:text-foreground">
        {appStore.profil ? i18n.t('profile') : i18n.t('settings')}
      </span>
    {/if}

    <div class="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm dark:border-border dark:bg-card dark:text-foreground">
      <span class="h-2 w-2 rounded-full bg-teal-400"></span>
      <span class="max-w-[170px] truncate sm:max-w-[240px]">
        {activeModelLabel}
      </span>
    </div>
  </div>
</header>
