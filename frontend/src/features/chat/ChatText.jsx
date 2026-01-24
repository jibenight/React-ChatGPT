import chatGPT from '../assets/chatGPT.webp';
import chatGPTAnime from '../assets/chatGPT.gif';
import { useMemo, useState } from 'react';

function ChatText({ messages = [], error }) {
  const [imgSrc, setImgSrc] = useState(chatGPT);

  const renderedMessages = useMemo(() => {
    if (messages.length === 0) {
      return [
        {
          role: 'assistant',
          content: 'Posez votre première question pour démarrer la session.',
        },
      ];
    }
    return messages;
  }, [messages]);

  const handleMouseOver = () => {
    setImgSrc(chatGPTAnime);
  };

  const handleMouseOut = () => {
    setImgSrc(chatGPT);
  };

  return (
    <div className='m-3 flex flex-col gap-4 xl:w-2/3 xl:mx-auto pb-24'>
      {renderedMessages.map((msg, index) => (
        <div
          key={index}
          className={`flex ${msg.role === 'assistant' ? '' : 'justify-end'}`}
        >
          {msg.role === 'assistant' && (
            <img
              src={imgSrc}
              alt=''
              className='h-12 w-12 flex-shrink-0 rounded-full'
              onMouseOver={handleMouseOver}
              onMouseOut={handleMouseOut}
            />
          )}
          <p
            className={`mx-3 px-5 py-3 rounded-lg bg-slate-200 max-w-xl ${
              msg.role === 'assistant' ? '' : 'bg-teal-100'
            }`}
          >
            {msg.content}
          </p>
        </div>
      ))}
      {error && (
        <p className='text-red-600 text-sm mx-3'>
          {error}
        </p>
      )}
    </div>
  );
}

export default ChatText;
