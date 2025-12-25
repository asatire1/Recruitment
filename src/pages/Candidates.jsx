import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCandidates, useCandidateStats } from '../hooks/useCandidates';
import CVUploader from '../components/CVUploader';
import './Candidates.css';

// Icons
const Icons = {
  Search: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Filter: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  Plus: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  ChevronRight: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>,
  X: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
};

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'new', label: 'New' },
  { value: 'screening', label: 'Screening' },
  { value: 'interview', label: 'Interview' },
  { value: 'trial', label: 'Trial' },
  { value: 'offer', label: 'Offer' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'hired', label: 'Hired' }
];

const STATUS_COLORS = {
  new: '#3b82f6',
  screening: '#8b5cf6',
  interview: '#f59e0b',
  trial: '#10b981',
  offer: '#ec4899',
  approved: '#22c55e',
  rejected: '#ef4444',
  hired: '#06b6d4'
};

export default function Candidates() {
  const [filters, setFilters] = useState({ status: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploader, setShowUploader] = useState(false);
  
  const { candidates, loading, error } = useCandidates(filters);
  const { stats } = useCandidateStats();

  // Filter by search query locally
  const filteredCandidates = candidates.filter(c => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      c.firstName?.toLowerCase().includes(query) ||
      c.lastName?.toLowerCase().includes(query) ||
      c.email?.toLowerCase().includes(query) ||
      c.phone?.includes(query)
    );
  });

  return (
    <div className="candidates-page">
      {/* Header */}
      <header className="page-header">
        <div className="header-content">
          <h1>Candidates</h1>
          <p>{stats.total || 0} total candidates</p>
        </div>
        <div className="header-actions">
          <button className="add-btn" onClick={() => setShowUploader(true)}>
            <Icons.Plus />
            Add Candidate
          </button>
          <Link to="/search" className="search-btn">
            <Icons.Search />
            Advanced Search
          </Link>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="stats-bar">
        {STATUS_OPTIONS.slice(1).map(status => (
          <button
            key={status.value}
            className={`stat-chip ${filters.status === status.value ? 'active' : ''}`}
            style={{ '--chip-color': STATUS_COLORS[status.value] }}
            onClick={() => setFilters({ ...filters, status: filters.status === status.value ? '' : status.value })}
          >
            <span className="chip-count">{stats[status.value] || 0}</span>
            <span className="chip-label">{status.label}</span>
          </button>
cat > ~/Documents/Recruitment/src/pages/Candidates.jsx << 'EOF'
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCandidates, useCandidateStats } from '../hooks/useCandidates';
import CVUploader from '../components/CVUploader';
import './Candidates.css';

// Icons
const Icons = {
  Search: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Filter: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  Plus: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  ChevronRight: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>,
  X: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
};

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'new', label: 'New' },
  { value: 'screening', label: 'Screening' },
  { value: 'interview', label: 'Interview' },
  { value: 'trial', label: 'Trial' },
  { value: 'offer', label: 'Offer' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'hired', label: 'Hired' }
];

const STATUS_COLORS = {
  new: '#3b82f6',
  screening: '#8b5cf6',
  interview: '#f59e0b',
  trial: '#10b981',
  offer: '#ec4899',
  approved: '#22c55e',
  rejected: '#ef4444',
  hired: '#06b6d4'
};

export default function Candidates() {
  const [filters, setFilters] = useState({ status: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploader, setShowUploader] = useState(false);
  
  const { candidates, loading, error } = useCandidates(filters);
  const { stats } = useCandidateStats();

  // Filter by search query locally
  const filteredCandidates = candidates.filter(c => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      c.firstName?.toLowerCase().includes(query) ||
      c.lastName?.toLowerCase().includes(query) ||
      c.email?.toLowerCase().includes(query) ||
      c.phone?.includes(query)
    );
  });

  return (
    <div className="candidates-page">
      {/* Header */}
      <header className="page-header">
        <div className="header-content">
          <h1>Candidates</h1>
          <p>{stats.total || 0} total candidates</p>
        </div>
        <div className="header-actions">
          <button className="add-btn" onClick={() => setShowUploader(true)}>
            <Icons.Plus />
            Add Candidate
          </button>
          <Link to="/search" className="search-btn">
            <Icons.Search />
            Advanced Search
          </Link>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="stats-bar">
        {STATUS_OPTIONS.slice(1).map(status => (
          <button
            key={status.value}
            className={`stat-chip ${filters.status === status.value ? 'active' : ''}`}
            style={{ '--chip-color': STATUS_COLORS[status.value] }}
            onClick={() => setFilters({ ...filters, status: filters.status === status.value ? '' : status.value })}
          >
            <span className="chip-count">{stats[status.value] || 0}</span>
            <span className="chip-label">{status.label}</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-input">
          <Icons.Search />
          <input
            type="text"
            placeholder="Search by name, email, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          {STATUS_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Loading */}
      {loading && (
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading candidates...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="error-state">
          <p>Error: {error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredCandidates.length === 0 && (
        <div className="empty-state">
          <h2>No candidates found</h2>
          <p>Try adjusting your filters or add a new candidate</p>
          <button className="add-btn" onClick={() => setShowUploader(true)}>
            <Icons.Plus />
            Add Candidate
          </button>
        </div>
      )}

      {/* Candidates List */}
      {!loading && !error && filteredCandidates.length > 0 && (
        <div className="candidates-list">
          {filteredCandidates.map(candidate => (
            <Link
              key={candidate.id}
              to={`/candidates/${candidate.id}`}
              className="candidate-card"
            >
              <div className="candidate-avatar">
                {candidate.avatarUrl ? (
                  <img src={candidate.avatarUrl} alt="" />
                ) : (
                  <span>{candidate.firstName?.[0]}{candidate.lastName?.[0]}</span>
                )}
              </div>
              <div className="candidate-info">
                <h3>{candidate.firstName} {candidate.lastName}</h3>
                <p>{candidate.appliedJobTitle || 'No job specified'}</p>
                <span
                  className="status-badge"
                  style={{ '--status-color': STATUS_COLORS[candidate.status] }}
                >
                  {candidate.status}
                </span>
              </div>
              <Icons.ChevronRight />
            </Link>
          ))}
        </div>
      )}

      {/* CV Upload Modal */}
      {showUploader && (
        <div className="modal-overlay" onClick={() => setShowUploader(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Candidate</h2>
              <button className="close-btn" onClick={() => setShowUploader(false)}>
                <Icons.X />
              </button>
            </div>
            <CVUploader onSuccess={() => setShowUploader(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
