<script lang="ts">
  import { v4 as uuidv4 } from 'uuid';
  import * as tauri from '$lib/tauri';
  import { streamChat, resolveChatError } from '$lib/stream-chat';
  import { appStore } from '$lib/stores/app.svelte';
  import { userStore } from '$lib/stores/user.svelte';
  import { i18n } from '$lib/i18n';
  import ChatMessageList from './ChatMessageList.svelte';
  import ChatComposer from './ChatComposer.svelte';
  import type { ChatMessage, ChatRole, FailedRequest } from '$lib/types';

  interface Props {
    sessionId: string;
  }

  let { sessionId }: Props = $props();

  const HISTORY_PAGE_SIZE = 50;

  let messages = $state<ChatMessage[]>([]);
  let historyCursor = $state<number | null>(null);
  let hasMoreHistory = $state(false);
  let loadingMoreHistory = $state(false);
  let loading = $state(false);
  let error = $state('');
  let loadingHistory = $state(false);
  let lastFailedRequest = $state<FailedRequest | null>(null);

  let abortController: AbortController | null = null;
  let composerRef: ChatComposer | null = $state(null);

  // Emit message count to parent layout
  $effect(() => {
    window.dispatchEvent(new CustomEvent('messages-count', { detail: messages.length }));
  });

  // Listen for clear-chat event from layout
  $effect(() => {
    const handler = () => { messages = []; error = ''; };
    window.addEventListener('clear-chat', handler);
    return () => window.removeEventListener('clear-chat', handler);
  });

  function normalizeContent(content: unknown): string {
    if (typeof content === 'string') return content;
    if (content === null || content === undefined) return '';
    try {
      return JSON.stringify(content);
    } catch {
      return String(content);
    }
  }

  function normalizeRole(role: string): ChatRole {
    if (role === 'user' || role === 'assistant' || role === 'system') return role;
    return 'assistant';
  }

  function mapStoredAttachments(attachments: any[]) {
    return (attachments || []).map((att: any) => ({
      id: att.id || uuidv4(),
      type: att.type || 'image',
      name: att.name || 'Attachment',
      contentType: att.mimeType || 'application/octet-stream',
      status: { type: 'complete' },
      content: [],
    }));
  }

  function resolveHistoryCursor(items: any[]): number | null {
    const rawId = items?.[0]?.id;
    const numeric = Number(rawId);
    return Number.isFinite(numeric) ? numeric : null;
  }

  function mergeHistory(prev: ChatMessage[], next: ChatMessage[]): ChatMessage[] {
    const existing = new Set(prev.map((item) => item.id));
    const filtered = next.filter((item) => !existing.has(item.id));
    return [...filtered, ...prev];
  }

  function mapMessageItem(item: any): ChatMessage {
    return {
      id: item.id ? String(item.id) : uuidv4(),
      role: normalizeRole(item.role),
      content: normalizeContent(item.content),
      attachments: mapStoredAttachments(item.attachments),
      createdAt: item.created_at ? new Date(item.created_at) : new Date(),
    };
  }

  // Load history when threadId changes
  $effect(() => {
    const threadId = appStore.selectedThreadId;
    if (!threadId) {
      messages = [];
      historyCursor = null;
      hasMoreHistory = false;
      return;
    }

    loadingHistory = true;
    historyCursor = null;
    hasMoreHistory = false;

    tauri
      .getThreadMessages(threadId, HISTORY_PAGE_SIZE)
      .then((data) => {
        const history = (data || []).map(mapMessageItem);
        messages = history;
        historyCursor = resolveHistoryCursor(data || []);
        hasMoreHistory = (data || []).length === HISTORY_PAGE_SIZE;
        error = '';
      })
      .catch((err: any) => {
        error =
          err?.message || i18n.t('loadConversationError');
        hasMoreHistory = false;
      })
      .finally(() => {
        loadingHistory = false;
      });
  });

  // Cleanup abort on unmount
  $effect(() => {
    return () => {
      abortController?.abort();
    };
  });

  async function loadMoreHistory() {
    const threadId = appStore.selectedThreadId;
    if (!threadId || !historyCursor || loadingMoreHistory) return;
    loadingMoreHistory = true;
    try {
      const data = await tauri.getThreadMessages(threadId, HISTORY_PAGE_SIZE, historyCursor);
      const nextHistory = (data || []).map(mapMessageItem);
      if (nextHistory.length === 0) {
        hasMoreHistory = false;
        return;
      }
      messages = mergeHistory(messages, nextHistory);
      historyCursor = resolveHistoryCursor(data || []);
      hasMoreHistory = (data || []).length === HISTORY_PAGE_SIZE;
    } catch (err: any) {
      error = err?.message || i18n.t('loadPreviousMessagesError');
    } finally {
      loadingMoreHistory = false;
    }
  }

  async function handleSend(payload: { content: string; attachments: any[] }) {
    const text = payload.content;
    if (!text.trim()) return;

    const userData = userStore.userData;
    if (!userData?.id && !userData?.userId) {
      error = i18n.t('userNotConnected');
      return;
    }

    const selectedOption = appStore.selectedOption;
    const provider = selectedOption?.provider || 'openai';
    const model = selectedOption?.model;
    const threadId = appStore.selectedThreadId;
    const projectId = appStore.selectedProjectId;
    const activeThreadId = threadId || sessionId;

    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: text,
      attachments: payload.attachments,
      createdAt: new Date(),
    };
    messages = [...messages, userMessage];

    const assistantId = uuidv4();
    messages = [
      ...messages,
      {
        id: assistantId,
        role: 'assistant' as ChatRole,
        content: '',
        createdAt: new Date(),
      },
    ];

    loading = true;
    error = '';
    lastFailedRequest = null;

    const requestPayload = {
      sessionId,
      threadId: activeThreadId,
      projectId,
      message: text,
      provider,
      model,
      attachments: [],
    };

    try {
      const controller = new AbortController();
      abortController = controller;

      const response = await streamChat(
        requestPayload,
        (delta: string) => {
          messages = messages.map((item) =>
            item.id === assistantId
              ? { ...item, content: `${item.content || ''}${delta}` }
              : item,
          );
        },
        controller.signal,
      );

      if (response.reply) {
        messages = messages.map((item) =>
          item.id === assistantId ? { ...item, content: response.reply } : item,
        );
      }
      if (response.threadId && response.threadId !== threadId) {
        appStore.setSelectedThreadId(response.threadId);
      }
    } catch (err: any) {
      messages = messages.filter((item) => item.id !== assistantId);
      error = resolveChatError(err);
      lastFailedRequest = {
        payload: requestPayload,
        threadId: activeThreadId,
      };
    } finally {
      loading = false;
      abortController = null;
    }
  }

  async function handleRetryLast() {
    if (!lastFailedRequest) return;
    const threadId = appStore.selectedThreadId;
    const activeThreadId = threadId || sessionId;
    if (lastFailedRequest.threadId !== activeThreadId) {
      error = i18n.t('conversationChanged');
      return;
    }
    const userData = userStore.userData;
    if (!userData?.id && !userData?.userId) {
      error = i18n.t('userNotConnected');
      return;
    }

    loading = true;
    error = '';

    const assistantId = uuidv4();
    messages = [
      ...messages,
      {
        id: assistantId,
        role: 'assistant' as ChatRole,
        content: '',
        createdAt: new Date(),
      },
    ];

    try {
      const controller = new AbortController();
      abortController = controller;

      const response = await streamChat(
        lastFailedRequest.payload,
        (delta: string) => {
          messages = messages.map((item) =>
            item.id === assistantId
              ? { ...item, content: `${item.content || ''}${delta}` }
              : item,
          );
        },
        controller.signal,
      );

      if (response.reply) {
        messages = messages.map((item) =>
          item.id === assistantId ? { ...item, content: response.reply } : item,
        );
      }
      if (response.threadId && response.threadId !== threadId) {
        appStore.setSelectedThreadId(response.threadId);
      }
      lastFailedRequest = null;
    } catch (err: any) {
      messages = messages.filter((item) => item.id !== assistantId);
      error = resolveChatError(err);
    } finally {
      loading = false;
      abortController = null;
    }
  }

  function handleCancel() {
    abortController?.abort();
  }

  function handleClear() {
    messages = [];
    error = '';
  }

  let userData = $derived(userStore.userData as any);
</script>

<div
  class="relative flex h-full flex-1 flex-col overflow-hidden"
>
  {#if error}
    <div class="mx-auto w-full max-w-4xl px-4 pt-3">
      <div
        class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
      >
        <span>{error}</span>
        {#if lastFailedRequest}
          <button
            type="button"
            onclick={handleRetryLast}
            disabled={loading}
            class="rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-900/50"
          >
            {loading ? i18n.t('retrying') : i18n.t('retry')}
          </button>
        {/if}
      </div>
    </div>
  {/if}

  <ChatMessageList
    {messages}
    {loadingHistory}
    {hasMoreHistory}
    {loadingMoreHistory}
    onLoadMore={loadMoreHistory}
    onSuggestion={(text) => composerRef?.setDraft(text)}
  />

  <ChatComposer
    bind:this={composerRef}
    onSend={handleSend}
    onCancel={handleCancel}
    {loading}
    disabled={false}
  />
</div>
