import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { AssistantRuntimeProvider, useExternalStoreRuntime } from '@assistant-ui/react';
import { v4 as uuidv4 } from 'uuid';
import { useUser } from '../../UserContext';
import { API_BASE } from '../../apiConfig';
import { Thread } from '@/components/assistant-ui/thread';

function ChatZone({
  selectedOption,
  sessionId,
  threadId,
  projectId,
  onThreadChange,
}) {
  const { userData } = useUser();
  const abortRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [lastFailedRequest, setLastFailedRequest] = useState(null);

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

  const getAttachmentType = file => {
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

  const normalizeRole = role => {
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

  useEffect(() => {
    if (!threadId) {
      setMessages([]);
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoadingHistory(true);
    axios
      .get(`${API_BASE}/api/threads/${threadId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
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
        setError('');
      })
      .catch(err => {
        setError(
          err.response?.data?.error ||
            'Erreur lors du chargement de la conversation',
        );
      })
      .finally(() => setLoadingHistory(false));
  }, [threadId]);

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

    const userId = userData.id || userData.userId;
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

    const userMessage = {
      id: uuidv4(),
      role: 'user',
      content: text,
      attachments,
      createdAt: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    setError('');
    setLastFailedRequest(null);

    try {
      const attachmentPayload = [];
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
        userId,
        sessionId,
        threadId: activeThreadId,
        projectId,
        message: text,
        provider,
        model,
        attachments: attachmentPayload,
      };
      const response = await axios.post(
        `${API_BASE}/api/chat/message`,
        requestPayload,
        { signal: controller.signal },
      );
      const reply = response.data.reply || 'Aucune réponse';
      const assistantMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: reply,
        createdAt: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
      if (response.data.threadId && response.data.threadId !== threadId) {
        onThreadChange?.(response.data.threadId);
      }
    } catch (err) {
      if (err?.name === 'CanceledError') {
        setError('Génération annulée.');
      } else {
      setError(
        err.response?.data?.error || 'Erreur lors de la requête de chat',
      );
      }
      setLastFailedRequest({
        payload: {
          userId,
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
    try {
      const controller = new AbortController();
      abortRef.current = controller;
      const response = await axios.post(
        `${API_BASE}/api/chat/message`,
        lastFailedRequest.payload,
        { signal: controller.signal },
      );
      const reply = response.data.reply || 'Aucune réponse';
      const assistantMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: reply,
        createdAt: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
      if (response.data.threadId && response.data.threadId !== threadId) {
        onThreadChange?.(response.data.threadId);
      }
      setLastFailedRequest(null);
    } catch (err) {
      if (err?.name === 'CanceledError') {
        setError('Génération annulée.');
      } else {
        setError(
          err.response?.data?.error || 'Erreur lors de la requête de chat',
        );
      }
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
  }), []);

  const handleClear = () => {
    setMessages([]);
    setError('');
  };

  const runtime = useExternalStoreRuntime(
    useMemo(() => ({
      messages,
      isRunning: loading,
      isLoading: loadingHistory,
      isDisabled: !userData?.id && !userData?.userId,
      convertMessage: message => ({
        id: message.id,
        createdAt: message.createdAt,
        role: message.role,
        content: normalizeContent(message.content),
        attachments: message.attachments ?? [],
      }),
      setMessages,
      onNew: handleSend,
      onCancel: () => {
        abortRef.current?.abort();
      },
      adapters: {
        attachments: attachmentAdapter,
      },
    }), [attachmentAdapter, handleSend, loading, loadingHistory, messages, userData]),
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

      <div className='flex-1 min-h-0'>
        <AssistantRuntimeProvider runtime={runtime}>
          <Thread draftKey={draftKey} initialDraft={initialDraft} />
        </AssistantRuntimeProvider>
      </div>
    </div>
  );
}

export default ChatZone;
