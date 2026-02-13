import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';

function normalizeContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (content === null || content === undefined) return '';
  try {
    return JSON.stringify(content);
  } catch {
    return String(content);
  }
}

export function useChatSearch(messages: Array<{ content: string }>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [rawMatchIndex, setRawMatchIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const searchMatches = useMemo<number[]>(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return messages.reduce<number[]>((indices, message, index) => {
      const text = normalizeContent(message.content).toLowerCase();
      if (text.includes(query)) indices.push(index);
      return indices;
    }, []);
  }, [messages, searchQuery]);

  const searchMatchesCount = searchMatches.length;

  const activeMatchIndex = useMemo(() => {
    if (!searchQuery.trim() || searchMatchesCount === 0) return 0;
    return Math.min(rawMatchIndex, searchMatchesCount - 1);
  }, [rawMatchIndex, searchMatchesCount, searchQuery]);

  const activeMessageIndex =
    searchMatchesCount > 0 && activeMatchIndex >= 0
      ? searchMatches[activeMatchIndex]
      : null;

  const handleNextMatch = useCallback(() => {
    if (!searchMatchesCount) return;
    setRawMatchIndex(prev => (prev + 1) % searchMatchesCount);
  }, [searchMatchesCount]);

  const handlePrevMatch = useCallback(() => {
    if (!searchMatchesCount) return;
    setRawMatchIndex(prev =>
      prev - 1 < 0 ? searchMatchesCount - 1 : prev - 1,
    );
  }, [searchMatchesCount]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
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

  return {
    searchQuery,
    setSearchQuery,
    activeMatchIndex,
    searchMatchesCount,
    activeMessageIndex,
    handleNextMatch,
    handlePrevMatch,
    searchInputRef,
    mobileSearchInputRef,
    showMobileSearch,
    setShowMobileSearch,
  };
}

type SearchControlsProps = {
  inputRef: React.RefObject<HTMLInputElement | null>;
  sizeClass: string;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchMatchesCount: number;
  activeMatchIndex: number;
  handlePrevMatch: () => void;
  handleNextMatch: () => void;
};

export function SearchControls({
  inputRef,
  sizeClass,
  searchQuery,
  setSearchQuery,
  searchMatchesCount,
  activeMatchIndex,
  handlePrevMatch,
  handleNextMatch,
}: SearchControlsProps) {
  return (
    <div
      className={`flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 ${sizeClass}`}
    >
      <input
        type='search'
        ref={inputRef}
        value={searchQuery}
        onChange={event => setSearchQuery(event.target.value)}
        placeholder='Rechercher\u2026'
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
          {searchMatchesCount} trouv\u00e9{searchMatchesCount > 1 ? 's' : ''}
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
            Pr\u00e9c\u00e9dent
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
}

type MobileSearchPanelProps = {
  showMobileSearch: boolean;
  setShowMobileSearch: (v: boolean) => void;
  mobileSearchInputRef: React.RefObject<HTMLInputElement | null>;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchMatchesCount: number;
  activeMatchIndex: number;
  handlePrevMatch: () => void;
  handleNextMatch: () => void;
};

export function MobileSearchPanel({
  showMobileSearch,
  setShowMobileSearch,
  mobileSearchInputRef,
  searchQuery,
  setSearchQuery,
  searchMatchesCount,
  activeMatchIndex,
  handlePrevMatch,
  handleNextMatch,
}: MobileSearchPanelProps) {
  return (
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
        <SearchControls
          inputRef={mobileSearchInputRef}
          sizeClass='w-full'
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchMatchesCount={searchMatchesCount}
          activeMatchIndex={activeMatchIndex}
          handlePrevMatch={handlePrevMatch}
          handleNextMatch={handleNextMatch}
        />
        <div className='mt-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-[11px] text-gray-500 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400'>
          {searchQuery
            ? `${searchMatchesCount} r\u00e9sultat${
                searchMatchesCount > 1 ? 's' : ''
              } \u00b7 ${activeMatchIndex + 1}/${
                searchMatchesCount || 0
              } affich\u00e9`
            : 'Entrez un mot-cl\u00e9 pour rechercher dans la conversation.'}
        </div>
      </div>
    </div>
  );
}
