<script lang="ts">
  import { ChevronUp, ChevronDown, X } from 'lucide-svelte';
  import type { ChatMessage } from '$lib/types';

  interface Props {
    messages: ChatMessage[];
    onScrollToIndex: (index: number) => void;
  }

  let { messages, onScrollToIndex }: Props = $props();

  let searchQuery = $state('');
  let rawMatchIndex = $state(0);
  let searchInputRef = $state<HTMLInputElement | null>(null);

  function normalizeContent(content: unknown): string {
    if (typeof content === 'string') return content;
    if (content === null || content === undefined) return '';
    try {
      return JSON.stringify(content);
    } catch {
      return String(content);
    }
  }

  let searchMatches = $derived.by(() => {
    if (!searchQuery.trim()) return [] as number[];
    const query = searchQuery.toLowerCase();
    return messages.reduce<number[]>((indices, message, index) => {
      const text = normalizeContent(message.content).toLowerCase();
      if (text.includes(query)) indices.push(index);
      return indices;
    }, []);
  });

  let searchMatchesCount = $derived(searchMatches.length);

  let activeMatchIndex = $derived(
    !searchQuery.trim() || searchMatchesCount === 0
      ? 0
      : Math.min(rawMatchIndex, searchMatchesCount - 1),
  );

  $effect(() => {
    if (searchMatchesCount > 0) {
      const msgIndex = searchMatches[activeMatchIndex];
      if (msgIndex !== undefined) {
        onScrollToIndex(msgIndex);
      }
    }
  });

  function handleNextMatch() {
    if (!searchMatchesCount) return;
    rawMatchIndex = (rawMatchIndex + 1) % searchMatchesCount;
  }

  function handlePrevMatch() {
    if (!searchMatchesCount) return;
    rawMatchIndex = rawMatchIndex - 1 < 0 ? searchMatchesCount - 1 : rawMatchIndex - 1;
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (!searchQuery.trim()) return;
    if (event.key === 'Enter') {
      if (event.shiftKey) {
        handlePrevMatch();
      } else {
        handleNextMatch();
      }
    }
    if (event.key === 'Escape') {
      searchQuery = '';
    }
  }

  export function focus() {
    searchInputRef?.focus();
    searchInputRef?.select();
  }
</script>

<div
  class="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm dark:border-border dark:bg-card dark:text-foreground"
>
  <input
    bind:this={searchInputRef}
    type="search"
    bind:value={searchQuery}
    placeholder="Rechercher..."
    class="w-40 bg-transparent text-xs text-gray-600 outline-none placeholder:text-gray-400 dark:text-foreground dark:placeholder:text-muted-foreground"
    onkeydown={handleKeyDown}
  />

  {#if searchQuery}
    <button
      type="button"
      onclick={() => { searchQuery = ''; }}
      class="text-gray-400 transition hover:text-gray-600 dark:text-muted-foreground dark:hover:text-foreground"
      title="Effacer"
    >
      <X class="h-3 w-3" />
    </button>
  {/if}

  {#if searchQuery}
    <span
      class="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700 dark:bg-teal-500/10 dark:text-teal-200"
    >
      {searchMatchesCount} trouve{searchMatchesCount > 1 ? 's' : ''}
    </span>
  {/if}

  {#if searchQuery && searchMatchesCount > 0}
    <span class="text-[10px] text-gray-500 dark:text-muted-foreground">
      {activeMatchIndex + 1}/{searchMatchesCount}
    </span>
    <div class="flex items-center gap-1">
      <button
        type="button"
        onclick={handlePrevMatch}
        class="rounded-full border border-gray-200 bg-white p-0.5 text-gray-500 transition hover:border-gray-300 hover:text-gray-700 dark:border-border dark:bg-card dark:text-muted-foreground dark:hover:text-foreground"
        title="Precedent"
      >
        <ChevronUp class="h-3 w-3" />
      </button>
      <button
        type="button"
        onclick={handleNextMatch}
        class="rounded-full border border-gray-200 bg-white p-0.5 text-gray-500 transition hover:border-gray-300 hover:text-gray-700 dark:border-border dark:bg-card dark:text-muted-foreground dark:hover:text-foreground"
        title="Suivant"
      >
        <ChevronDown class="h-3 w-3" />
      </button>
    </div>
  {/if}
</div>
