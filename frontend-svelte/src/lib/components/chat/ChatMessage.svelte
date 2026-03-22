<script lang="ts">
  import { Bot } from 'lucide-svelte';
  import { cn } from '$lib/utils';
  import MarkdownRenderer from './MarkdownRenderer.svelte';
  import type { ChatMessage } from '$lib/types';

  let { message }: { message: ChatMessage } = $props();
</script>

<div
  class={cn(
    'flex gap-3 py-3',
    message.role === 'user' ? 'justify-end' : '',
  )}
>
  {#if message.role === 'assistant'}
    <div
      class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-500/15"
    >
      <Bot class="h-4 w-4 text-teal-500" />
    </div>
  {/if}

  <div
    class={cn(
      'max-w-[80%] rounded-2xl px-4 py-3 text-sm',
      message.role === 'user'
        ? 'bg-teal-500 text-white'
        : 'bg-gray-100 text-gray-900 dark:bg-card dark:text-foreground',
    )}
  >
    {#if message.role === 'assistant'}
      <MarkdownRenderer content={message.content} />
    {:else}
      <p class="whitespace-pre-wrap">{message.content}</p>
    {/if}
  </div>
</div>
