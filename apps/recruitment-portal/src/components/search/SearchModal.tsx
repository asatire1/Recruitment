// ============================================================================
// Allied Recruitment Portal - Global Search Modal (Cmd+K)
// Location: apps/recruitment-portal/src/components/search/SearchModal.tsx
// ============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  quickSearch, 
  isAlgoliaConfigured, 
  formatSearchResult,
  type AlgoliaCandidateHit 
} from '../../lib/algolia';
import styles from './SearchModal.module.css';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AlgoliaCandidateHit[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfigured] = useState(isAlgoliaConfigured());
  
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Search with debounce
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      const hits = await quickSearch(query, 8);
      setResults(hits);
      setSelectedIndex(0);
      setIsLoading(false);
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          navigateToCandidate(results[selectedIndex].objectID);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [results, selectedIndex, onClose]);

  const navigateToCandidate = (candidateId: string) => {
    navigate(`/candidates/${candidateId}`);
    onClose();
  };

  // Status badge color
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: '#3B82F6',
      screening: '#8B5CF6',
      interview_scheduled: '#F59E0B',
      interview_complete: '#10B981',
      trial_scheduled: '#F97316',
      trial_complete: '#22C55E',
      approved: '#059669',
      rejected: '#EF4444',
      withdrawn: '#6B7280'
    };
    return colors[status] || '#6B7280';
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Search Input */}
        <div className={styles.inputWrapper}>
          <svg className={styles.searchIcon} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className={styles.input}
            placeholder="Search candidates..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {isLoading && <div className={styles.spinner} />}
          <kbd className={styles.kbd}>ESC</kbd>
        </div>

        {/* Not Configured Warning */}
        {!isConfigured && (
          <div className={styles.warning}>
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>Search not configured. Add Algolia credentials to enable.</span>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className={styles.results}>
            {results.map((hit, index) => {
              const formatted = formatSearchResult(hit);
              return (
                <button
                  key={hit.objectID}
                  className={`${styles.result} ${index === selectedIndex ? styles.selected : ''}`}
                  onClick={() => navigateToCandidate(hit.objectID)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className={styles.resultIcon}>
                    <svg viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className={styles.resultContent}>
                    <div 
                      className={styles.resultTitle}
                      dangerouslySetInnerHTML={{ __html: formatted.highlightedTitle }}
                    />
                    <div className={styles.resultMeta}>
                      <span 
                        dangerouslySetInnerHTML={{ __html: formatted.highlightedSubtitle }}
                      />
                      {hit.email && (
                        <span 
                          className={styles.resultEmail}
                          dangerouslySetInnerHTML={{ 
                            __html: hit._highlightResult?.email?.value || hit.email 
                          }}
                        />
                      )}
                    </div>
                  </div>
                  <span 
                    className={styles.statusBadge}
                    style={{ backgroundColor: getStatusColor(hit.status) }}
                  >
                    {hit.statusLabel}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* No Results */}
        {query.length >= 2 && !isLoading && results.length === 0 && (
          <div className={styles.noResults}>
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
            <span>No candidates found for "{query}"</span>
          </div>
        )}

        {/* Footer */}
        <div className={styles.footer}>
          <div className={styles.footerHints}>
            <span><kbd>↑</kbd> <kbd>↓</kbd> to navigate</span>
            <span><kbd>↵</kbd> to select</span>
            <span><kbd>esc</kbd> to close</span>
          </div>
          <a 
            href="/candidates?search=advanced" 
            className={styles.advancedLink}
            onClick={onClose}
          >
            Advanced Search
          </a>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Hook to manage global search keyboard shortcut
// ============================================================================

export function useGlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K to open
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false)
  };
}

export default SearchModal;
