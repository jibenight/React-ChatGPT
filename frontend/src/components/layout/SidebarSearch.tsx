import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, MessageSquare } from 'lucide-react';
import DOMPurify from 'dompurify';
import apiClient from '@/apiClient';
import { useAppStore } from '@/stores/appStore';

interface SearchResult {
  id: number;
  thread_id: string;
  thread_title: string | null;
  role: string;
  content: string;
  provider: string | null;
  created_at: string;
  snippet: string;
}

function SidebarSearch() {
  const setSelectedThreadId = useAppStore((s) => s.setSelectedThreadId);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.get('/api/search', {
        params: { q: searchQuery, limit: 20 },
      });
      setResults(response.data?.results || []);
      setTotal(response.data?.total || 0);
    } catch {
      setResults([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.trim().length < 2) {
      setResults([]);
      setTotal(0);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(() => {
      performSearch(query.trim());
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, performSearch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectResult = (result: SearchResult) => {
    setSelectedThreadId(result.thread_id);
    setOpen(false);
    setQuery('');
    setResults([]);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setTotal(0);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className='relative px-4 pt-3'>
      <div className='relative'>
        <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-500' />
        <input
          type='text'
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (query.trim().length >= 2) setOpen(true);
          }}
          placeholder='Rechercher dans les messages...'
          className='w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-9 text-xs text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-400/30 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-500'
        />
        {query && (
          <button
            type='button'
            onClick={handleClear}
            className='absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 transition hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300'
          >
            <X className='h-3.5 w-3.5' />
          </button>
        )}
      </div>

      {open && query.trim().length >= 2 && (
        <div className='absolute left-4 right-4 z-50 mt-1 max-h-80 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900'>
          {loading ? (
            <p className='px-4 py-3 text-xs text-gray-500 dark:text-slate-400'>
              Recherche en cours...
            </p>
          ) : results.length === 0 ? (
            <p className='px-4 py-3 text-xs text-gray-500 dark:text-slate-400'>
              Aucun résultat
            </p>
          ) : (
            <>
              <p className='border-b border-gray-100 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-gray-400 dark:border-slate-800 dark:text-slate-500'>
                {total} résultat{total > 1 ? 's' : ''}
              </p>
              {results.map((result) => (
                <button
                  key={result.id}
                  type='button'
                  onClick={() => handleSelectResult(result)}
                  className='flex w-full items-start gap-2.5 border-b border-gray-50 px-4 py-3 text-left transition last:border-b-0 hover:bg-gray-50 dark:border-slate-800/50 dark:hover:bg-slate-800/50'
                >
                  <MessageSquare className='mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-500 dark:text-teal-400' />
                  <div className='min-w-0 flex-1'>
                    <p className='truncate text-xs font-semibold text-gray-900 dark:text-slate-100'>
                      {result.thread_title || 'Conversation sans titre'}
                    </p>
                    <p
                      className='mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-gray-600 dark:text-slate-300'
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(result.snippet || result.content, { ALLOWED_TAGS: ['mark'], ALLOWED_ATTR: [] }) }}
                    />
                    <div className='mt-1 flex items-center gap-2 text-[10px] text-gray-400 dark:text-slate-500'>
                      <span className='capitalize'>{result.role}</span>
                      {result.provider && (
                        <>
                          <span>&middot;</span>
                          <span>{result.provider}</span>
                        </>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default SidebarSearch;
