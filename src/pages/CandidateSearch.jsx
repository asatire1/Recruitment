import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useAlgoliaSearch,
  useSkillSuggestions,
  useRecentSearches,
  useSavedSearches,
  FILTER_OPTIONS,
  SORT_OPTIONS
} from '../hooks/useAlgoliaSearch';
import { formatExperienceDuration } from '../hooks/useCVParser';
import SearchFilters from '../components/SearchFilters';
import './CandidateSearch.css';

// Icons
const Icons = {
  Search: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  X: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  Filter: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
    </svg>
  ),
  ChevronDown: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  ),
  User: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  Briefcase: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
    </svg>
  ),
  MapPin: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  FileText: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  Star: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  Clock: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  Save: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
      <polyline points="17 21 17 13 7 13 7 21"/>
      <polyline points="7 3 7 8 15 8"/>
    </svg>
  ),
  ChevronLeft: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
  ChevronRight: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  )
};

// Status badge colors
const STATUS_COLORS = {
  new: '#3b82f6',
  screening: '#8b5cf6',
  interview: '#f59e0b',
  trial: '#10b981',
  offer: '#06b6d4',
  approved: '#22c55e',
  rejected: '#ef4444',
  hired: '#14b8a6',
  withdrawn: '#6b7280'
};

// Search Result Card Component
function SearchResultCard({ result, onClick }) {
  const fullName = `${result.firstName} ${result.lastName}`;
  const experienceText = result.totalExperienceMonths 
    ? formatExperienceDuration(result.totalExperienceMonths)
    : 'Not specified';

  return (
    <div className="search-result-card" onClick={onClick}>
      <div className="result-avatar">
        {result.avatarUrl ? (
          <img src={result.avatarUrl} alt={fullName} />
        ) : (
          <span className="avatar-initials">
            {result.firstName?.[0]}{result.lastName?.[0]}
          </span>
        )}
        {result.cvParsed && (
          <span className="cv-badge" title="CV Parsed">
            <Icons.FileText />
          </span>
        )}
      </div>

      <div className="result-content">
        <div className="result-header">
          <h3 
            className="result-name"
            dangerouslySetInnerHTML={{ 
              __html: result._highlightResult?.firstName?.value 
                ? `${result._highlightResult.firstName.value} ${result._highlightResult.lastName?.value || result.lastName}`
                : fullName
            }}
          />
          <span 
            className="result-status"
            style={{ '--status-color': STATUS_COLORS[result.status] || '#6b7280' }}
          >
            {result.status?.replace('_', ' ')}
          </span>
        </div>

        <div className="result-meta">
          {result.appliedJobTitle && (
            <span className="meta-item">
              <Icons.Briefcase />
              <span dangerouslySetInnerHTML={{ 
                __html: result._highlightResult?.appliedJobTitle?.value || result.appliedJobTitle 
              }} />
            </span>
          )}
          {result.branchName && (
            <span className="meta-item">
              <Icons.MapPin />
              {result.branchName}
            </span>
          )}
          <span className="meta-item">
            <Icons.Clock />
            {experienceText} experience
          </span>
        </div>

        {result.skills && result.skills.length > 0 && (
          <div className="result-skills">
            {result.skills.slice(0, 5).map((skill, idx) => (
              <span key={idx} className="skill-tag">
                {typeof skill === 'string' ? skill : skill.name}
              </span>
            ))}
            {result.skills.length > 5 && (
              <span className="skill-more">+{result.skills.length - 5} more</span>
            )}
          </div>
        )}
      </div>

      {result.rating && (
        <div className="result-rating">
          <Icons.Star />
          <span>{result.rating.toFixed(1)}</span>
        </div>
      )}
    </div>
  );
}

