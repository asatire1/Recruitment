import './Skeleton.css';

/**
 * Skeleton loading component
 * @param {Object} props
 * @param {'text'|'avatar'|'card'|'stat'|'table-row'} props.variant - Type of skeleton
 * @param {string} props.width - Custom width (CSS value)
 * @param {string} props.height - Custom height (CSS value)
 * @param {number} props.count - Number of skeletons to render
 * @param {string} props.className - Additional CSS classes
 */
export function Skeleton({ 
  variant = 'text', 
  width, 
  height, 
  count = 1,
  className = '' 
}) {
  const skeletons = Array.from({ length: count }, (_, i) => (
    <div 
      key={i}
      className={`skeleton skeleton--${variant} ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  ));

  return count === 1 ? skeletons[0] : <>{skeletons}</>;
}

/**
 * Candidate card skeleton
 */
export function CandidateCardSkeleton() {
  return (
    <div className="skeleton-card" aria-label="Loading candidate">
      <div className="skeleton-card__header">
        <Skeleton variant="avatar" />
        <div className="skeleton-card__info">
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="40%" height="12px" />
        </div>
      </div>
      <div className="skeleton-card__body">
        <Skeleton variant="text" width="80%" />
        <Skeleton variant="text" width="50%" />
      </div>
      <div className="skeleton-card__footer">
        <Skeleton variant="text" width="100px" height="28px" />
      </div>
    </div>
  );
}

/**
 * Table row skeleton
 */
export function TableRowSkeleton({ columns = 5 }) {
  return (
    <tr className="skeleton-table-row" aria-label="Loading row">
      {Array.from({ length: columns }, (_, i) => (
        <td key={i}>
          <Skeleton variant="text" width={i === 0 ? '70%' : '50%'} />
        </td>
      ))}
    </tr>
  );
}

/**
 * Stats card skeleton
 */
export function StatCardSkeleton() {
  return (
    <div className="skeleton-stat-card" aria-label="Loading statistic">
      <Skeleton variant="text" width="60%" height="14px" />
      <Skeleton variant="text" width="40%" height="32px" />
    </div>
  );
}

/**
 * Dashboard skeleton with multiple stats
 */
export function DashboardSkeleton() {
  return (
    <div className="skeleton-dashboard">
      <div className="skeleton-dashboard__stats">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
      <div className="skeleton-dashboard__content">
        <div className="skeleton-dashboard__section">
          <Skeleton variant="text" width="150px" height="20px" />
          <CandidateCardSkeleton />
          <CandidateCardSkeleton />
          <CandidateCardSkeleton />
        </div>
      </div>
    </div>
  );
}

/**
 * Candidate detail page skeleton
 */
export function CandidateDetailSkeleton() {
  return (
    <div className="skeleton-candidate-detail" aria-label="Loading candidate details">
      <div className="skeleton-candidate-detail__header">
        <Skeleton variant="avatar" width="80px" height="80px" />
        <div className="skeleton-candidate-detail__title">
          <Skeleton variant="text" width="200px" height="28px" />
          <Skeleton variant="text" width="150px" height="16px" />
          <Skeleton variant="text" width="100px" height="24px" />
        </div>
      </div>
      <div className="skeleton-candidate-detail__body">
        <div className="skeleton-candidate-detail__section">
          <Skeleton variant="text" width="120px" height="18px" />
          <Skeleton variant="text" width="100%" />
          <Skeleton variant="text" width="100%" />
          <Skeleton variant="text" width="80%" />
        </div>
      </div>
    </div>
  );
}

/**
 * List skeleton for generic lists
 */
export function ListSkeleton({ rows = 5 }) {
  return (
    <div className="skeleton-list" aria-label="Loading list">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton-list__item">
          <Skeleton variant="avatar" width="40px" height="40px" />
          <div className="skeleton-list__content">
            <Skeleton variant="text" width="70%" />
            <Skeleton variant="text" width="40%" height="12px" />
          </div>
        </div>
      ))}
    </div>
  );
}
