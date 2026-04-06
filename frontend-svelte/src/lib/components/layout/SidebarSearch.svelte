<script lang="ts">
  import { Search, X, MessageSquare } from 'lucide-svelte';
  import DOMPurify from 'dompurify';
  import * as tauri from '$lib/tauri';
  import { appStore } from '$stores/app.svelte';
  import { i18n } from '$lib/i18n';

  interface SearchResult {
    id: number;
    thread_id: string;
    thread_title: string | null;
    role: string;
    content: string;
    provider: string | null;
    created_at: string | null;
    snippet: string;
  }

  let query = $state('');
  let results = $state<SearchResult[]>([]);
  let total = $state(0);
  let loading = $state(false);
  let open = $state(false);
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let containerRef: HTMLDivElement;

  async function performSearch(searchQuery: string) {
    if (searchQuery.length < 2) {
      results = [];
      total = 0;
      loading = false;
      return;
    }
    loading = true;
    try {
      const data = await tauri.searchMessages(searchQuery, 20);
      results = data.results || [];
      total = data.total || 0;
    } catch {
      results = [];
      total = 0;
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    if (query.trim().length < 2) {
      results = [];
      total = 0;
      return;
    }
    loading = true;
    debounceTimer = setTimeout(() => {
      performSearch(query.trim());
    }, 300);
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  });

  $effect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef && !containerRef.contains(event.target as Node)) {
        open = false;
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  });

  function handleSelectResult(result: SearchResult) {
    appStore.setSelectedThreadId(result.thread_id);
    open = false;
    query = '';
    results = [];
  }

  function handleClear() {
    query = '';
    results = [];
    total = 0;
    open = false;
  }
</script>

<div bind:this={containerRef} class="relative px-4 pt-3">
  <div class="relative">
    <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-muted-foreground" />
    <input
      type="text"
      bind:value={query}
      oninput={() => { open = true; }}
      onfocus={() => { if (query.trim().length >= 2) open = true; }}
      placeholder={i18n.t('searchInMessages')}
      class="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-9 text-xs text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/30 dark:border-border dark:bg-card dark:text-foreground dark:placeholder:text-muted-foreground dark:focus:border-teal-500"
    />
    {#if query}
      <button
        type="button"
        onclick={handleClear}
        class="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 transition hover:text-gray-600 dark:text-muted-foreground dark:hover:text-foreground"
      >
        <X class="h-3.5 w-3.5" />
      </button>
    {/if}
  </div>

  {#if open && query.trim().length >= 2}
    <div class="absolute left-4 right-4 z-50 mt-1 max-h-80 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-border dark:bg-card">
      {#if loading}
        <p class="px-4 py-3 text-xs text-gray-500 dark:text-muted-foreground">
          {i18n.t('searching')}
        </p>
      {:else if results.length === 0}
        <p class="px-4 py-3 text-xs text-gray-500 dark:text-muted-foreground">
          {i18n.t('noResults')}
        </p>
      {:else}
        <p class="border-b border-gray-100 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-gray-400 dark:border-border dark:text-muted-foreground">
          {i18n.t('searchResultCount', { count: String(total) })}
        </p>
        {#each results as result (result.id)}
          <button
            type="button"
            onclick={() => handleSelectResult(result)}
            class="flex w-full items-start gap-2.5 border-b border-gray-50 px-4 py-3 text-left transition last:border-b-0 hover:bg-gray-50 dark:border-border/50 dark:hover:bg-muted/50"
          >
            <MessageSquare class="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-500 dark:text-teal-400" />
            <div class="min-w-0 flex-1">
              <p class="truncate text-xs font-semibold text-gray-900 dark:text-foreground">
                {result.thread_title || i18n.t('untitledConversation')}
              </p>
              <p
                class="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-gray-600 dark:text-muted-foreground"
              >
                {@html DOMPurify.sanitize(result.snippet || result.content, { ALLOWED_TAGS: ['mark'], ALLOWED_ATTR: [] })}
              </p>
              <div class="mt-1 flex items-center gap-2 text-[10px] text-gray-400 dark:text-muted-foreground">
                <span class="capitalize">{result.role}</span>
                {#if result.provider}
                  <span>&middot;</span>
                  <span>{result.provider}</span>
                {/if}
              </div>
            </div>
          </button>
        {/each}
      {/if}
    </div>
  {/if}
</div>
