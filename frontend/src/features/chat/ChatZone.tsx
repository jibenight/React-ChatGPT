import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import apiClient from '../../apiClient';
import { API_BASE } from '../../apiConfig';
import { AssistantRuntimeProvider, useExternalStoreRuntime } from '@assistant-ui/react';
import { v4 as uuidv4 } from 'uuid';
import { useUser } from '../../UserContext';
import { Thread } from '@/components/assistant-ui/thread';
import { useAppStore } from '../../stores/appStore';

function ChatZone({ sessionId }) {
  const selectedOption = useAppStore(s => s.selectedOption);
  const threadId = useAppStore(s => s.selectedThreadId);
  const projectId = useAppStore(s => s.selectedProjectId);
  const onThreadChange = useAppStore(s => s.setSelectedThreadId);

  type ChatRole = 'system' | 'user' | 'assistant';

  type ChatMessage = {
    id: string;
    role: ChatRole;
    content: string;
    attachments?: Array<{ id: string; type: string; name: string; contentType: string; status: { type: string }; content: unknown[]; file?: File }>;
    createdAt: Date;
  };

  type FailedRequest = {
    payload: Record<string, unknown>;
    threadId: string;
  };
  const DEV_BYPASS_AUTH =
    import.meta.env.DEV &&
    String(import.meta.env.VITE_DEV_BYPASS_AUTH).toLowerCase() === 'true';

  const buildStreamHeaders = () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    };
    const token = localStorage.getItem('token');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    if (DEV_BYPASS_AUTH) {
      const stored = localStorage.getItem('dev_user');
      if (stored) {
        try {
          const user = JSON.parse(stored);
          headers['X-Dev-User-Id'] = user.id;
          headers['X-Dev-User-Name'] = user.username;
          headers['X-Dev-User-Email'] = user.email;
        } catch {
          // ignore invalid storage
        }
      }
    }
    return headers;
  };

  const streamChat = async (payload, onDelta, signal) => {
    const response = await fetch(`${API_BASE}/api/chat/message`, {
      method: 'POST',
      headers: buildStreamHeaders(),
      body: JSON.stringify(payload),
      credentials: 'include',
      signal,
    });

    if (!response.ok) {
      const text = await response.text();
      try {
        const data = JSON.parse(text);
        throw new Error(data?.error || 'Erreur lors de la requête de chat');
      } catch {
        throw new Error(text || 'Erreur lors de la requête de chat');
      }
    }

    if (!response.body) {
      throw new Error('Streaming non supporté par le navigateur');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let finalReply = '';
    let finalThreadId = null;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';

      for (const part of parts) {
        const line = part
          .split('\n')
          .find(entry => entry.trim().startsWith('data:'));
        if (!line) continue;
        const json = line.replace(/^data:\s*/, '').trim();
        if (!json) continue;
        let event;
        try {
          event = JSON.parse(json);
        } catch {
          continue;
        }

        if (event.type === 'delta' && typeof event.content === 'string') {
          finalReply += event.content;
          onDelta?.(event.content);
        }

        if (event.type === 'error') {
          throw new Error(event.error || 'Erreur lors du streaming');
        }

        if (event.type === 'done') {
          if (typeof event.reply === 'string') {
            finalReply = event.reply;
          }
          finalThreadId = event.threadId || null;
        }
      }
    }

    return { reply: finalReply, threadId: finalThreadId };
  };

  const resolveChatError = (
    err: any,
    fallback = 'Erreur lors de la requête de chat',
  ) => {
    const formatMessage = (value: unknown): string | null => {
      if (typeof value !== 'string') return null;
      let message = value.trim();
      if (!message) return null;

      if (message.startsWith('{') && message.endsWith('}')) {
        try {
          const parsed = JSON.parse(message);
          const parsedMessage = parsed?.error?.message;
          if (typeof parsedMessage === 'string' && parsedMessage.trim()) {
            message = parsedMessage;
          }
        } catch {
          // Keep original text when not valid JSON.
        }
      }

      message = message
        .split('\n')
        .map(part => part.trim())
        .filter(Boolean)
        .join(' ');

      const missingKeyMatch = message.match(/API key not found for ([a-z0-9_-]+)/i);
      if (missingKeyMatch?.[1]) {
        return `Aucune clé API enregistrée pour ${missingKeyMatch[1]}. Sélectionne un fournisseur configuré dans le panneau de gauche.`;
      }

      return message.length > 350 ? `${message.slice(0, 347)}...` : message;
    };

    if (err?.name === 'AbortError' || err?.name === 'CanceledError') {
      return 'Génération annulée.';
    }
    const responseError = formatMessage(err?.response?.data?.error);
    if (responseError) return responseError;
    const message = formatMessage(err?.message);
    if (message) return message;
    return fallback;
  };
  const { userData } = useUser();
  const abortRef = useRef(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [historyCursor, setHistoryCursor] = useState<number | null>(null);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [loadingMoreHistory, setLoadingMoreHistory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [lastFailedRequest, setLastFailedRequest] =
    useState<FailedRequest | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const searchInputRef = useRef(null);
  const mobileSearchInputRef = useRef(null);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const draftKey = useMemo(() => {
    const activeUserId = userData?.id || userData?.userId;
    if (!activeUserId) return null;
    const scopeId = threadId || sessionId;
    const scopeProject = projectId ?? 'none';
    return `chat_draft:${activeUserId}:${scopeId}:${scopeProject}`;
  }, [projectId, sessionId, threadId, userData]);

  const initialDraft = useMemo(() => {
    if (!draftKey || typeof window === 'undefined') return '';
    try {
      return localStorage.getItem(draftKey) || '';
    } catch {
      return '';
    }
  }, [draftKey]);

  const fileToDataUrl = file =>
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

  const normalizeContent = content => {
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

  const mapStoredAttachments = attachments =>
    (attachments || []).map(att => ({
      id: att.id || uuidv4(),
      type: att.type || 'image',
      name: att.name || 'Attachment',
      contentType: att.mimeType || 'application/octet-stream',
      status: { type: 'complete' },
      content: [],
    }));

  const HISTORY_PAGE_SIZE = 50;

  const resolveHistoryCursor = items => {
    const rawId = items?.[0]?.id;
    const numeric = Number(rawId);
    return Number.isFinite(numeric) ? numeric : null;
  };

  const mergeHistory = (prev, next) => {
    const existing = new Set(prev.map(item => item.id));
    const filtered = next.filter(item => !existing.has(item.id));
    return [...filtered, ...prev];
  };

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
        const history = (response.data || []).map(item => ({
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
      .catch(err => {
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
      const nextHistory = (response.data || []).map(item => ({
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
    } catch (err) {
      setError(
        err.response?.data?.error ||
          'Erreur lors du chargement des messages précédents',
      );
    } finally {
      setLoadingMoreHistory(false);
    }
  };

  const extractText = message => {
    if (!message?.content) return '';
    if (typeof message.content === 'string') return message.content;
    if (!Array.isArray(message.content)) return '';
    return message.content
      .filter(part => part?.type === 'text' && typeof part.text === 'string')
      .map(part => part.text)
      .join('\n');
  };

  const handleSend = useCallback(async appendMessage => {
    const text = extractText(appendMessage);
    const attachments = appendMessage?.attachments ?? [];
    if (!text.trim() && attachments.length === 0) return;
    if (!userData?.id && !userData?.userId) {
      setError('Utilisateur non connecté');
      return;
    }

    const provider = selectedOption?.provider || 'openai';
    const model = selectedOption?.model;
    const activeThreadId = threadId || sessionId;

    if (draftKey && typeof window !== 'undefined') {
      try {
        localStorage.removeItem(draftKey);
      } catch {
        // ignore storage errors
      }
      window.dispatchEvent(
        new CustomEvent('chat-draft-clear', { detail: { key: draftKey } }),
      );
    }

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
        let dataUrl = null;
        if (Array.isArray(attachment.content)) {
          const imagePart = attachment.content.find(
            part => part?.type === 'image' && typeof part.image === 'string',
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
  }, [projectId, onThreadChange, selectedOption, sessionId, threadId, userData, draftKey]);

  const handleRetryLast = useCallback(async () => {
    if (!lastFailedRequest) return;
    if (lastFailedRequest.threadId !== (threadId || sessionId)) {
      setError('La conversation a changé. Relancez le message.');
      return;
    }
    if (!userData?.id && !userData?.userId) {
      setError('Utilisateur non connecté');
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
          role: 'assistant',
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

  const activeModelLabel =
    selectedOption?.name ||
    `${selectedOption?.provider || 'OpenAI'} – ${
      selectedOption?.model || 'gpt-4o'
    }`;

  const searchMatches = useMemo<number[]>(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return messages.reduce((indices, message, index) => {
      const text = normalizeContent(message.content).toLowerCase();
      if (text.includes(query)) indices.push(index);
      return indices;
    }, []);
  }, [messages, searchQuery]);

  const searchMatchesCount = searchMatches.length;
  const activeMessageIndex =
    searchMatchesCount > 0 && activeMatchIndex >= 0
      ? searchMatches[Math.min(activeMatchIndex, searchMatchesCount - 1)]
      : null;

  useEffect(() => {
    if (!searchQuery.trim()) {
      setActiveMatchIndex(0);
      return;
    }
    if (searchMatchesCount === 0) {
      setActiveMatchIndex(0);
      return;
    }
    setActiveMatchIndex(prev => Math.min(prev, searchMatchesCount - 1));
  }, [searchMatchesCount, searchQuery]);

  const handleNextMatch = () => {
    if (!searchMatchesCount) return;
    setActiveMatchIndex(prev => (prev + 1) % searchMatchesCount);
  };

  const handlePrevMatch = () => {
    if (!searchMatchesCount) return;
    setActiveMatchIndex(prev =>
      prev - 1 < 0 ? searchMatchesCount - 1 : prev - 1,
    );
  };

  useEffect(() => {
    const handleKeyDown = event => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'f') {
        if (searchInputRef.current) {
          event.preventDefault();
          searchInputRef.current.focus();
          searchInputRef.current.select();
        }
        return;
      }
      if (!searchQuery || !searchQuery.trim()) return;
      if (event.key !== 'Enter') return;
      if (event.shiftKey) {
        handlePrevMatch();
      } else {
        handleNextMatch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNextMatch, handlePrevMatch, searchQuery]);

  useEffect(() => {
    if (!showMobileSearch) return;
    mobileSearchInputRef.current?.focus();
  }, [showMobileSearch]);

  const renderSearchControls = (inputRef, sizeClass) => (
    <div className={`flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 ${sizeClass}`}>
      <input
        type='search'
        ref={inputRef}
        value={searchQuery}
        onChange={event => setSearchQuery(event.target.value)}
        placeholder='Rechercher…'
        className='w-40 bg-transparent text-xs text-gray-600 placeholder:text-gray-400 outline-none dark:text-slate-200 dark:placeholder:text-slate-500'
      />
      {searchQuery && (
        <button
          type='button'
          className='text-gray-400 transition hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200'
          onClick={() => setSearchQuery('')}
        >
          Effacer
        </button>
      )}
      {searchQuery && (
        <span className='rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700 dark:bg-teal-500/10 dark:text-teal-200'>
          {searchMatchesCount} trouvé{searchMatchesCount > 1 ? 's' : ''}
        </span>
      )}
      {searchQuery && searchMatchesCount > 0 && (
        <span className='flex items-center gap-1 text-[10px] text-gray-500 dark:text-slate-400'>
          {activeMatchIndex + 1}/{searchMatchesCount}
        </span>
      )}
      {searchQuery && searchMatchesCount > 0 && (
        <div className='flex items-center gap-1'>
          <button
            type='button'
            onClick={handlePrevMatch}
            className='rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-500 transition hover:border-gray-300 hover:text-gray-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-slate-100'
          >
            Précédent
          </button>
          <button
            type='button'
            onClick={handleNextMatch}
            className='rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-500 transition hover:border-gray-300 hover:text-gray-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-slate-100'
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  );

  const attachmentAdapter = useMemo(() => ({
    accept: 'image/*',
    async add({ file }) {
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
    async send(attachment) {
      let content = [];
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
      <header className='sticky top-0 z-10 border-b border-gray-200/70 bg-white/80 backdrop-blur dark:border-slate-800/80 dark:bg-slate-900/80'>
        <div className='mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-3'>
          <div className='space-y-1'>
            <p className='text-[11px] uppercase tracking-[0.2em] text-gray-400 dark:text-slate-400'>
              Conversation
            </p>
            <h2 className='text-lg font-semibold text-gray-800 dark:text-slate-100'>
              Chat
            </h2>
          </div>
          <div className='flex items-center gap-2'>
            {DEV_BYPASS_AUTH && (
              <span className='rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200'>
                Dev mode
              </span>
            )}
            <button
              type='button'
              onClick={() => setShowMobileSearch(prev => !prev)}
              className='rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-500 shadow-sm transition hover:border-gray-300 hover:text-gray-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-slate-100 sm:hidden'
            >
              {showMobileSearch ? 'Fermer' : 'Recherche'}
            </button>
            <div className='hidden sm:flex'>
              {renderSearchControls(searchInputRef, '')}
            </div>
            <button
              type='button'
              onClick={handleClear}
              disabled={messages.length === 0}
              className='rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-500 shadow-sm transition hover:border-gray-300 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-slate-100'
            >
              Effacer la conversation
            </button>
            <div className='flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'>
              <span className='h-2 w-2 rounded-full bg-teal-400' />
              <span className='truncate max-w-[170px] sm:max-w-[240px]'>
                {activeModelLabel}
              </span>
            </div>
          </div>
        </div>
      </header>

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
                {loading ? 'Nouvelle tentative...' : 'Réessayer'}
              </button>
            )}
          </div>
        </div>
      )}

      <div
        className={`mx-auto w-full max-w-4xl px-4 pt-3 sm:hidden transition-all duration-200 ${
          showMobileSearch
            ? 'max-h-[260px] opacity-100'
            : 'pointer-events-none max-h-0 opacity-0'
        }`}
      >
        <div className='overflow-hidden rounded-2xl border border-gray-200 bg-white/90 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/80'>
          <div className='mb-3 flex items-center justify-between'>
            <div className='text-xs font-semibold text-gray-600 dark:text-slate-300'>
              Recherche
            </div>
            <button
              type='button'
              onClick={() => setShowMobileSearch(false)}
              className='rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-500 transition hover:border-gray-300 hover:text-gray-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-slate-100'
            >
              Fermer
            </button>
          </div>
          {renderSearchControls(mobileSearchInputRef, 'w-full')}
          <div className='mt-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-[11px] text-gray-500 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400'>
            {searchQuery
              ? `${searchMatchesCount} résultat${
                  searchMatchesCount > 1 ? 's' : ''
                } · ${activeMatchIndex + 1}/${
                  searchMatchesCount || 0
                } affiché`
              : 'Entrez un mot-clé pour rechercher dans la conversation.'}
          </div>
        </div>
      </div>

      <div className='flex-1 min-h-0'>
        <AssistantRuntimeProvider runtime={runtime}>
          {hasMoreHistory && (
            <div className='mb-3 flex justify-center'>
              <button
                type='button'
                onClick={loadMoreHistory}
                disabled={loadingMoreHistory}
                className='rounded-full border border-gray-200 bg-white px-4 py-1.5 text-xs font-semibold text-gray-600 shadow-sm transition hover:border-gray-300 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-slate-100'
              >
                {loadingMoreHistory
                  ? 'Chargement...'
                  : 'Charger les messages précédents'}
              </button>
            </div>
          )}
          <Thread
            draftKey={draftKey}
            initialDraft={initialDraft}
            searchQuery={searchQuery}
            scrollToIndex={activeMessageIndex}
          />
        </AssistantRuntimeProvider>
      </div>
    </div>
  );
}

export default ChatZone;
