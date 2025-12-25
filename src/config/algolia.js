import algoliasearch from 'algoliasearch/lite';

// Algolia configuration from environment
export const ALGOLIA_APP_ID = import.meta.env.VITE_ALGOLIA_APP_ID;
export const ALGOLIA_SEARCH_KEY = import.meta.env.VITE_ALGOLIA_SEARCH_KEY;
export const ALGOLIA_INDEX_NAME = 'allied_candidates';

// Initialize Algolia client (search-only)
export const searchClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);

// Index names
export const INDEX_NAMES = {
  CANDIDATES: 'allied_candidates',
  CANDIDATES_CREATED_DESC: 'allied_candidates_created_desc',
  CANDIDATES_EXPERIENCE_DESC: 'allied_candidates_experience_desc',
  CANDIDATES_EXPERIENCE_ASC: 'allied_candidates_experience_asc',
  CANDIDATES_NAME_ASC: 'allied_candidates_name_asc',
  CANDIDATES_NAME_DESC: 'allied_candidates_name_desc'
};

// Get index
export const getCandidatesIndex = (sortKey = 'relevance') => {
  const indexMap = {
    relevance: INDEX_NAMES.CANDIDATES,
    recent: INDEX_NAMES.CANDIDATES_CREATED_DESC,
    experience_desc: INDEX_NAMES.CANDIDATES_EXPERIENCE_DESC,
    experience_asc: INDEX_NAMES.CANDIDATES_EXPERIENCE_ASC,
    name_asc: INDEX_NAMES.CANDIDATES_NAME_ASC,
    name_desc: INDEX_NAMES.CANDIDATES_NAME_DESC
  };
  return searchClient.initIndex(indexMap[sortKey] || INDEX_NAMES.CANDIDATES);
};

export default searchClient;
