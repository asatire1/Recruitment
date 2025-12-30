// ============================================================================
// Allied Recruitment Portal - App.tsx Integration Example
// Shows how to integrate the global search modal into your app
// ============================================================================

// Add these imports to your App.tsx:
import { SearchModal, useGlobalSearch } from './components/search/SearchModal';

// Inside your App component, add:
function App() {
  const { isOpen, close } = useGlobalSearch();
  
  // ... your existing router and layout code ...
  
  return (
    <>
      {/* Your existing app content */}
      <Routes>
        {/* ... routes ... */}
      </Routes>
      
      {/* Global search modal - rendered at app root level */}
      <SearchModal isOpen={isOpen} onClose={close} />
    </>
  );
}

// ============================================================================
// Alternative: Add search button to header
// ============================================================================

// In your Header.tsx component:
import { useGlobalSearch } from './components/search/SearchModal';

function Header() {
  const { open } = useGlobalSearch();
  
  return (
    <header className={styles.header}>
      {/* ... other header content ... */}
      
      <button 
        className={styles.searchButton}
        onClick={open}
        title="Search (⌘K)"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
          <path 
            fillRule="evenodd" 
            d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" 
            clipRule="evenodd" 
          />
        </svg>
        <span>Search</span>
        <kbd>⌘K</kbd>
      </button>
    </header>
  );
}

// ============================================================================
// Adding AlgoliaSearch to Candidates page
// ============================================================================

// In your CandidatesPage.tsx or similar:
import { AlgoliaSearch } from '../components/search/AlgoliaSearch';
import { isAlgoliaConfigured } from '../lib/algolia';

function CandidatesPage() {
  const [useAlgoliaSearch, setUseAlgoliaSearch] = useState(isAlgoliaConfigured());
  
  return (
    <div className={styles.page}>
      <PageHeader title="Candidates">
        {isAlgoliaConfigured() && (
          <button onClick={() => setUseAlgoliaSearch(!useAlgoliaSearch)}>
            {useAlgoliaSearch ? 'Switch to List View' : 'Switch to Search View'}
          </button>
        )}
      </PageHeader>
      
      {useAlgoliaSearch ? (
        <AlgoliaSearch 
          showFilters={true}
          hitsPerPage={20}
          onSelectCandidate={(id) => navigate(`/candidates/${id}`)}
        />
      ) : (
        <CandidatesList />
      )}
    </div>
  );
}

// ============================================================================
// Environment Variables Setup (.env file)
// ============================================================================

/*
Create or update apps/recruitment-portal/.env with:

VITE_ALGOLIA_APP_ID=your_app_id_here
VITE_ALGOLIA_SEARCH_KEY=your_search_only_key_here
VITE_ALGOLIA_INDEX_NAME=candidates

Note: 
- Use the Search-Only API Key for VITE_ALGOLIA_SEARCH_KEY (safe for frontend)
- NEVER put the Admin API Key in frontend code
- The Admin API Key should only be in Firebase Functions secrets
*/

// ============================================================================
// Type checking for environment variables (optional)
// ============================================================================

// In apps/recruitment-portal/src/vite-env.d.ts, add:
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ALGOLIA_APP_ID: string
  readonly VITE_ALGOLIA_SEARCH_KEY: string
  readonly VITE_ALGOLIA_INDEX_NAME: string
  // ... other env vars
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
