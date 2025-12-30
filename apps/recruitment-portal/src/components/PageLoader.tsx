// ============================================================================
// Allied Recruitment Portal - Page Loader (R11.3)
// Location: apps/recruitment-portal/src/components/PageLoader.tsx
// ============================================================================

import './Skeletons.css'

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

export default PageLoader