// Pagination Component
function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const maxVisible = 5;
  let start = Math.max(0, page - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible);
  
  if (end - start < maxVisible) {
    start = Math.max(0, end - maxVisible);
  }

  for (let i = start; i < end; i++) {
    pages.push(i);
  }

  return (
    <div className="pagination">
      <button
        className="pagination-btn"
        disabled={page === 0}
        onClick={() => onPageChange(page - 1)}
      >
        <Icons.ChevronLeft />
      </button>
      
      {start > 0 && (
        <>
          <button className="pagination-page" onClick={() => onPageChange(0)}>1</button>
          {start > 1 && <span className="pagination-ellipsis">...</span>}
        </>
      )}
      
      {pages.map(p => (
        <button
          key={p}
          className={`pagination-page ${p === page ? 'active' : ''}`}
          onClick={() => onPageChange(p)}
        >
          {p + 1}
        </button>
      ))}
      
      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="pagination-ellipsis">...</span>}
          <button 
            className="pagination-page" 
            onClick={() => onPageChange(totalPages - 1)}
          >
            {totalPages}
          </button>
        </>
      )}
      
      <button
        className="pagination-btn"
        disabled={page === totalPages - 1}
        onClick={() => onPageChange(page + 1)}
      >
        <Icons.ChevronRight />
      </button>
    </div>
  );
}

