// ============================================================================
// Allied Recruitment Portal - React Query Hooks (R11.1)
// Location: apps/recruitment-portal/src/hooks/useQueries.ts
// ============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  orderBy,
  where,
  limit,
  updateDoc,
  addDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { getFirebaseDb } from '@allied/shared-lib'
import type { Candidate, Job, Branch, Interview, User } from '@allied/shared-lib'
import { queryKeys, invalidateRelatedQueries } from '../lib/queryClient'

// ============================================================================
// CANDIDATES HOOKS
// ============================================================================

export interface CandidateFilters {
  status?: string
  branchId?: string
  jobId?: string
  search?: string
}

export function useCandidates(filters?: CandidateFilters) {
  return useQuery({
    queryKey: queryKeys.candidates.list(filters),
    queryFn: async () => {
      const db = getFirebaseDb()
      const candidatesRef = collection(db, 'candidates')
      
      let q = query(candidatesRef, orderBy('createdAt', 'desc'), limit(500))
      
      // Note: Complex filtering is done client-side for flexibility
      // For production, consider using Algolia for search
      
      const snapshot = await getDocs(q)
      let candidates = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Candidate[]
      
      // Client-side filtering
      if (filters?.status && filters.status !== 'all') {
        candidates = candidates.filter(c => c.status === filters.status)
      }
      if (filters?.branchId) {
        candidates = candidates.filter(c => c.branchId === filters.branchId)
      }
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase()
        candidates = candidates.filter(c => 
          c.firstName?.toLowerCase().includes(searchLower) ||
          c.lastName?.toLowerCase().includes(searchLower) ||
          c.email?.toLowerCase().includes(searchLower)
        )
      }
      
      return candidates
    },
    staleTime: 60 * 1000, // 1 minute for candidates list
  })
}

export function useCandidate(id: string) {
  return useQuery({
    queryKey: queryKeys.candidates.detail(id),
    queryFn: async () => {
      const db = getFirebaseDb()
      const docRef = doc(db, 'candidates', id)
      const snapshot = await getDoc(docRef)
      
      if (!snapshot.exists()) {
        throw new Error('Candidate not found')
      }
      
      return { id: snapshot.id, ...snapshot.data() } as Candidate
    },
    enabled: !!id,
  })
}

export function useUpdateCandidate() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Candidate> }) => {
      const db = getFirebaseDb()
      const docRef = doc(db, 'candidates', id)
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
      })
      return { id, ...data }
    },
    onSuccess: (data) => {
      // Update the specific candidate in cache
      queryClient.setQueryData(queryKeys.candidates.detail(data.id), (old: Candidate | undefined) => 
        old ? { ...old, ...data } : old
      )
      // Invalidate lists to refetch
      invalidateRelatedQueries(queryClient, 'candidate')
    },
  })
}

// ============================================================================
// JOBS HOOKS
// ============================================================================

export interface JobFilters {
  status?: string
  branchId?: string
  entity?: string
}

export function useJobs(filters?: JobFilters) {
  return useQuery({
    queryKey: queryKeys.jobs.list(filters),
    queryFn: async () => {
      const db = getFirebaseDb()
      const jobsRef = collection(db, 'jobs')
      
      let q = query(jobsRef, orderBy('createdAt', 'desc'))
      
      const snapshot = await getDocs(q)
      let jobs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Job[]
      
      // Client-side filtering
      if (filters?.status && filters.status !== 'all') {
        jobs = jobs.filter(j => j.status === filters.status)
      }
      if (filters?.branchId) {
        jobs = jobs.filter(j => j.branchId === filters.branchId)
      }
      
      return jobs
    },
    staleTime: 2 * 60 * 1000, // 2 minutes for jobs
  })
}

export function useActiveJobs() {
  return useQuery({
    queryKey: queryKeys.jobs.active(),
    queryFn: async () => {
      const db = getFirebaseDb()
      const jobsRef = collection(db, 'jobs')
      const q = query(jobsRef, where('status', '==', 'open'), orderBy('title'))
      
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Job[]
    },
    staleTime: 5 * 60 * 1000, // 5 minutes for active jobs dropdown
  })
}

export function useJob(id: string) {
  return useQuery({
    queryKey: queryKeys.jobs.detail(id),
    queryFn: async () => {
      const db = getFirebaseDb()
      const docRef = doc(db, 'jobs', id)
      const snapshot = await getDoc(docRef)
      
      if (!snapshot.exists()) {
        throw new Error('Job not found')
      }
      
      return { id: snapshot.id, ...snapshot.data() } as Job
    },
    enabled: !!id,
  })
}

// ============================================================================
// BRANCHES HOOKS
// ============================================================================

export interface BranchFilters {
  entity?: string
  active?: boolean
}

export function useBranches(filters?: BranchFilters) {
  return useQuery({
    queryKey: queryKeys.branches.list(filters),
    queryFn: async () => {
      const db = getFirebaseDb()
      const branchesRef = collection(db, 'branches')
      
      let q = query(branchesRef, orderBy('name'))
      
      const snapshot = await getDocs(q)
      let branches = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Branch[]
      
      // Client-side filtering
      if (filters?.entity && filters.entity !== 'all') {
        branches = branches.filter(b => b.entity === filters.entity)
      }
      if (filters?.active !== undefined) {
        branches = branches.filter(b => b.active === filters.active)
      }
      
      return branches
    },
    staleTime: 5 * 60 * 1000, // 5 minutes for branches
  })
}

export function useActiveBranches() {
  return useQuery({
    queryKey: queryKeys.branches.active(),
    queryFn: async () => {
      const db = getFirebaseDb()
      const branchesRef = collection(db, 'branches')
      const q = query(branchesRef, where('active', '==', true), orderBy('name'))
      
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Branch[]
    },
    staleTime: 10 * 60 * 1000, // 10 minutes for active branches dropdown
  })
}

