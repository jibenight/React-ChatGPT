<script lang="ts">
  import { tick } from 'svelte';
  import MessageListSkeleton from '$lib/components/ui/MessageListSkeleton.svelte';
  import ChatMessage from './ChatMessage.svelte';
  import type { ChatMessage as ChatMessageType } from '$lib/types';

  interface Props {
    messages: ChatMessageType[];
    loadingHistory: boolean;
    hasMoreHistory: boolean;
    loadingMoreHistory: boolean;
    onLoadMore: () => void;
  }

  let {
    messages,
    loadingHistory,
    hasMoreHistory,
    loadingMoreHistory,
    onLoadMore,
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
</script>

<div bind:this={scrollContainer} class="flex-1 overflow-y-auto">
  <div class="mx-auto max-w-4xl px-4 py-6">
    {#if hasMoreHistory}
      <div class="mb-4 flex justify-center">
        <button
          type="button"
          onclick={onLoadMore}
          disabled={loadingMoreHistory}
          class="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-border dark:bg-card dark:text-muted-foreground dark:hover:bg-muted"
        >
          {loadingMoreHistory ? 'Chargement...' : 'Charger les messages précédents'}
        </button>
      </div>
    {/if}

    {#if loadingHistory}
      <MessageListSkeleton />
    {:else if messages.length === 0}
      <div class="flex flex-col items-center justify-center py-24 text-center">
        <div
          class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-500/10"
        >
          <svg
            class="h-8 w-8 text-teal-500"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
            />
          </svg>
        </div>
        <h3
          class="mb-1 text-base font-semibold text-gray-900 dark:text-foreground"
        >
          Démarrez une conversation
        </h3>
        <p class="text-sm text-gray-500 dark:text-muted-foreground">
          Posez une question ou demandez de l'aide pour commencer.
        </p>
      </div>
    {:else}
      {#each messages as message (message.id)}
        <ChatMessage {message} />
      {/each}
    {/if}
  </div>
</div>
