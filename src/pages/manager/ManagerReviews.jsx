import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  usePendingReviews, 
  useReviewActions,
  REVIEW_DECISION 
} from '../../hooks/useManagerPortal';
import { useServiceWorker, useOfflineStorage } from '../../hooks/usePWA';
import ReviewCard from '../../components/ReviewCard';
import ReviewModal from '../../components/ReviewModal';
import './ManagerReviews.css';

// Icons
const Icons = {
  ArrowLeft: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="19" y1="12" x2="5" y2="12"/>
      <polyline points="12 19 5 12 12 5"/>
    </svg>
  ),
  CheckCircle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  Inbox: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
    </svg>
  ),
  WifiOff: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="1" y1="1" x2="23" y2="23"/>
      <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
      <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
      <path d="M10.71 5.05A16 16 0 0 1 22.58 9"/>
      <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
      <line x1="12" y1="20" x2="12.01" y2="20"/>
    </svg>
  ),
  Filter: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
    </svg>
  )
};

// Filter options
const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'screening', label: 'Screening' },
  { value: 'interview', label: 'Interview' },
  { value: 'trial', label: 'Trial' }
];

export default function ManagerReviews() {
  const { reviews, loading, error, count } = usePendingReviews();
  const { submitReview, submitting } = useReviewActions();
  const { isOnline } = useServiceWorker();
  const { queueForSync } = useOfflineStorage();
  
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [filter, setFilter] = useState('all');
  const [showSuccess, setShowSuccess] = useState(false);

  // Filter reviews
  const filteredReviews = filter === 'all' 
    ? reviews 
    : reviews.filter(r => r.status === filter);

  // Handle review submission
  const handleReview = async (decision, notes) => {
    if (!selectedCandidate) return;

    if (isOnline) {
      const success = await submitReview(selectedCandidate.id, decision, notes);
      if (success) {
        setSelectedCandidate(null);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      }
    } else {
      // Queue for background sync when offline
      await queueForSync({
        type: 'candidate_review',
        candidateId: selectedCandidate.id,
        decision,
        notes,
        timestamp: new Date().toISOString()
      });
      setSelectedCandidate(null);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  return (
    <div className="manager-reviews">
      {/* Header */}
      <header className="reviews-header">
        <Link to="/manager" className="back-btn">
          <Icons.ArrowLeft />
        </Link>
        <div className="header-content">
          <h1>Pending Reviews</h1>
          <span className="review-count">{count} candidates</span>
        </div>
      </header>

      {/* Offline Notice */}
      {!isOnline && (
        <div className="offline-notice">
          <Icons.WifiOff />
          <span>Offline - Reviews will sync when connected</span>
        </div>
      )}

      {/* Filter */}
      <div className="filter-bar">
        <Icons.Filter />
        <div className="filter-chips">
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`filter-chip ${filter === opt.value ? 'active' : ''}`}
              onClick={() => setFilter(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Success Toast */}
      {showSuccess && (
        <div className="success-toast">
          <Icons.CheckCircle />
          <span>Review submitted{!isOnline ? ' (will sync when online)' : ''}</span>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="reviews-loading">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton-card">
              <div className="skeleton-avatar" />
              <div className="skeleton-content">
                <div className="skeleton-line" />
                <div className="skeleton-line short" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="reviews-error">
          <p>Error loading reviews: {error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredReviews.length === 0 && (
        <div className="reviews-empty">
          <Icons.Inbox />
          <h2>All caught up!</h2>
          <p>No candidates pending review</p>
          <Link to="/manager" className="back-link">Back to Dashboard</Link>
        </div>
      )}

      {/* Reviews List */}
      {!loading && !error && filteredReviews.length > 0 && (
        <div className="reviews-list">
          {filteredReviews.map(candidate => (
            <ReviewCard
              key={candidate.id}
              candidate={candidate}
              onReview={() => setSelectedCandidate(candidate)}
            />
          ))}
        </div>
      )}

      {/* Review Modal */}
      {selectedCandidate && (
        <ReviewModal
          candidate={selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
          onSubmit={handleReview}
          submitting={submitting}
        />
      )}
    </div>
  );
}
