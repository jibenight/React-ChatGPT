<script lang="ts">
  import { Send, Square } from 'lucide-svelte';

  interface SendPayload {
    content: string;
    attachments: any[];
  }

  interface Props {
    onSend: (message: SendPayload) => void;
    onCancel: () => void;
    loading: boolean;
    disabled: boolean;
    draftKey?: string;
    initialDraft?: string;
  }

  let {
    onSend,
    onCancel,
    loading,
    disabled,
    draftKey = '',
    initialDraft = '',
  }: Props = $props();

  function loadInitialDraft() {
    if (initialDraft) return initialDraft;
    if (draftKey) {
      try {
        return localStorage.getItem(draftKey) ?? '';
      } catch {
        return '';
      }
    }
    return '';
  }

  let text = $state(loadInitialDraft());
  let textareaRef = $state<HTMLTextAreaElement | null>(null);

  function autoResize() {
    if (!textareaRef) return;
    textareaRef.style.height = 'auto';
    textareaRef.style.height = `${Math.min(textareaRef.scrollHeight, 200)}px`;
  }

  $effect(() => {
    // persist draft whenever text changes
    if (draftKey) {
      try {
        if (text) {
          localStorage.setItem(draftKey, text);
        } else {
          localStorage.removeItem(draftKey);
        }
      } catch {}
    }
  });

  function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed || disabled || loading) return;
    onSend({ content: trimmed, attachments: [] });
    text = '';
    if (draftKey) {
      try {
        localStorage.removeItem(draftKey);
      } catch {}
    }
    if (textareaRef) {
      textareaRef.style.height = 'auto';
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  }
</script>

<div
  class="border-t border-gray-200 bg-white px-4 py-3 dark:border-white/[0.06] dark:bg-background"
>
  <div class="mx-auto max-w-4xl">
    <div
      class="relative flex items-end gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-white/[0.08] dark:bg-card"
    >
      <textarea
        bind:value={text}
        bind:this={textareaRef}
        placeholder="Envoyer un message..."
        aria-label="Message à envoyer"
        rows="1"
        class="flex-1 resize-none bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-foreground dark:placeholder:text-muted-foreground"
        onkeydown={handleKeyDown}
        oninput={autoResize}
        {disabled}
      ></textarea>

      {#if loading}
        <button
          type="button"
          onclick={onCancel}
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-900 text-white transition hover:bg-gray-700 dark:bg-foreground dark:text-background dark:hover:bg-foreground/80"
          title="Annuler"
        >
          <Square class="h-3.5 w-3.5" />
        </button>
      {:else}
        <button
          type="button"
          onclick={handleSubmit}
          disabled={disabled || !text.trim()}
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-500 text-white transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-40"
          title="Envoyer"
        >
          <Send class="h-3.5 w-3.5" />
        </button>
      {/if}
    </div>

    <p
      class="mt-1.5 text-center text-[11px] text-gray-400 dark:text-muted-foreground"
    >
      Entrée pour envoyer · Maj+Entrée pour nouvelle ligne
    </p>
  </div>
</div>
