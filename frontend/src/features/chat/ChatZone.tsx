import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import apiClient from '../../apiClient';
import { useExternalStoreRuntime } from '@assistant-ui/react';
import { v4 as uuidv4 } from 'uuid';
import { useUser } from '../../UserContext';
import { useAppStore } from '../../stores/appStore';
import { streamChat, resolveChatError } from '@/hooks/useStreamChat';
import { useDraft } from '@/hooks/useDraft';
import { useChatSearch, MobileSearchPanel } from './ChatSearchBar';
import ChatHeader from './ChatHeader';
import ChatMessageList from './ChatMessageList';
import type { ChatMessage, ChatRole, FailedRequest } from './chatTypes';

const normalizeContent = (content: unknown): string => {
  if (typeof content === 'string') return content;
  if (content === null || content === undefined) return '';
  try {
    return JSON.stringify(content);
  } catch {
    return String(content);
  }
};

const normalizeRole = (role: string): ChatRole => {
  if (role === 'user' || role === 'assistant' || role === 'system') return role;
  return 'assistant';
};

const mapStoredAttachments = (attachments: any[]) =>
  (attachments || []).map(att => ({
    id: att.id || uuidv4(),
    type: att.type || 'image',
    name: att.name || 'Attachment',
    contentType: att.mimeType || 'application/octet-stream',
    status: { type: 'complete' },
    content: [],
  }));

const fileToDataUrl = (file: File): Promise<string | ArrayBuffer | null> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const getAttachmentType = (file: File): 'image' | 'document' | 'file' => {
  if (file.type?.startsWith('image/')) return 'image';
  if (file.type?.includes('pdf') || file.type?.startsWith('text/')) {
    return 'document';
  }
  return 'file';
};

const extractText = (message: any): string => {
  if (!message?.content) return '';
  if (typeof message.content === 'string') return message.content;
  if (!Array.isArray(message.content)) return '';
  return message.content
    .filter((part: any) => part?.type === 'text' && typeof part.text === 'string')
    .map((part: any) => part.text)
    .join('\n');
};

const HISTORY_PAGE_SIZE = 50;

const resolveHistoryCursor = (items: any[]): number | null => {
  const rawId = items?.[0]?.id;
  const numeric = Number(rawId);
  return Number.isFinite(numeric) ? numeric : null;
};

const mergeHistory = (prev: ChatMessage[], next: ChatMessage[]): ChatMessage[] => {
  const existing = new Set(prev.map(item => item.id));
  const filtered = next.filter(item => !existing.has(item.id));
  return [...filtered, ...prev];
};

