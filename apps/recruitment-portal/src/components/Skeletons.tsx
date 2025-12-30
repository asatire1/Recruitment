// ============================================================================
// Allied Recruitment Portal - Skeleton Loaders (R11.3)
// Location: apps/recruitment-portal/src/components/Skeletons.tsx
// ============================================================================

import './Skeletons.css'

// ============================================================================
// BASE SKELETON
// ============================================================================

interface SkeletonProps {
  width?: string | number
  height?: string | number
  borderRadius?: string | number
  className?: string
}

export function Skeleton({ 
  width = '100%', 
  height = '1rem', 
  borderRadius = '4px',
  className = '' 
}: SkeletonProps) {
  return (
    <div 
      className={`skeleton ${className}`}
      style={{ 
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius,
      }}
      aria-hidden="true"
    />
  )
}

// ============================================================================
// PAGE LOADER (for Suspense fallback)
// ============================================================================

export function PageLoader() {
  return (
    <div className="page-loader" role="status" aria-label="Loading page">
      <div className="page-loader-content">
        <div className="page-loader-spinner" />
        <p className="page-loader-text">Loading...</p>
      </div>
    </div>
  )
}

// ============================================================================
// TABLE SKELETON
// ============================================================================

interface TableSkeletonProps {
  rows?: number
  columns?: number
  showHeader?: boolean
}

export function TableSkeleton({ rows = 5, columns = 5, showHeader = true }: TableSkeletonProps) {
  return (
    <div className="skeleton-table" role="status" aria-label="Loading table">
      {showHeader && (
        <div className="skeleton-table-header">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} height={16} width={`${60 + Math.random() * 40}%`} />
          ))}
        </div>
      )}
      <div className="skeleton-table-body">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="skeleton-table-row">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton 
                key={colIndex} 
                height={14} 
                width={colIndex === 0 ? '80%' : `${50 + Math.random() * 30}%`} 
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// CARD SKELETON
// ============================================================================

export function CardSkeleton() {
  return (
    <div className="skeleton-card" role="status" aria-label="Loading card">
      <div className="skeleton-card-header">
        <Skeleton width={120} height={20} />
        <Skeleton width={60} height={24} borderRadius={12} />
      </div>
      <div className="skeleton-card-body">
        <Skeleton height={14} width="90%" />
        <Skeleton height={14} width="75%" />
        <Skeleton height={14} width="60%" />
      </div>
      <div className="skeleton-card-footer">
        <Skeleton width={80} height={32} borderRadius={6} />
        <Skeleton width={80} height={32} borderRadius={6} />
      </div>
    </div>
  )
}

// ============================================================================
// LIST SKELETON
// ============================================================================

interface ListSkeletonProps {
  items?: number
  showAvatar?: boolean
}

export function ListSkeleton({ items = 5, showAvatar = true }: ListSkeletonProps) {
  return (
    <div className="skeleton-list" role="status" aria-label="Loading list">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="skeleton-list-item">
          {showAvatar && <Skeleton width={40} height={40} borderRadius="50%" />}
          <div className="skeleton-list-content">
            <Skeleton height={16} width={`${60 + Math.random() * 30}%`} />
            <Skeleton height={12} width={`${40 + Math.random() * 20}%`} />
          </div>
          <Skeleton width={60} height={24} borderRadius={12} />
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// STATS SKELETON
// ============================================================================

interface StatsSkeletonProps {
  count?: number
}

export function StatsSkeleton({ count = 4 }: StatsSkeletonProps) {
  return (
    <div className="skeleton-stats" role="status" aria-label="Loading statistics">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-stat-card">
          <Skeleton height={32} width={60} />
          <Skeleton height={14} width={80} />
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// FORM SKELETON
// ============================================================================

interface FormSkeletonProps {
  fields?: number
}

export function FormSkeleton({ fields = 4 }: FormSkeletonProps) {
  return (
    <div className="skeleton-form" role="status" aria-label="Loading form">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="skeleton-form-field">
          <Skeleton height={14} width={100} />
          <Skeleton height={40} width="100%" borderRadius={6} />
        </div>
      ))}
      <div className="skeleton-form-actions">
        <Skeleton width={100} height={40} borderRadius={6} />
        <Skeleton width={100} height={40} borderRadius={6} />
      </div>
    </div>
  )
}

// ============================================================================
// CANDIDATE CARD SKELETON
// ============================================================================

export function CandidateCardSkeleton() {
  return (
    <div className="skeleton-candidate-card" role="status" aria-label="Loading candidate">
      <div className="skeleton-candidate-header">
        <Skeleton width={48} height={48} borderRadius="50%" />
        <div className="skeleton-candidate-info">
          <Skeleton height={18} width={150} />
          <Skeleton height={14} width={200} />
        </div>
        <Skeleton width={80} height={24} borderRadius={12} />
      </div>
      <div className="skeleton-candidate-details">
        <Skeleton height={14} width="60%" />
        <Skeleton height={14} width="40%" />
      </div>
      <div className="skeleton-candidate-actions">
        <Skeleton width={90} height={32} borderRadius={6} />
        <Skeleton width={90} height={32} borderRadius={6} />
      </div>
    </div>
  )
}

// ============================================================================
// CANDIDATES LIST SKELETON
// ============================================================================

interface CandidatesListSkeletonProps {
  count?: number
}

export function CandidatesListSkeleton({ count = 10 }: CandidatesListSkeletonProps) {
  return (
    <div className="skeleton-candidates-list" role="status" aria-label="Loading candidates">
      {Array.from({ length: count }).map((_, i) => (
        <CandidateCardSkeleton key={i} />
      ))}
    </div>
  )
}

// ============================================================================
// DASHBOARD SKELETON
// ============================================================================

export function DashboardSkeleton() {
  return (
    <div className="skeleton-dashboard" role="status" aria-label="Loading dashboard">
      {/* Stats row */}
      <StatsSkeleton count={4} />
      
      {/* Main content */}
      <div className="skeleton-dashboard-grid">
        <div className="skeleton-dashboard-main">
          <Skeleton height={24} width={200} />
          <TableSkeleton rows={5} columns={4} />
        </div>
        <div className="skeleton-dashboard-sidebar">
          <Skeleton height={24} width={150} />
          <ListSkeleton items={5} />
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// DETAIL PAGE SKELETON
// ============================================================================

export function DetailPageSkeleton() {
  return (
    <div className="skeleton-detail-page" role="status" aria-label="Loading details">
      {/* Header */}
      <div className="skeleton-detail-header">
        <div className="skeleton-detail-title">
          <Skeleton width={48} height={48} borderRadius="50%" />
          <div>
            <Skeleton height={24} width={200} />
            <Skeleton height={14} width={150} />
          </div>
        </div>
        <div className="skeleton-detail-actions">
          <Skeleton width={100} height={36} borderRadius={6} />
          <Skeleton width={100} height={36} borderRadius={6} />
        </div>
      </div>
      
      {/* Content */}
      <div className="skeleton-detail-content">
        <div className="skeleton-detail-main">
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <div className="skeleton-detail-sidebar">
          <Skeleton height={200} borderRadius={8} />
          <ListSkeleton items={3} showAvatar={false} />
        </div>
      </div>
    </div>
  )
}
