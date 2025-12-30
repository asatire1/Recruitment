/**
 * Interview Utilities
 * 
 * Helper functions for managing interviews and trials.
 * Part of R6.6 - Interview data model
 */

import { 
  collection, 
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query, 
  where, 
  orderBy,
  Timestamp,
  serverTimestamp,
  type Firestore
} from 'firebase/firestore'

import type { 
  Interview, 
  CreateInterviewInput, 
  UpdateInterviewInput,
  InterviewStatus,
  InterviewType,
  FeedbackRecommendation
} from '../types'

// ============================================================================
// Constants
// ============================================================================

export const INTERVIEW_COLLECTION = 'interviews'

export const INTERVIEW_STATUS_LABELS: Record<InterviewStatus, string> = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
}

export const INTERVIEW_STATUS_COLORS: Record<InterviewStatus, string> = {
  scheduled: '#3b82f6',  // Blue
  completed: '#10b981',  // Green
  cancelled: '#ef4444',  // Red
  no_show: '#f59e0b',    // Yellow
}

export const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
  interview: 'Interview',
  trial: 'Trial Shift',
}

export const INTERVIEW_TYPE_COLORS: Record<InterviewType, string> = {
  interview: '#3b82f6',  // Blue
  trial: '#8b5cf6',      // Purple
}

export const FEEDBACK_LABELS: Record<FeedbackRecommendation, string> = {
  hire: 'Recommend Hire',
  maybe: 'Maybe / Need More Info',
  do_not_hire: 'Do Not Hire',
}