// Save Search Modal
function SaveSearchModal({ isOpen, onClose, onSave }) {
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim());
      setName('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="save-search-modal" onClick={e => e.stopPropagation()}>
        <h3>Save Search</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Enter a name for this search..."
            className="form-input"
            autoFocus
          />
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
              Save Search
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Main CandidateSearch Component
export default function CandidateSearch() {
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(true);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  const {
    query,
    filters,
    sortBy,
    page,
    results,
    totalHits,
    totalPages,
    loading,
    error,
    facets,
    updateQuery,
    updateFilters,
    clearFilters,
    toggleFilter,
    setSortBy,
    goToPage
  } = useAlgoliaSearch({ hitsPerPage: 20 });

  const { suggestions, getSuggestions } = useSkillSuggestions();
  const { recentSearches, addRecentSearch } = useRecentSearches();
  const { savedSearches, saveSearch, deleteSearch } = useSavedSearches();

  // Handle search submission
  const handleSearch = useCallback((e) => {
    e?.preventDefault();
    addRecentSearch(searchInput);
    updateQuery(searchInput);
  }, [searchInput, addRecentSearch, updateQuery]);

  // Handle search input change
  const handleInputChange = (e) => {
    setSearchInput(e.target.value);
    getSuggestions(e.target.value);
  };

  // Handle clear search
  const handleClearSearch = () => {
    setSearchInput('');
    updateQuery('');
  };

  // Handle result click
  const handleResultClick = (result) => {
    navigate(`/candidates/${result.objectID}`);
  };

  // Handle save search
  const handleSaveSearch = (name) => {
    saveSearch(name, query, filters);
  };

  // Load saved search
  const loadSavedSearch = (search) => {
    setSearchInput(search.query || '');
    updateQuery(search.query || '');
    updateFilters(search.filters || {});
  };

  // Count active filters
  const activeFilterCount = Object.entries(filters).reduce((count, [key, value]) => {
    if (Array.isArray(value)) return count + value.length;
    if (value !== undefined && value !== null && value !== '') return count + 1;
    return count;
  }, 0);

  return (
    <div className="candidate-search-page">
      {/* Header */}
      <div className="search-header">
        <div className="search-header-left">
          <h1>Search Candidates</h1>
          <p>Find the perfect candidate with AI-powered search</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="search-bar-container">
        <form className="search-form" onSubmit={handleSearch}>
          <div className="search-input-wrapper">
            <Icons.Search />
            <input
              type="text"
              value={searchInput}
              onChange={handleInputChange}
              placeholder="Search by name, skills, job title, location..."
              className="search-input"
            />
            {searchInput && (
              <button 
                type="button" 
                className="search-clear" 
                onClick={handleClearSearch}
              >
                <Icons.X />
              </button>
            )}
          </div>
          <button type="submit" className="btn btn-primary search-btn">
            Search
          </button>
        </form>

        <div className="search-actions">
          <button 
            className={`btn btn-secondary filter-toggle ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Icons.Filter />
            Filters
            {activeFilterCount > 0 && (
              <span className="filter-count">{activeFilterCount}</span>
            )}
          </button>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {(query || activeFilterCount > 0) && (
            <button 
              className="btn btn-icon" 
              onClick={() => setShowSaveModal(true)}
              title="Save this search"
            >
              <Icons.Save />
            </button>
          )}
        </div>
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && searchInput && (
        <div className="search-suggestions">
          <span className="suggestions-label">Skills:</span>
          {suggestions.map((suggestion, idx) => (
            <button
              key={idx}
              className="suggestion-tag"
              onClick={() => {
                toggleFilter('skills', suggestion.value);
                setSearchInput('');
              }}
            >
              <span dangerouslySetInnerHTML={{ __html: suggestion.highlighted }} />
              <span className="suggestion-count">({suggestion.count})</span>
            </button>
          ))}
        </div>
      )}

      {/* Recent & Saved Searches */}
      {!query && !loading && (recentSearches.length > 0 || savedSearches.length > 0) && (
        <div className="search-history">
          {recentSearches.length > 0 && (
            <div className="history-section">
              <h3>Recent Searches</h3>
              <div className="history-items">
                {recentSearches.map((search, idx) => (
                  <button
                    key={idx}
                    className="history-item"
                    onClick={() => {
                      setSearchInput(search);
                      updateQuery(search);
                    }}
                  >
                    <Icons.Clock />
                    {search}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {savedSearches.length > 0 && (
            <div className="history-section">
              <h3>Saved Searches</h3>
              <div className="history-items">
                {savedSearches.map(search => (
                  <button
                    key={search.id}
                    className="history-item saved"
                    onClick={() => loadSavedSearch(search)}
                  >
                    <Icons.Save />
                    {search.name}
                    <span 
                      className="delete-saved"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSearch(search.id);
                      }}
                    >
                      <Icons.X />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="search-content">
        {/* Filters Sidebar */}
        {showFilters && (
          <SearchFilters
            filters={filters}
            facets={facets}
            onUpdateFilters={updateFilters}
            onToggleFilter={toggleFilter}
            onClearFilters={clearFilters}
          />
        )}

        {/* Results */}
        <div className="search-results">
          {/* Results Header */}
          <div className="results-header">
            <span className="results-count">
              {loading ? 'Searching...' : `${totalHits.toLocaleString()} candidates found`}
            </span>
            {activeFilterCount > 0 && (
              <button className="clear-filters-btn" onClick={clearFilters}>
                Clear all filters
              </button>
            )}
          </div>

          {/* Error State */}
          {error && (
            <div className="search-error">
              <p>Error searching candidates: {error}</p>
              <button className="btn btn-secondary" onClick={() => updateQuery(query)}>
                Try Again
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="search-loading">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="result-skeleton">
                  <div className="skeleton-avatar" />
                  <div className="skeleton-content">
                    <div className="skeleton-line short" />
                    <div className="skeleton-line medium" />
                    <div className="skeleton-line long" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Results List */}
          {!loading && !error && results.length > 0 && (
            <>
              <div className="results-list">
                {results.map(result => (
                  <SearchResultCard
                    key={result.objectID}
                    result={result}
                    onClick={() => handleResultClick(result)}
                  />
                ))}
              </div>

              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={goToPage}
              />
            </>
          )}

          {/* Empty State */}
          {!loading && !error && results.length === 0 && query && (
            <div className="search-empty">
              <div className="empty-icon">
                <Icons.Search />
              </div>
              <h3>No candidates found</h3>
              <p>Try adjusting your search terms or filters</p>
              <div className="empty-suggestions">
                <button className="btn btn-secondary" onClick={clearFilters}>
                  Clear all filters
                </button>
              </div>
            </div>
          )}

          {/* Initial State */}
          {!loading && !error && results.length === 0 && !query && (
            <div className="search-initial">
              <div className="initial-icon">
                <Icons.Search />
              </div>
              <h3>Search for candidates</h3>
              <p>Enter a search term or use filters to find candidates</p>
            </div>
          )}
        </div>
      </div>

      {/* Save Search Modal */}
      <SaveSearchModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSaveSearch}
      />
    </div>
  );
}
