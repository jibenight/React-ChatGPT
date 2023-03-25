import React, { useState } from 'react';
import ChatInput from './ChatInput';
import ChatText from './ChatText';

function ChatZone() {
  const [messages, setMessages] = useState([]);

  return (
    <div className='relative bg-gray-100 h-screen'>
      <ChatText />
      <ChatInput />
    </div>
  );
}

export default ChatZone;
