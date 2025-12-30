// ============================================================================
// Allied Recruitment Portal - Advanced Algolia Search Component
// Location: apps/recruitment-portal/src/components/search/AlgoliaSearch.tsx
// 
// This component provides full-featured search with:
// - InstantSearch integration
// - Faceted filtering
// - Pagination
// - Highlighting
// - CV content search
// ============================================================================

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { InstantSearch, SearchBox, Hits, RefinementList, Pagination, Stats, Configure, useInstantSearch } from 'react-instantsearch';
import { getSearchClient, getIndexName, type AlgoliaCandidateHit } from '../../lib/algolia';
import styles from './AlgoliaSearch.module.css';

// ============================================================================
// Main Search Component
// ============================================================================

interface AlgoliaSearchProps {
  defaultFilters?: {
    status?: string[];
    jobTitle?: string;
    branchId?: string;
  };
  onSelectCandidate?: (candidateId: string) => void;
  showFilters?: boolean;
  hitsPerPage?: number;
}

export function AlgoliaSearch({ 
  defaultFilters,
  onSelectCandidate,
  showFilters = true,
  hitsPerPage = 20
}: AlgoliaSearchProps) {
  const searchClient = getSearchClient();
  const navigate = useNavigate();

  if (!searchClient) {
    return (
      <div className={styles.notConfigured}>
        <div className={styles.warningIcon}>⚠️</div>
        <h3>Search Not Configured</h3>
        <p>
          Algolia search is not configured. Please add VITE_ALGOLIA_APP_ID and 
          VITE_ALGOLIA_SEARCH_KEY to your environment variables.
        </p>
      </div>
    );
  }

  const handleSelect = (candidateId: string) => {
    if (onSelectCandidate) {
      onSelectCandidate(candidateId);
    } else {
      navigate(`/candidates/${candidateId}`);
    }
  };

  // Build initial filters string
  const buildFilters = () => {
    if (!defaultFilters) return undefined;
    const parts: string[] = [];
    if (defaultFilters.status?.length) {
      parts.push(`(${defaultFilters.status.map(s => `status:${s}`).join(' OR ')})`);
    }
    if (defaultFilters.jobTitle) {
      parts.push(`jobTitle:"${defaultFilters.jobTitle}"`);
    }
    if (defaultFilters.branchId) {
      parts.push(`branchId:${defaultFilters.branchId}`);
    }
    return parts.length ? parts.join(' AND ') : undefined;
  };

  return (
    <InstantSearch 
      searchClient={searchClient} 
      indexName={getIndexName()}
      future={{ preserveSharedStateOnUnmount: true }}
    >
      <Configure 
        hitsPerPage={hitsPerPage}
        filters={buildFilters()}
        attributesToHighlight={['firstName', 'lastName', 'email', 'jobTitle', 'branchName', 'cvText']}
        highlightPreTag="<mark>"
        highlightPostTag="</mark>"
        attributesToSnippet={['cvText:30']}
      />
      
      <div className={styles.searchContainer}>
        {/* Search Input */}
        <div className={styles.searchHeader}>
          <SearchBox 
            placeholder="Search candidates by name, email, phone, skills, CV content..."
            classNames={{
              root: styles.searchBoxRoot,
              form: styles.searchBoxForm,
              input: styles.searchBoxInput,
              submit: styles.searchBoxSubmit,
              reset: styles.searchBoxReset,
              loadingIndicator: styles.searchBoxLoading
            }}
          />
          <Stats 
            classNames={{
              root: styles.stats
            }}
          />
        </div>

        <div className={styles.searchLayout}>
          {/* Filters Sidebar */}
          {showFilters && (
            <aside className={styles.filtersSidebar}>
              <FilterSection title="Status">
                <RefinementList 
                  attribute="status"
                  classNames={{
                    root: styles.refinementRoot,
                    list: styles.refinementList,
                    item: styles.refinementItem,
                    selectedItem: styles.refinementItemSelected,
                    label: styles.refinementLabel,
                    checkbox: styles.refinementCheckbox,
                    labelText: styles.refinementLabelText,
                    count: styles.refinementCount
                  }}
                  transformItems={(items) => 
                    items.map(item => ({
                      ...item,
                      label: formatStatus(item.label)
                    }))
                  }
                />
              </FilterSection>

              <FilterSection title="Job Title">
                <RefinementList 
                  attribute="jobTitle"
                  searchable
                  searchablePlaceholder="Filter job titles..."
                  classNames={{
                    root: styles.refinementRoot,
                    list: styles.refinementList,
                    item: styles.refinementItem,
                    selectedItem: styles.refinementItemSelected,
                    label: styles.refinementLabel,
                    checkbox: styles.refinementCheckbox,
                    labelText: styles.refinementLabelText,
                    count: styles.refinementCount,
                    searchBox: styles.refinementSearch
                  }}
                />
              </FilterSection>

              <FilterSection title="Branch">
                <RefinementList 
                  attribute="branchName"
                  searchable
                  searchablePlaceholder="Filter branches..."
                  limit={10}
                  showMore
                  showMoreLimit={50}
                  classNames={{
                    root: styles.refinementRoot,
                    list: styles.refinementList,
                    item: styles.refinementItem,
                    selectedItem: styles.refinementItemSelected,
                    label: styles.refinementLabel,
                    checkbox: styles.refinementCheckbox,
                    labelText: styles.refinementLabelText,
                    count: styles.refinementCount,
                    searchBox: styles.refinementSearch,
                    showMore: styles.showMore
                  }}
                />
              </FilterSection>

              <FilterSection title="CV Uploaded">
                <RefinementList 
                  attribute="hasCV"
                  classNames={{
                    root: styles.refinementRoot,
                    list: styles.refinementList,
                    item: styles.refinementItem,
                    selectedItem: styles.refinementItemSelected,
                    label: styles.refinementLabel,
                    checkbox: styles.refinementCheckbox,
                    labelText: styles.refinementLabelText,
                    count: styles.refinementCount
                  }}
                  transformItems={(items) => 
                    items.map(item => ({
                      ...item,
                      label: item.label === 'true' ? 'Has CV' : 'No CV'
                    }))
                  }
                />
              </FilterSection>

              <ClearFiltersButton />
            </aside>
          )}

          {/* Results */}
          <main className={styles.resultsMain}>
            <Hits 
              hitComponent={({ hit }) => (
                <CandidateHit hit={hit as AlgoliaCandidateHit} onSelect={handleSelect} />
              )}
              classNames={{
                root: styles.hitsRoot,
                list: styles.hitsList,
                item: styles.hitsItem
              }}
            />
            
            <Pagination 
              padding={2}
              classNames={{
                root: styles.paginationRoot,
                list: styles.paginationList,
                item: styles.paginationItem,
                selectedItem: styles.paginationItemSelected,
                disabledItem: styles.paginationItemDisabled,
                link: styles.paginationLink
              }}
            />
          </main>
        </div>
      </div>
    </InstantSearch>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
}

function FilterSection({ title, children }: FilterSectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  
  return (
    <div className={styles.filterSection}>
      <button 
        className={styles.filterHeader}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{title}</span>
        <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}>
          ›
        </span>
      </button>
      {isOpen && (
        <div className={styles.filterContent}>
          {children}
        </div>
      )}
    </div>
  );
}

