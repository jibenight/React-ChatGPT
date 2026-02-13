import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { SearchControls } from './ChatSearchBar';
import apiClient from '../../apiClient';

const DEV_BYPASS_AUTH =
  import.meta.env.DEV &&
  String(import.meta.env.VITE_DEV_BYPASS_AUTH).toLowerCase() === 'true';

type ChatHeaderProps = {
  activeModelLabel: string;
  messagesCount: number;
  threadId: string | null;
  onClear: () => void;
  showMobileSearch: boolean;
  setShowMobileSearch: (v: boolean) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchMatchesCount: number;
  activeMatchIndex: number;
  handlePrevMatch: () => void;
  handleNextMatch: () => void;
};

function ChatHeader({
  activeModelLabel,
  messagesCount,
  threadId,
  onClear,
  showMobileSearch,
  setShowMobileSearch,
  searchInputRef,
  searchQuery,
  setSearchQuery,
  searchMatchesCount,
  activeMatchIndex,
  handlePrevMatch,
  handleNextMatch,
}: ChatHeaderProps) {
  const [exportOpen, setExportOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    if (exportOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [exportOpen]);

  const handleExport = useCallback(async (format: 'md' | 'json') => {
    if (!threadId) return;
    setExportOpen(false);
    try {
      const response = await apiClient.get(
        `/api/threads/${threadId}/export`,
        { params: { format }, responseType: 'blob' },
      );
      const disposition = response.headers['content-disposition'] || '';
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
      const fallbackExt = format === 'md' ? 'md' : 'json';
      const filename = filenameMatch?.[1] || `conversation.${fallbackExt}`;
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      // silently fail — could add toast later
    }
  }, [threadId]);

  const canExport = !!threadId && messagesCount > 0;

  return (
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
            onClick={() => setShowMobileSearch(!showMobileSearch)}
            className='rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-500 shadow-sm transition hover:border-gray-300 hover:text-gray-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-slate-100 sm:hidden'
          >
            {showMobileSearch ? 'Fermer' : 'Recherche'}
          </button>
          <div className='hidden sm:flex'>
            <SearchControls
              inputRef={searchInputRef}
              sizeClass=''
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              searchMatchesCount={searchMatchesCount}
              activeMatchIndex={activeMatchIndex}
              handlePrevMatch={handlePrevMatch}
              handleNextMatch={handleNextMatch}
            />
          </div>
          <div className='relative' ref={dropdownRef}>
            <button
              type='button'
              onClick={() => setExportOpen(prev => !prev)}
              disabled={!canExport}
              title='Exporter la conversation'
              className='rounded-full border border-gray-200 bg-white p-1.5 text-gray-500 shadow-sm transition hover:border-gray-300 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-slate-100'
            >
              <Download size={16} />
            </button>
            {exportOpen && (
              <div className='absolute right-0 top-full mt-1 w-52 rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900'>
                <button
                  type='button'
                  onClick={() => handleExport('md')}
                  className='flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-slate-200 dark:hover:bg-slate-800'
                >
                  Exporter en Markdown
                </button>
                <button
                  type='button'
                  onClick={() => handleExport('json')}
                  className='flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-slate-200 dark:hover:bg-slate-800'
                >
                  Exporter en JSON
                </button>
              </div>
            )}
          </div>
          <button
            type='button'
            onClick={onClear}
            disabled={messagesCount === 0}
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
  );
}

export default ChatHeader;
