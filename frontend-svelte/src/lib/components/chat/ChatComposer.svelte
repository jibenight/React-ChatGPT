<script lang="ts">
  import { ArrowUp, Square } from 'lucide-svelte';

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

  export function setDraft(value: string) {
    text = value;
    if (textareaRef) {
      requestAnimationFrame(() => {
        autoResize();
        textareaRef?.focus();
      });
    }
  }

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

<div class="px-6 pb-4">
  <div class="mx-auto max-w-3xl">
    <div
      class="flex items-center gap-3 rounded-3xl border border-gray-200 bg-white px-5 py-3 shadow-sm transition-shadow focus-within:shadow-md dark:border-border dark:bg-card"
    >
      <textarea
        bind:value={text}
        bind:this={textareaRef}
        placeholder="Envoyer un message..."
        aria-label="Message à envoyer"
        rows="1"
        class="flex-1 resize-none bg-transparent text-sm leading-[1.375rem] text-gray-900 outline-none placeholder:text-gray-400 dark:text-foreground dark:placeholder:text-muted-foreground"
        onkeydown={handleKeyDown}
        oninput={autoResize}
        {disabled}
      ></textarea>

      {#if loading}
        <button
          type="button"
          onclick={onCancel}
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-900 text-white transition hover:bg-gray-700 dark:bg-foreground dark:text-background dark:hover:bg-foreground/80"
          title="Annuler"
          aria-label="Annuler la génération"
        >
          <Square class="h-3.5 w-3.5" />
        </button>
      {:else}
        <button
          type="button"
          onclick={handleSubmit}
          disabled={disabled || !text.trim()}
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-800 text-white transition hover:bg-gray-700 disabled:bg-gray-300 disabled:text-gray-500 dark:bg-foreground dark:text-background dark:hover:bg-foreground/80 dark:disabled:bg-muted dark:disabled:text-muted-foreground"
          title="Envoyer"
          aria-label="Envoyer le message"
        >
          <ArrowUp class="h-4 w-4" />
        </button>
      {/if}
    </div>
  </div>
</div>