function ChatZone({ sessionId }: { sessionId: string }) {
  const selectedOption = useAppStore(s => s.selectedOption);
  const threadId = useAppStore(s => s.selectedThreadId);
  const projectId = useAppStore(s => s.selectedProjectId);
  const onThreadChange = useAppStore(s => s.setSelectedThreadId);

  const { userData } = useUser();
  const activeUserId = userData?.id || userData?.userId;

  const { draftKey, initialDraft, clearDraft } = useDraft({
    userId: activeUserId,
    threadId,
    sessionId,
    projectId,
  });

  const abortRef = useRef<AbortController | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [historyCursor, setHistoryCursor] = useState<number | null>(null);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [loadingMoreHistory, setLoadingMoreHistory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [lastFailedRequest, setLastFailedRequest] =
    useState<FailedRequest | null>(null);

  const search = useChatSearch(messages);

  const activeModelLabel =
    selectedOption?.name ||
    `${selectedOption?.provider || 'OpenAI'} \u2013 ${
      selectedOption?.model || 'gpt-4o'
    }`;

  // --- History loading ---
  useEffect(() => {
    if (!threadId) {
      setMessages([]);
      setHistoryCursor(null);
      setHasMoreHistory(false);
      return;
    }
    setLoadingHistory(true);
    setHistoryCursor(null);
    setHasMoreHistory(false);
    apiClient
      .get(`/api/threads/${threadId}/messages`, {
        params: { limit: HISTORY_PAGE_SIZE },
      })
      .then(response => {
        const history = (response.data || []).map((item: any) => ({
          id: item.id ? String(item.id) : uuidv4(),
          role: normalizeRole(item.role),
          content: normalizeContent(item.content),
          attachments: mapStoredAttachments(item.attachments),
          createdAt: item.created_at ? new Date(item.created_at) : new Date(),
        }));
        setMessages(history);
        setHistoryCursor(resolveHistoryCursor(response.data || []));
        setHasMoreHistory((response.data || []).length === HISTORY_PAGE_SIZE);
        setError('');
      })
      .catch((err: any) => {
        setError(
          err.response?.data?.error ||
            'Erreur lors du chargement de la conversation',
        );
        setHasMoreHistory(false);
      })
      .finally(() => setLoadingHistory(false));
  }, [threadId]);

  const loadMoreHistory = async () => {
    if (!threadId || !historyCursor || loadingMoreHistory) return;
    setLoadingMoreHistory(true);
    try {
      const response = await apiClient.get(
        `/api/threads/${threadId}/messages`,
        {
          params: { limit: HISTORY_PAGE_SIZE, beforeId: historyCursor },
        },
      );
      const nextHistory = (response.data || []).map((item: any) => ({
        id: item.id ? String(item.id) : uuidv4(),
        role: normalizeRole(item.role),
        content: normalizeContent(item.content),
        attachments: mapStoredAttachments(item.attachments),
        createdAt: item.created_at ? new Date(item.created_at) : new Date(),
      }));
      if (nextHistory.length === 0) {
        setHasMoreHistory(false);
        return;
      }
      setMessages(prev => mergeHistory(prev, nextHistory));
      setHistoryCursor(resolveHistoryCursor(response.data || []));
      setHasMoreHistory((response.data || []).length === HISTORY_PAGE_SIZE);
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          'Erreur lors du chargement des messages pr\u00e9c\u00e9dents',
      );
    } finally {
      setLoadingMoreHistory(false);
    }
  };

  // --- Send message ---
  const handleSend = useCallback(async (appendMessage: any) => {
    const text = extractText(appendMessage);
    const attachments = appendMessage?.attachments ?? [];
    if (!text.trim() && attachments.length === 0) return;
    if (!userData?.id && !userData?.userId) {
      setError('Utilisateur non connect\u00e9');
      return;
    }

    const provider = selectedOption?.provider || 'openai';
    const model = selectedOption?.model;
    const activeThreadId = threadId || sessionId;

    clearDraft();

    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: text,
      attachments,
      createdAt: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    const assistantId = uuidv4();
    setMessages(prev => [
      ...prev,
      {
        id: assistantId,
        role: 'assistant',
        content: '',
        createdAt: new Date(),
      },
    ]);
    setLoading(true);
    setError('');
    setLastFailedRequest(null);

    const attachmentPayload: Array<{ id: string; name: string; mimeType: string; dataUrl: string }> = [];
    try {
      for (const attachment of attachments) {
        if (attachment.type !== 'image') continue;
        let dataUrl: string | null = null;
        if (Array.isArray(attachment.content)) {
          const imagePart = attachment.content.find(
            (part: any) => part?.type === 'image' && typeof part.image === 'string',
          );
          dataUrl = imagePart?.image || null;
        }
        if (!dataUrl && attachment.file) {
          const result = await fileToDataUrl(attachment.file);
          dataUrl = typeof result === 'string' ? result : null;
        }
        if (!dataUrl) continue;
        attachmentPayload.push({
          id: attachment.id,
          name: attachment.name,
          mimeType: attachment.contentType,
          dataUrl,
        });
      }

      const controller = new AbortController();
      abortRef.current = controller;
      const requestPayload = {
        sessionId,
        threadId: activeThreadId,
        projectId,
        message: text,
        provider,
        model,
        attachments: attachmentPayload,
      };
      const response = await streamChat(
        requestPayload,
        delta => {
          setMessages(prev =>
            prev.map(item =>
              item.id === assistantId
                ? { ...item, content: `${item.content || ''}${delta}` }
                : item,
            ),
          );
        },
        controller.signal,
      );
      if (response.reply) {
        setMessages(prev =>
          prev.map(item =>
            item.id === assistantId
              ? { ...item, content: response.reply }
              : item,
          ),
        );
      }
      if (response.threadId && response.threadId !== threadId) {
        onThreadChange?.(response.threadId);
      }
    } catch (err) {
      setMessages(prev => prev.filter(item => item.id !== assistantId));
      setError(resolveChatError(err));
      setLastFailedRequest({
        payload: {
          sessionId,
          threadId: activeThreadId,
          projectId,
          message: text,
          provider,
          model,
          attachments: attachmentPayload,
        },
        threadId: activeThreadId,
      });
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [clearDraft, projectId, onThreadChange, selectedOption, sessionId, threadId, userData]);

  // --- Retry last failed ---
  const handleRetryLast = useCallback(async () => {
    if (!lastFailedRequest) return;
    if (lastFailedRequest.threadId !== (threadId || sessionId)) {
      setError('La conversation a chang\u00e9. Relancez le message.');
      return;
    }
    if (!userData?.id && !userData?.userId) {
      setError('Utilisateur non connect\u00e9');
      return;
    }
    setLoading(true);
    setError('');
    const assistantId = uuidv4();
    try {
      const controller = new AbortController();
      abortRef.current = controller;
      setMessages(prev => [
        ...prev,
        {
          id: assistantId,
          role: 'assistant' as ChatRole,
          content: '',
          createdAt: new Date(),
        },
      ]);
      const response = await streamChat(
        lastFailedRequest.payload,
        delta => {
          setMessages(prev =>
            prev.map(item =>
              item.id === assistantId
                ? { ...item, content: `${item.content || ''}${delta}` }
                : item,
            ),
          );
        },
        controller.signal,
      );
      if (response.reply) {
        setMessages(prev =>
          prev.map(item =>
            item.id === assistantId
              ? { ...item, content: response.reply }
              : item,
          ),
        );
      }
      if (response.threadId && response.threadId !== threadId) {
        onThreadChange?.(response.threadId);
      }
      setLastFailedRequest(null);
    } catch (err) {
      setMessages(prev => prev.filter(item => item.id !== assistantId));
      setError(resolveChatError(err));
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [lastFailedRequest, onThreadChange, sessionId, threadId, userData]);

  // --- Attachment adapter ---
  const attachmentAdapter = useMemo(() => ({
    accept: 'image/*',
    async add({ file }: { file: File }) {
      return {
        id: uuidv4(),
        type: getAttachmentType(file),
        name: file.name,
        contentType: file.type || 'application/octet-stream',
        file,
        status: { type: 'requires-action', reason: 'composer-send' },
      };
    },
    async remove() {},
    async send(attachment: any) {
      let content: any[] = [];
      if (attachment.type === 'image') {
        const dataUrl = await fileToDataUrl(attachment.file);
        if (typeof dataUrl === 'string') {
          content = [{ type: 'image', image: dataUrl, filename: attachment.name }];
        }
      }
      return {
        ...attachment,
        status: { type: 'complete' },
        content,
      };
    },
  }), []) as any;

  const handleClear = () => {
    setMessages([]);
    setError('');
  };

  const setMessagesAdapter = (next: readonly ChatMessage[]) => {
    setMessages([...next]);
  };

  // --- Runtime ---
  const runtime = useExternalStoreRuntime(
    useMemo(() => ({
      messages,
      isRunning: loading,
      isLoading: loadingHistory,
      isDisabled: !userData?.id && !userData?.userId,
      convertMessage: (message: ChatMessage) => ({
        id: message.id,
        createdAt: message.createdAt,
        role: message.role,
        content: normalizeContent(message.content),
        attachments: message.attachments ?? [],
      }),
      setMessages: setMessagesAdapter,
      onNew: handleSend,
      onCancel: async () => {
        abortRef.current?.abort();
      },
      adapters: {
        attachments: attachmentAdapter,
      },
    }) as any, [attachmentAdapter, handleSend, loading, loadingHistory, messages, userData]),
  );

  return (
    <div className='relative flex h-screen flex-1 flex-col overflow-hidden bg-gradient-to-b from-gray-100 via-white to-gray-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900'>
      <ChatHeader
        activeModelLabel={activeModelLabel}
        messagesCount={messages.length}
        threadId={threadId}
        onClear={handleClear}
        showMobileSearch={search.showMobileSearch}
        setShowMobileSearch={search.setShowMobileSearch}
        searchInputRef={search.searchInputRef}
        searchQuery={search.searchQuery}
        setSearchQuery={search.setSearchQuery}
        searchMatchesCount={search.searchMatchesCount}
        activeMatchIndex={search.activeMatchIndex}
        handlePrevMatch={search.handlePrevMatch}
        handleNextMatch={search.handleNextMatch}
      />

      {error && (
        <div className='mx-auto w-full max-w-4xl px-4 pt-3'>
          <div className='flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200'>
            <span>{error}</span>
            {lastFailedRequest && (
              <button
                type='button'
                onClick={handleRetryLast}
                className='rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-900/50'
                disabled={loading}
              >
                {loading ? 'Nouvelle tentative...' : 'R\u00e9essayer'}
              </button>
            )}
          </div>
        </div>
      )}

      <MobileSearchPanel
        showMobileSearch={search.showMobileSearch}
        setShowMobileSearch={search.setShowMobileSearch}
        mobileSearchInputRef={search.mobileSearchInputRef}
        searchQuery={search.searchQuery}
        setSearchQuery={search.setSearchQuery}
        searchMatchesCount={search.searchMatchesCount}
        activeMatchIndex={search.activeMatchIndex}
        handlePrevMatch={search.handlePrevMatch}
        handleNextMatch={search.handleNextMatch}
      />

      <ChatMessageList
        runtime={runtime}
        loadingHistory={loadingHistory}
        hasMoreHistory={hasMoreHistory}
        loadingMoreHistory={loadingMoreHistory}
        loadMoreHistory={loadMoreHistory}
        draftKey={draftKey}
        initialDraft={initialDraft}
        searchQuery={search.searchQuery}
        scrollToIndex={search.activeMessageIndex}
      />
    </div>
  );
}

export default ChatZone;
