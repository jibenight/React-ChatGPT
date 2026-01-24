import React, { useState } from 'react';
import axios from 'axios';
import ChatInput from './ChatInput';
import ChatText from './ChatText';
import { useUser } from '../../UserContext';
import { API_BASE } from '../../apiConfig';

function ChatZone({ selectedOption, sessionId }) {
  const { userData } = useUser();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async text => {
    if (!text.trim()) return;
    if (!userData?.id && !userData?.userId) {
      setError('Utilisateur non connecté');
      return;
    }

    const userId = userData.id || userData.userId;
    const provider = selectedOption?.provider || 'openai';
    const model = selectedOption?.model;

    const newMessages = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_BASE}/api/chat/message`, {
        userId,
        sessionId,
        message: text,
        provider,
        model,
      });
      const reply = response.data.reply || 'No response';
      setMessages([...newMessages, { role: 'assistant', content: reply }]);
    } catch (err) {
      setError(
        err.response?.data?.error || 'Erreur lors de la requête de chat',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='relative bg-gray-100 h-screen flex flex-col flex-1'>
      <ChatText messages={messages} error={error} />
      <ChatInput onSend={handleSend} loading={loading} />
    </div>
  );
}

export default ChatZone;
