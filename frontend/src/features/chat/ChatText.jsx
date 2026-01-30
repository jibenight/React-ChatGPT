import chatGPT from '../../assets/chatGPT.webp';
import chatGPTAnime from '../../assets/chatGPT.gif';
import { useEffect, useMemo, useRef, useState } from 'react';

function ChatText({ messages = [], error, loading }) {
  const [imgSrc, setImgSrc] = useState(chatGPT);
  const endRef = useRef(null);

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

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, error]);

  return (
    <div className='flex-1 overflow-y-auto'>
      <div className='mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6'>
        {renderedMessages.map((msg, index) => {
          const isAssistant = msg.role === 'assistant';
          return (
            <div
              key={index}
              className={`flex items-start gap-3 ${
                isAssistant ? 'justify-start' : 'justify-end'
              }`}
            >
              {isAssistant && (
                <div className='mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-700'>
                  <img
                    src={imgSrc}
                    alt=''
                    className='h-8 w-8 rounded-full'
                    onMouseOver={handleMouseOver}
                    onMouseOut={handleMouseOut}
                  />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-5 py-4 text-sm leading-relaxed shadow-sm ${
                  isAssistant
                    ? 'bg-white text-gray-700 ring-1 ring-gray-200 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-700'
                    : 'bg-teal-500 text-white'
                }`}
              >
                <p className='whitespace-pre-wrap'>{msg.content}</p>
              </div>
              {!isAssistant && (
                <div className='mt-1 hidden h-9 w-9 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-700 sm:flex dark:bg-teal-500/20 dark:text-teal-200'>
                  Vous
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className='flex items-start gap-3'>
            <div className='mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-700'>
              <img
                src={imgSrc}
                alt=''
                className='h-8 w-8 rounded-full'
                onMouseOver={handleMouseOver}
                onMouseOut={handleMouseOut}
              />
            </div>
            <div className='max-w-[70%] rounded-2xl bg-white px-5 py-4 text-sm text-gray-500 shadow-sm ring-1 ring-gray-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700'>
              <span className='animate-pulse'>Réflexion en cours…</span>
            </div>
          </div>
        )}

        {error && (
          <div className='rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200'>
            {error}
          </div>
        )}

        <div ref={endRef} />
      </div>
    </div>
  );
}

export default ChatText;
