import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { searchCandidates, getSearchSuggestions, isAlgoliaConfigured } from '../../lib/algolia';
import './AlgoliaSearch.css';

/**
 * AlgoliaSearch - Enhanced search with autocomplete
 * Falls back gracefully if Algolia is not configured
 */
export default function AlgoliaSearch({ 
  onSearch, 
  onResults,
  placeholder = 'Search candidates...',
  showSuggestions = true,
  className = ''
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);

  // Debounced suggestion fetch
  const fetchSuggestions = useCallback(async (searchQuery) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    if (!isAlgoliaConfigured) {
      return;
    }

    setIsLoading(true);
    try {
      const results = await getSearchSuggestions(searchQuery, 6);
      setSuggestions(results);
      setShowDropdown(results.length > 0);
    } catch (error) {
      console.error('Search suggestions error:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle input change with debounce
  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedIndex(-1);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (showSuggestions && value.trim()) {
      debounceRef.current = setTimeout(() => {
        fetchSuggestions(value);
      }, 150);
    } else {
      setSuggestions([]);
      setShowDropdown(false);
    }
  };

  // Handle full search
  const handleSearch = async (searchQuery = query) => {
    if (!searchQuery.trim()) return;

    setShowDropdown(false);
    
    if (onSearch) {
      onSearch(searchQuery);
    }

    if (onResults && isAlgoliaConfigured) {
      setIsLoading(true);
      try {
        const results = await searchCandidates(searchQuery);
        onResults(results);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    setQuery('');
    setSuggestions([]);
    setShowDropdown(false);
    navigate(`/candidates/${suggestion.id}`);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!showDropdown || suggestions.length === 0) {
      if (e.key === 'Enter') {
        handleSearch();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSuggestionClick(suggestions[selectedIndex]);
        } else {
          handleSearch();
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Clear search
  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setShowDropdown(false);
    inputRef.current?.focus();
    if (onSearch) onSearch('');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(e.target) &&
        !inputRef.current?.contains(e.target)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Highlight matching text
  const highlightMatch = (text, highlight) => {
    if (!highlight || !highlight.value) return text;
    return (
      <span dangerouslySetInnerHTML={{ __html: highlight.value }} />
    );
  };

  return (
    <div className={`algolia-search ${className}`}>
      <div className="algolia-search-input-wrapper">
        <Search className="algolia-search-icon" size={18} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
          placeholder={placeholder}
          className="algolia-search-input"
          autoComplete="off"
          aria-label="Search candidates"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
          role="combobox"
        />
        {isLoading && (
          <Loader2 className="algolia-search-loader" size={18} />
        )}
        {query && !isLoading && (
          <button 
            onClick={handleClear}
            className="algolia-search-clear"
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <div 
          ref={dropdownRef}
          className="algolia-search-dropdown"
          role="listbox"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              onClick={() => handleSuggestionClick(suggestion)}
              className={`algolia-search-suggestion ${
                index === selectedIndex ? 'selected' : ''
              }`}
              role="option"
              aria-selected={index === selectedIndex}
            >
              <div className="suggestion-avatar">
                {suggestion.name.charAt(0).toUpperCase()}
              </div>
              <div className="suggestion-info">
                <span className="suggestion-name">
                  {suggestion._highlightResult?.firstName 
                    ? highlightMatch(suggestion.name, suggestion._highlightResult.firstName)
                    : suggestion.name
                  }
                </span>
                {suggestion.jobTitle && (
                  <span className="suggestion-title">{suggestion.jobTitle}</span>
                )}
                <span className="suggestion-email">{suggestion.email}</span>
              </div>
            </button>
          ))}
          <div className="algolia-search-footer">
            <button 
              onClick={() => handleSearch()}
              className="algolia-search-all"
            >
              Search all for "{query}"
            </button>
          </div>
        </div>
      )}

      {/* Algolia badge (optional - required by free tier) */}
      {isAlgoliaConfigured && showDropdown && (
        <div className="algolia-search-attribution">
          <span>Search by</span>
          <svg height="12" viewBox="0 0 77 19">
            <path fill="#5468FF" d="M17.54 0H2.46A2.46 2.46 0 000 2.46v14.08A2.46 2.46 0 002.46 19h15.08A2.46 2.46 0 0020 16.54V2.46A2.46 2.46 0 0017.54 0z"/>
            <path fill="#FFF" d="M10.3 5.73c-2.7 0-4.88 2.18-4.88 4.87 0 2.7 2.18 4.87 4.87 4.87 2.7 0 4.87-2.18 4.87-4.87s-2.18-4.87-4.87-4.87zm0 8.05a3.18 3.18 0 110-6.36 3.18 3.18 0 010 6.36z"/>
            <text x="24" y="14" fill="#5468FF" fontSize="12" fontWeight="600">algolia</text>
          </svg>
        </div>
      )}
    </div>
  );
}
