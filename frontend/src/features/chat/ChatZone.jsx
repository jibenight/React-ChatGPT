import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ChatInput from './ChatInput';
import ChatText from './ChatText';
import { useUser } from '../../UserContext';
import { API_BASE } from '../../apiConfig';

function ChatZone({
  selectedOption,
  sessionId,
  threadId,
  projectId,
  onThreadChange,
}) {
  const { userData } = useUser();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);

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
          role: item.role,
          content: item.content,
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

  const handleSend = async text => {
    if (!text.trim()) return;
    if (!userData?.id && !userData?.userId) {
      setError('Utilisateur non connecté');
      return;
    }

    const userId = userData.id || userData.userId;
    const provider = selectedOption?.provider || 'openai';
    const model = selectedOption?.model;
    const activeThreadId = threadId || sessionId;

    const newMessages = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_BASE}/api/chat/message`, {
        userId,
        sessionId,
        threadId: activeThreadId,
        projectId,
        message: text,
        provider,
        model,
      });
      const reply = response.data.reply || 'Aucune réponse';
      setMessages([...newMessages, { role: 'assistant', content: reply }]);
      if (response.data.threadId && response.data.threadId !== threadId) {
        onThreadChange?.(response.data.threadId);
      }
    } catch (err) {
      setError(
        err.response?.data?.error || 'Erreur lors de la requête de chat',
      );
    } finally {
      setLoading(false);
    }
  };

  const activeModelLabel =
    selectedOption?.name ||
    `${selectedOption?.provider || 'OpenAI'} – ${
      selectedOption?.model || 'gpt-4o'
    }`;

  const handleClear = () => {
    setMessages([]);
    setError('');
  };

  return (
    <div className='relative flex h-screen flex-1 flex-col overflow-hidden bg-gradient-to-b from-gray-100 via-white to-gray-50'>
      <header className='sticky top-0 z-10 border-b border-gray-200/70 bg-white/80 backdrop-blur'>
        <div className='mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-3'>
          <div className='space-y-1'>
            <p className='text-[11px] uppercase tracking-[0.2em] text-gray-400'>
              Conversation
            </p>
            <h2 className='text-lg font-semibold text-gray-800'>Chat</h2>
          </div>
          <div className='flex items-center gap-2'>
            <button
              type='button'
              onClick={handleClear}
              disabled={messages.length === 0}
              className='rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-500 shadow-sm transition hover:border-gray-300 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-60'
            >
              Effacer la conversation
            </button>
            <div className='flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm'>
              <span className='h-2 w-2 rounded-full bg-teal-400' />
              <span className='truncate max-w-[170px] sm:max-w-[240px]'>
                {activeModelLabel}
              </span>
            </div>
          </div>
        </div>
      </header>

      <ChatText
        messages={messages}
        error={error}
        loading={loading || loadingHistory}
      />
      <ChatInput onSend={handleSend} loading={loading} />
    </div>
  );
}

export default ChatZone;
