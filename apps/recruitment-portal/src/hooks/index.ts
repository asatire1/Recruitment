// ============================================================================
// Allied Recruitment Portal - R11 Hooks Index
// Location: apps/recruitment-portal/src/hooks/index.ts
// ============================================================================

// R11.1 - React Query hooks
export * from './useQueries'

// R11.5 - Keyboard shortcuts
export * from './useKeyboardShortcuts'

// Re-export query client utilities
export { queryClient, queryKeys, invalidateRelatedQueries } from '../lib/queryClient'