export const FEEDBACK_COLORS: Record<FeedbackRecommendation, string> = {
  hire: '#10b981',
  maybe: '#f59e0b',
  do_not_hire: '#ef4444',
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Create a new interview
 */
export async function createInterview(
  db: Firestore,
  data: CreateInterviewInput
): Promise<Interview> {
  const interviewData = {
    ...data,
    status: data.status || 'scheduled',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  
  const docRef = await addDoc(collection(db, INTERVIEW_COLLECTION), interviewData)
  
  return {
    id: docRef.id,
    ...data,
    status: data.status || 'scheduled',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  } as Interview
}

/**
 * Get an interview by ID
 */
export async function getInterview(
  db: Firestore,
  interviewId: string
): Promise<Interview | null> {
  const docRef = doc(db, INTERVIEW_COLLECTION, interviewId)
  const docSnap = await getDoc(docRef)
  
  if (!docSnap.exists()) {
    return null
  }
  
  return {
    id: docSnap.id,
    ...docSnap.data()
  } as Interview
}

/**
 * Update an interview
 */
export async function updateInterview(
  db: Firestore,
  interviewId: string,
  data: UpdateInterviewInput
): Promise<void> {
  const docRef = doc(db, INTERVIEW_COLLECTION, interviewId)
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

/**
 * Delete an interview
 */
export async function deleteInterview(
  db: Firestore,
  interviewId: string
): Promise<void> {
  const docRef = doc(db, INTERVIEW_COLLECTION, interviewId)
  await deleteDoc(docRef)
}

/**
 * Cancel an interview
 */
export async function cancelInterview(
  db: Firestore,
  interviewId: string,
  userId: string,
  reason?: string
): Promise<void> {
  await updateInterview(db, interviewId, {
    status: 'cancelled',
    cancelledAt: Timestamp.now(),
    cancelledBy: userId,
    cancellationReason: reason,
  })
}

/**
 * Mark interview as completed
 */
export async function completeInterview(
  db: Firestore,
  interviewId: string
): Promise<void> {
  await updateInterview(db, interviewId, {
    status: 'completed',
  })
}

/**
 * Mark interview as no-show
 */
export async function markNoShow(
  db: Firestore,
  interviewId: string
): Promise<void> {
  await updateInterview(db, interviewId, {
    status: 'no_show',
  })
}

/**
 * Reschedule an interview
 */
export async function rescheduleInterview(
  db: Firestore,
  interviewId: string,
  newDateTime: Date,
  newDuration?: number
): Promise<void> {
  const interview = await getInterview(db, interviewId)
  if (!interview) {
    throw new Error('Interview not found')
  }
  
  const updateData: UpdateInterviewInput = {
    scheduledAt: Timestamp.fromDate(newDateTime),
    rescheduledFrom: interview.scheduledAt,
    rescheduledCount: (interview.rescheduledCount || 0) + 1,
  }
  
  if (newDuration) {
    updateData.duration = newDuration
  }
  
  // Calculate new end time
  const endTime = new Date(newDateTime.getTime() + (newDuration || interview.duration) * 60000)
  updateData.scheduledEndAt = Timestamp.fromDate(endTime)
  
  await updateInterview(db, interviewId, updateData)
}

/**
 * Submit feedback for an interview
 */
export async function submitFeedback(
  db: Firestore,
  interviewId: string,
  feedback: {
    rating: number
    recommendation: FeedbackRecommendation
    strengths?: string
    weaknesses?: string
    comments?: string
  },
  userId: string
): Promise<void> {
  await updateInterview(db, interviewId, {
    status: 'completed',
    feedback: {
      ...feedback,
      submittedAt: Timestamp.now(),
      submittedBy: userId,
    },
  })
}

// ============================================================================
// Query Operations
// ============================================================================

/**
 * Get all interviews for a candidate
 */
export async function getInterviewsByCandidate(
  db: Firestore,
  candidateId: string
): Promise<Interview[]> {
  const q = query(
    collection(db, INTERVIEW_COLLECTION),
    where('candidateId', '==', candidateId),
    orderBy('scheduledAt', 'desc')
  )
  
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Interview[]
}

/**
 * Get interviews for a date range
 */
export async function getInterviewsByDateRange(
  db: Firestore,
  startDate: Date,
  endDate: Date,
  filters?: {
    branchId?: string
    type?: InterviewType
    status?: InterviewStatus
  }
): Promise<Interview[]> {
  let q = query(
    collection(db, INTERVIEW_COLLECTION),
    where('scheduledAt', '>=', Timestamp.fromDate(startDate)),
    where('scheduledAt', '<=', Timestamp.fromDate(endDate)),
    orderBy('scheduledAt', 'asc')
  )
  
  // Note: Firestore requires compound indexes for multiple where clauses
  // Additional filtering done client-side for simplicity
  
  const snapshot = await getDocs(q)
  let interviews = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Interview[]
  
  // Client-side filtering
  if (filters?.branchId) {
    interviews = interviews.filter(i => i.branchId === filters.branchId)
  }
  if (filters?.type) {
    interviews = interviews.filter(i => i.type === filters.type)
  }
  if (filters?.status) {
    interviews = interviews.filter(i => i.status === filters.status)
  }
  
  return interviews
}

/**
 * Get upcoming interviews (next N days)
 */
export async function getUpcomingInterviews(
  db: Firestore,
  days: number = 7
): Promise<Interview[]> {
  const now = new Date()
  const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
  
  return getInterviewsByDateRange(db, now, endDate, { status: 'scheduled' })
}

/**
 * Get interviews for a specific day
 */
export async function getInterviewsForDay(
  db: Firestore,
  date: Date
): Promise<Interview[]> {
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)
  
  return getInterviewsByDateRange(db, startOfDay, endOfDay)
}

/**
 * Get interviews pending feedback
 */
export async function getInterviewsPendingFeedback(
  db: Firestore
): Promise<Interview[]> {
  const q = query(
    collection(db, INTERVIEW_COLLECTION),
    where('status', '==', 'completed'),
    orderBy('scheduledAt', 'desc')
  )
  
  const snapshot = await getDocs(q)
  const interviews = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Interview[]
  
  // Filter those without feedback
  return interviews.filter(i => !i.feedback)
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format interview time for display
 */
export function formatInterviewTime(scheduledAt: Timestamp): string {
  const date = scheduledAt.toDate()
  return date.toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Format interview duration for display
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`
  }
  return `${hours}h ${mins}m`
}

/**
 * Check if interview is in the past
 */
export function isInterviewPast(scheduledAt: Timestamp): boolean {
  return scheduledAt.toDate() < new Date()
}

/**
 * Check if interview is today
 */
export function isInterviewToday(scheduledAt: Timestamp): boolean {
  const today = new Date()
  const interviewDate = scheduledAt.toDate()
  return (
    interviewDate.getDate() === today.getDate() &&
    interviewDate.getMonth() === today.getMonth() &&
    interviewDate.getFullYear() === today.getFullYear()
  )
}

/**
 * Get time until interview
 */
export function getTimeUntilInterview(scheduledAt: Timestamp): string {
  const now = new Date()
  const interviewTime = scheduledAt.toDate()
  const diffMs = interviewTime.getTime() - now.getTime()
  
  if (diffMs < 0) {
    return 'Past'
  }
  
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  
  if (diffMins < 60) {
    return `in ${diffMins} min`
  }
  if (diffHours < 24) {
    return `in ${diffHours} hour${diffHours > 1 ? 's' : ''}`
  }
  return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`
}

/**
 * Generate calendar event data from interview
 */
export function generateCalendarEvent(interview: Interview): {
  title: string
  start: Date
  end: Date
  description: string
  location?: string
} {
  const start = interview.scheduledAt.toDate()
  const end = new Date(start.getTime() + interview.duration * 60000)
  
  const typeLabel = INTERVIEW_TYPE_LABELS[interview.type]
  
  return {
    title: `${typeLabel}: ${interview.candidateName}`,
    start,
    end,
    description: [
      `Candidate: ${interview.candidateName}`,
      interview.jobTitle ? `Position: ${interview.jobTitle}` : null,
      interview.notes ? `Notes: ${interview.notes}` : null,
    ].filter(Boolean).join('\n'),
    location: interview.location || interview.branchName,
  }
}
