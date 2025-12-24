import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Configure React Query client with sensible defaults for recruitment data
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data stays fresh for 2 minutes (recruitment data changes moderately)
      staleTime: 2 * 60 * 1000,
      // Cache data for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry failed requests 2 times
      retry: 2,
      // Don't refetch on window focus for smoother UX
      refetchOnWindowFocus: false,
      // Keep showing stale data while fetching new
      placeholderData: (previousData) => previousData,
    },
    mutations: {
      // Retry mutations once
      retry: 1,
    },
  },
});

/**
 * Query key factory for consistent cache keys
 */
export const queryKeys = {
  // Candidates
  candidates: {
    all: ['candidates'],
    list: (filters) => ['candidates', 'list', filters],
    detail: (id) => ['candidates', 'detail', id],
    stats: () => ['candidates', 'stats'],
  },
  // Jobs
  jobs: {
    all: ['jobs'],
    list: (filters) => ['jobs', 'list', filters],
    detail: (id) => ['jobs', 'detail', id],
    stats: () => ['jobs', 'stats'],
  },
  // Interviews
  interviews: {
    all: ['interviews'],
    upcoming: (limit) => ['interviews', 'upcoming', limit],
    today: () => ['interviews', 'today'],
    forCandidate: (candidateId) => ['interviews', 'candidate', candidateId],
  },
  // Dashboard
  dashboard: {
    stats: () => ['dashboard', 'stats'],
    recentCandidates: (limit) => ['dashboard', 'recentCandidates', limit],
    recentActivity: (limit) => ['dashboard', 'recentActivity', limit],
  },
};

/**
 * Invalidate related queries after mutations
 */
export const invalidateQueries = {
  // After candidate changes, invalidate candidate lists and dashboard
  candidates: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.candidates.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats() });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.recentCandidates(5) });
  },
  // After job changes, invalidate job lists and dashboard
  jobs: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats() });
  },
  // After interview changes
  interviews: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.interviews.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats() });
  },
};

/**
 * Get the query client instance (for manual operations)
 */
export function getQueryClient() {
  return queryClient;
}

/**
 * QueryProvider component to wrap the app
 */
export function QueryProvider({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

export default QueryProvider;
