<script lang="ts">
  import { tick } from 'svelte';
  import MessageListSkeleton from '$lib/components/ui/MessageListSkeleton.svelte';
  import ChatMessage from './ChatMessage.svelte';
  import type { ChatMessage as ChatMessageType } from '$lib/types';
  import { i18n } from '$lib/i18n';

  interface Props {
    messages: ChatMessageType[];
    loadingHistory: boolean;
    hasMoreHistory: boolean;
    loadingMoreHistory: boolean;
    onLoadMore: () => void;
    onSuggestion?: (text: string) => void;
  }

  let {
    messages,
    loadingHistory,
    hasMoreHistory,
    loadingMoreHistory,
    onLoadMore,
    onSuggestion,
  }: Props = $props();

  let scrollContainer = $state<HTMLDivElement | null>(null);

  $effect(() => {
    if (messages.length > 0 && scrollContainer) {
      tick().then(() => {
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
      });
    }
  });

  const suggestions = $derived([
    { title: i18n.t('suggestSummarize'), subtitle: i18n.t('suggestSummarizeSubtitle') },
    { title: i18n.t('suggestCode'), subtitle: i18n.t('suggestCodeSubtitle') },
    { title: i18n.t('suggestExplain'), subtitle: i18n.t('suggestExplainSubtitle') },
    { title: i18n.t('suggestTranslate'), subtitle: i18n.t('suggestTranslateSubtitle') },
  ]);
</script>

<div bind:this={scrollContainer} class="flex flex-1 flex-col overflow-y-auto">
  <div class="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-6">
    {#if hasMoreHistory}
      <div class="mb-4 flex justify-center">
        <button
          type="button"
          onclick={onLoadMore}
          disabled={loadingMoreHistory}
          class="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-border dark:bg-card dark:text-muted-foreground dark:hover:bg-muted"
        >
          {loadingMoreHistory ? i18n.t('loading') : i18n.t('loadPreviousMessages')}
        </button>
      </div>
    {/if}

    {#if loadingHistory}
      <MessageListSkeleton />
    {:else if messages.length === 0}
      <!-- Empty state: assistant-ui style -->
      <div class="flex h-full flex-col">
        <div class="pt-8 pb-4">
          <h1 class="text-3xl font-bold text-gray-900 dark:text-foreground">{i18n.t('greeting')}</h1>
          <p class="mt-1 text-lg text-gray-400 dark:text-muted-foreground">{i18n.t('howCanIHelp')}</p>
        </div>

        <div class="flex-1"></div>

        <!-- Suggestion cards -->
        <div class="grid grid-cols-2 gap-3 pb-4">
          {#each suggestions as s}
            <button
              type="button"
              onclick={() => onSuggestion?.(s.title + ' ' + s.subtitle)}
              class="group rounded-2xl border border-gray-200 px-5 py-4 text-left transition hover:border-gray-300 hover:bg-gray-50 dark:border-border dark:hover:border-border dark:hover:bg-card"
            >
              <p class="text-sm font-semibold text-gray-900 dark:text-foreground">{s.title}</p>
              <p class="mt-0.5 text-sm text-gray-400 dark:text-muted-foreground">{s.subtitle}</p>
            </button>
          {/each}
        </div>
      </div>
    {:else}
      {#each messages as message (message.id)}
        <ChatMessage {message} />
      {/each}
    {/if}
  </div>
</div>