// ============================================================================
// INTERVIEWS HOOKS
// ============================================================================

export interface InterviewFilters {
  type?: string
  status?: string
  dateRange?: 'all' | 'today' | 'week' | 'month' | 'past'
}

export function useInterviews(filters?: InterviewFilters) {
  return useQuery({
    queryKey: queryKeys.interviews.list(filters),
    queryFn: async () => {
      const db = getFirebaseDb()
      const interviewsRef = collection(db, 'interviews')
      
      const q = query(interviewsRef, orderBy('scheduledAt', 'desc'), limit(500))
      
      const snapshot = await getDocs(q)
      let interviews = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Interview[]
      
      // Client-side filtering
      if (filters?.type && filters.type !== 'all') {
        interviews = interviews.filter(i => i.type === filters.type)
      }
      if (filters?.status && filters.status !== 'all') {
        interviews = interviews.filter(i => i.status === filters.status)
      }
      
      return interviews
    },
    staleTime: 60 * 1000, // 1 minute for interviews
  })
}

export function useUpcomingInterviews(days: number = 7) {
  return useQuery({
    queryKey: queryKeys.interviews.upcoming(),
    queryFn: async () => {
      const db = getFirebaseDb()
      const interviewsRef = collection(db, 'interviews')
      
      const now = new Date()
      const future = new Date()
      future.setDate(future.getDate() + days)
      
      const q = query(
        interviewsRef,
        where('scheduledAt', '>=', Timestamp.fromDate(now)),
        where('scheduledAt', '<=', Timestamp.fromDate(future)),
        where('status', '==', 'scheduled'),
        orderBy('scheduledAt', 'asc'),
        limit(20)
      )
      
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Interview[]
    },
    staleTime: 60 * 1000, // 1 minute
  })
}

export function useCandidateInterviews(candidateId: string) {
  return useQuery({
    queryKey: queryKeys.interviews.byCandidate(candidateId),
    queryFn: async () => {
      const db = getFirebaseDb()
      const interviewsRef = collection(db, 'interviews')
      
      const q = query(
        interviewsRef,
        where('candidateId', '==', candidateId),
        orderBy('scheduledAt', 'desc')
      )
      
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Interview[]
    },
    enabled: !!candidateId,
  })
}

// ============================================================================
// FEEDBACK HOOKS
// ============================================================================

export function usePendingFeedback() {
  return useQuery({
    queryKey: queryKeys.feedback.pending(),
    queryFn: async () => {
      const db = getFirebaseDb()
      
      // Get completed interviews from last 30 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      const interviewsRef = collection(db, 'interviews')
      const q = query(
        interviewsRef,
        where('status', '==', 'completed'),
        where('scheduledAt', '>=', Timestamp.fromDate(thirtyDaysAgo)),
        orderBy('scheduledAt', 'desc')
      )
      
      const snapshot = await getDocs(q)
      const interviews = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Interview[]
      
      // Filter to those without feedback
      return interviews.filter(i => !i.feedback?.submittedAt)
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

export function useCandidateFeedback(candidateId: string) {
  return useQuery({
    queryKey: queryKeys.feedback.byCandidate(candidateId),
    queryFn: async () => {
      const db = getFirebaseDb()
      const feedbackRef = collection(db, 'interviewFeedback')
      
      const q = query(
        feedbackRef,
        where('candidateId', '==', candidateId),
        where('status', 'in', ['submitted', 'reviewed']),
        orderBy('submittedAt', 'desc')
      )
      
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    },
    enabled: !!candidateId,
  })
}

// ============================================================================
// USERS HOOKS
// ============================================================================

export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users.all,
    queryFn: async () => {
      const db = getFirebaseDb()
      const usersRef = collection(db, 'users')
      const q = query(usersRef, orderBy('displayName'))
      
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[]
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// ============================================================================
// DASHBOARD HOOKS
// ============================================================================

export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: async () => {
      const db = getFirebaseDb()
      
      // Fetch counts in parallel
      const [candidatesSnap, jobsSnap, interviewsSnap] = await Promise.all([
        getDocs(query(collection(db, 'candidates'), where('status', 'in', ['new', 'screening', 'interview_scheduled']))),
        getDocs(query(collection(db, 'jobs'), where('status', '==', 'open'))),
        getDocs(query(
          collection(db, 'interviews'),
          where('status', '==', 'scheduled'),
          where('scheduledAt', '>=', Timestamp.now())
        )),
      ])
      
      return {
        activeCandidates: candidatesSnap.size,
        openJobs: jobsSnap.size,
        upcomingInterviews: interviewsSnap.size,
      }
    },
    staleTime: 60 * 1000, // 1 minute
  })
}

// ============================================================================
// PREFETCH HELPERS
// ============================================================================

export function usePrefetchCandidate() {
  const queryClient = useQueryClient()
  
  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.candidates.detail(id),
      queryFn: async () => {
        const db = getFirebaseDb()
        const docRef = doc(db, 'candidates', id)
        const snapshot = await getDoc(docRef)
        return { id: snapshot.id, ...snapshot.data() } as Candidate
      },
      staleTime: 60 * 1000,
    })
  }
}

export function usePrefetchJob() {
  const queryClient = useQueryClient()
  
  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.jobs.detail(id),
      queryFn: async () => {
        const db = getFirebaseDb()
        const docRef = doc(db, 'jobs', id)
        const snapshot = await getDoc(docRef)
        return { id: snapshot.id, ...snapshot.data() } as Job
      },
      staleTime: 2 * 60 * 1000,
    })
  }
}
