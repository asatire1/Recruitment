import { Skeleton } from '../ui';
import './PageLoader.css';

/**
 * Full page loader for lazy-loaded routes
 */
export default function PageLoader() {
  return (
    <div className="page-loader" role="status" aria-label="Loading page">
      <div className="page-loader__content">
        <div className="page-loader__spinner" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round"
              className="page-loader__track"
            />
            <circle 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round"
              strokeDasharray="31.4 31.4"
              className="page-loader__progress"
            />
          </svg>
        </div>
        <span className="page-loader__text">Loading...</span>
      </div>
    </div>
  );
}

/**
 * Inline loader for smaller sections
 */
export function InlineLoader({ text = 'Loading...' }) {
  return (
    <div className="inline-loader" role="status">
      <div className="inline-loader__spinner" aria-hidden="true" />
      <span className="inline-loader__text">{text}</span>
    </div>
  );
}

/**
 * Button loader state
 */
export function ButtonLoader() {
  return (
    <span className="button-loader" aria-hidden="true">
      <span className="button-loader__dot" />
      <span className="button-loader__dot" />
      <span className="button-loader__dot" />
    </span>
  );
}
