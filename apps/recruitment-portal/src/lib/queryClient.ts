// ============================================================================
// Allied Recruitment Portal - React Query Configuration (R11.1)
// Location: apps/recruitment-portal/src/lib/queryClient.ts
// ============================================================================

import { QueryClient } from '@tanstack/react-query'

// Create a client with optimized defaults for recruitment portal
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 2 minutes
      staleTime: 2 * 60 * 1000,
      
      // Cache data for 10 minutes after component unmounts
      gcTime: 10 * 60 * 1000,
      
      // Retry failed requests up to 2 times
      retry: 2,
      
      // Don't refetch on window focus for most data (it doesn't change that fast)
      refetchOnWindowFocus: false,
      
      // Refetch on reconnect
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
    },
  },
})

// Query key factory for consistent cache keys
export const queryKeys = {
  // Candidates
  candidates: {
    all: ['candidates'] as const,
    list: (filters?: Record<string, unknown>) => ['candidates', 'list', filters] as const,
    detail: (id: string) => ['candidates', 'detail', id] as const,
    search: (term: string) => ['candidates', 'search', term] as const,
  },
  
  // Jobs
  jobs: {
    all: ['jobs'] as const,
    list: (filters?: Record<string, unknown>) => ['jobs', 'list', filters] as const,
    detail: (id: string) => ['jobs', 'detail', id] as const,
    active: () => ['jobs', 'active'] as const,
  },
  
  // Branches
  branches: {
    all: ['branches'] as const,
    list: (filters?: Record<string, unknown>) => ['branches', 'list', filters] as const,
    detail: (id: string) => ['branches', 'detail', id] as const,
    active: () => ['branches', 'active'] as const,
  },
  
  // Interviews
  interviews: {
    all: ['interviews'] as const,
    list: (filters?: Record<string, unknown>) => ['interviews', 'list', filters] as const,
    detail: (id: string) => ['interviews', 'detail', id] as const,
    byCandidate: (candidateId: string) => ['interviews', 'candidate', candidateId] as const,
    upcoming: () => ['interviews', 'upcoming'] as const,
    pending: () => ['interviews', 'pending'] as const,
  },
  
  // Feedback
  feedback: {
    all: ['feedback'] as const,
    byCandidate: (candidateId: string) => ['feedback', 'candidate', candidateId] as const,
    byInterview: (interviewId: string) => ['feedback', 'interview', interviewId] as const,
    pending: () => ['feedback', 'pending'] as const,
  },
  
  // Users
  users: {
    all: ['users'] as const,
    list: (filters?: Record<string, unknown>) => ['users', 'list', filters] as const,
    detail: (id: string) => ['users', 'detail', id] as const,
  },
  
  // Dashboard stats
  dashboard: {
    stats: () => ['dashboard', 'stats'] as const,
    recentActivity: () => ['dashboard', 'recentActivity'] as const,
  },
  
  // Settings
  settings: {
    all: ['settings'] as const,
    templates: () => ['settings', 'templates'] as const,
    availability: () => ['settings', 'availability'] as const,
  },
}

// Helper to invalidate related queries after mutations
export const invalidateRelatedQueries = async (
  client: QueryClient,
  type: 'candidate' | 'job' | 'interview' | 'branch' | 'user' | 'feedback'
) => {
  switch (type) {
    case 'candidate':
      await client.invalidateQueries({ queryKey: queryKeys.candidates.all })
      await client.invalidateQueries({ queryKey: queryKeys.dashboard.stats() })
      break
    case 'job':
      await client.invalidateQueries({ queryKey: queryKeys.jobs.all })
      await client.invalidateQueries({ queryKey: queryKeys.dashboard.stats() })
      break
    case 'interview':
      await client.invalidateQueries({ queryKey: queryKeys.interviews.all })
      await client.invalidateQueries({ queryKey: queryKeys.dashboard.stats() })
      break
    case 'branch':
      await client.invalidateQueries({ queryKey: queryKeys.branches.all })
      break
    case 'user':
      await client.invalidateQueries({ queryKey: queryKeys.users.all })
      break
    case 'feedback':
      await client.invalidateQueries({ queryKey: queryKeys.feedback.all })
      await client.invalidateQueries({ queryKey: queryKeys.interviews.all })
      break
  }
}
