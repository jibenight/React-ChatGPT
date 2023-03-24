import React, { useState } from 'react';
import ChatInput from './ChatInput';

function ChatZone() {
  const [messages, setMessages] = useState([]);

  return (
    <div className='relative bg-gray-100 h-screen'>
      <ChatInput />
    </div>
  );
}

export default ChatZone;