function ClearFiltersButton() {
  const { setIndexUiState } = useInstantSearch();
  
  const handleClear = useCallback(() => {
    setIndexUiState(prevState => ({
      ...prevState,
      refinementList: {}
    }));
  }, [setIndexUiState]);
  
  return (
    <button className={styles.clearFilters} onClick={handleClear}>
      Clear all filters
    </button>
  );
}

interface CandidateHitProps {
  hit: AlgoliaCandidateHit;
  onSelect: (id: string) => void;
}

function CandidateHit({ hit, onSelect }: CandidateHitProps) {
  const getHighlight = (attr: string) => {
    const highlight = hit._highlightResult?.[attr];
    if (highlight && highlight.matchLevel !== 'none') {
      return highlight.value;
    }
    return (hit as any)[attr] || '';
  };

  const statusColors: Record<string, string> = {
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

  return (
    <button 
      className={styles.candidateHit}
      onClick={() => onSelect(hit.objectID)}
    >
      <div className={styles.hitAvatar}>
        {hit.firstName?.[0]}{hit.lastName?.[0]}
      </div>
      
      <div className={styles.hitContent}>
        <div className={styles.hitHeader}>
          <h4 
            className={styles.hitName}
            dangerouslySetInnerHTML={{ 
              __html: `${getHighlight('firstName')} ${getHighlight('lastName')}` 
            }}
          />
          <span 
            className={styles.hitStatus}
            style={{ backgroundColor: statusColors[hit.status] || '#6B7280' }}
          >
            {formatStatus(hit.status)}
          </span>
        </div>
        
        <div className={styles.hitMeta}>
          {hit.jobTitle && (
            <span 
              className={styles.hitJob}
              dangerouslySetInnerHTML={{ __html: getHighlight('jobTitle') }}
            />
          )}
          {hit.branchName && (
            <span 
              className={styles.hitBranch}
              dangerouslySetInnerHTML={{ __html: `📍 ${getHighlight('branchName')}` }}
            />
          )}
        </div>
        
        <div className={styles.hitContact}>
          <span 
            dangerouslySetInnerHTML={{ __html: `✉️ ${getHighlight('email')}` }}
          />
          {hit.phone && (
            <span 
              dangerouslySetInnerHTML={{ __html: `📞 ${getHighlight('phone')}` }}
            />
          )}
        </div>

        {/* CV snippet if search matched CV content */}
        {hit._highlightResult?.cvText?.matchLevel === 'full' && (
          <div 
            className={styles.hitCvSnippet}
            dangerouslySetInnerHTML={{ 
              __html: `📄 ...${hit._highlightResult.cvText.value.substring(0, 200)}...` 
            }}
          />
        )}

        {/* Skills */}
        {hit.skills && hit.skills.length > 0 && (
          <div className={styles.hitSkills}>
            {hit.skills.slice(0, 5).map((skill, i) => (
              <span key={i} className={styles.skillTag}>{skill}</span>
            ))}
            {hit.skills.length > 5 && (
              <span className={styles.skillMore}>+{hit.skills.length - 5}</span>
            )}
          </div>
        )}
      </div>

      <div className={styles.hitActions}>
        <span className={styles.hitCV}>
          {hit.hasCV ? '📎 CV' : ''}
        </span>
        <span className={styles.hitArrow}>→</span>
      </div>
    </button>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function formatStatus(status: string): string {
  const labels: Record<string, string> = {
    new: 'New',
    screening: 'Screening',
    interview_scheduled: 'Interview Scheduled',
    interview_complete: 'Interview Complete',
    trial_scheduled: 'Trial Scheduled',
    trial_complete: 'Trial Complete',
    approved: 'Approved',
    rejected: 'Rejected',
    withdrawn: 'Withdrawn'
  };
  return labels[status] || status;
}

export default AlgoliaSearch;
