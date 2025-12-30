import { useState, useEffect, useCallback } from 'react'
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore'
import { getFirebaseDb, COLLECTIONS } from '@allied/shared-lib'
import type { Interview, FeedbackRecommendation } from '@allied/shared-lib'
import { useAuth } from '../contexts/AuthContext'

// ============================================================================
// TYPES
// ============================================================================

export interface FeedbackRatings {
  punctuality: number        // 1-5: Arrived on time, ready to work
  attitude: number           // 1-5: Professional attitude, enthusiasm
  teamwork: number           // 1-5: Works well with team, communication
  skillsKnowledge: number    // 1-5: Technical skills, pharmacy knowledge
  customerService: number    // 1-5: Patient interaction, customer focus
}

export interface FeedbackFormData {
  ratings: FeedbackRatings
  recommendation: FeedbackRecommendation | null
  strengths: string
  areasForImprovement: string
  additionalComments: string
}

export interface PendingFeedbackItem {
  id: string
  candidateId: string
  candidateName: string
  jobTitle?: string
  branchId?: string
  branchName?: string
  type: 'interview' | 'trial'
  scheduledAt: Date
  completedAt?: Date
  daysOverdue: number
  isOverdue: boolean
}

export interface SubmittedFeedbackItem extends PendingFeedbackItem {
  feedback: {
    rating: number
    recommendation: FeedbackRecommendation
    strengths?: string
    weaknesses?: string
    comments?: string
    submittedAt: Date
    submittedBy: string
  }
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const RATING_CATEGORIES = [
  {
    key: 'punctuality' as keyof FeedbackRatings,
    label: 'Punctuality',
    description: 'Arrived on time and ready to work',
  },
  {
    key: 'attitude' as keyof FeedbackRatings,
    label: 'Attitude',
    description: 'Professional demeanor and enthusiasm',
  },
  {
    key: 'teamwork' as keyof FeedbackRatings,
    label: 'Teamwork',
    description: 'Works well with colleagues, good communication',
  },
  {
    key: 'skillsKnowledge' as keyof FeedbackRatings,
    label: 'Skills & Knowledge',
    description: 'Technical competency and pharmacy knowledge',
  },
  {
    key: 'customerService' as keyof FeedbackRatings,
    label: 'Customer Service',
    description: 'Patient interaction and customer focus',
  },
]

export const RECOMMENDATION_OPTIONS: { value: FeedbackRecommendation; label: string; description: string }[] = [
  {
    value: 'hire',
    label: 'Hire',
    description: 'Recommend proceeding with offer',
  },
  {
    value: 'maybe',
    label: 'Maybe',
    description: 'Has potential, needs further review',
  },
  {
    value: 'do_not_hire',
    label: 'Do Not Hire',
    description: 'Not suitable for the role',
  },
]

export const OVERDUE_DAYS_THRESHOLD = 3 // Days after trial before considered overdue

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateDaysOverdue(scheduledAt: Date): number {
  const now = new Date()
  const diffTime = now.getTime() - scheduledAt.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  return Math.max(0, diffDays)
}

function calculateOverallRating(ratings: FeedbackRatings): number {
  const values = Object.values(ratings)
  if (values.length === 0) return 0
  const sum = values.reduce((acc, val) => acc + val, 0)
  return Math.round((sum / values.length) * 10) / 10 // Round to 1 decimal
}

// ============================================================================
// HOOK: usePendingFeedback
// ============================================================================

export function usePendingFeedback() {
  const { user } = useAuth()
  const [pending, setPending] = useState<PendingFeedbackItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setPending([])
      setLoading(false)
      return
    }

    const db = getFirebaseDb()
    const branchIds = user.branchIds || []

    if (branchIds.length === 0 && user.role === 'branch_manager') {
      setPending([])
      setLoading(false)
      return
    }

    // Query for completed trials without feedback
    let q
    if (user.role === 'branch_manager' && branchIds.length > 0) {
      q = query(
        collection(db, COLLECTIONS.INTERVIEWS),
        where('branchId', 'in', branchIds.slice(0, 10)),
        where('type', '==', 'trial'),
        where('status', '==', 'completed'),
        orderBy('scheduledAt', 'desc')
      )
    } else {
      // For admins/recruiters - show all pending
      q = query(
        collection(db, COLLECTIONS.INTERVIEWS),
        where('type', '==', 'trial'),
        where('status', '==', 'completed'),
        orderBy('scheduledAt', 'desc')
      )
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: PendingFeedbackItem[] = []
        snapshot.forEach((doc) => {
          const data = doc.data() as Interview
          // Only include if no feedback submitted
          if (!data.feedback) {
            const scheduledAt = data.scheduledAt?.toDate?.() || new Date(data.scheduledAt as any)
            const daysOverdue = calculateDaysOverdue(scheduledAt)
            items.push({
              id: doc.id,
              candidateId: data.candidateId,
              candidateName: data.candidateName,
              jobTitle: data.jobTitle,
              branchId: data.branchId,
              branchName: data.branchName,
              type: data.type,
              scheduledAt,
              daysOverdue,
              isOverdue: daysOverdue >= OVERDUE_DAYS_THRESHOLD,
            })
          }
        })
        // Sort: overdue first, then by days overdue
        items.sort((a, b) => {
          if (a.isOverdue && !b.isOverdue) return -1
          if (!a.isOverdue && b.isOverdue) return 1
          return b.daysOverdue - a.daysOverdue
        })
        setPending(items)
        setLoading(false)
        setError(null)
      },
      (err) => {
        console.error('Error fetching pending feedback:', err)
        setError('Failed to load pending feedback')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [user])

  return { pending, loading, error }
}

// ============================================================================
// HOOK: useSubmittedFeedback
// ============================================================================

export function useSubmittedFeedback() {
  const { user } = useAuth()
  const [submitted, setSubmitted] = useState<SubmittedFeedbackItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setSubmitted([])
      setLoading(false)
      return
    }

    const db = getFirebaseDb()
    const branchIds = user.branchIds || []

    if (branchIds.length === 0 && user.role === 'branch_manager') {
      setSubmitted([])
      setLoading(false)
      return
    }

    // Query for trials with feedback
    let q
    if (user.role === 'branch_manager' && branchIds.length > 0) {
      q = query(
        collection(db, COLLECTIONS.INTERVIEWS),
        where('branchId', 'in', branchIds.slice(0, 10)),
        where('type', '==', 'trial'),
        where('status', '==', 'completed'),
        orderBy('scheduledAt', 'desc')
      )
    } else {
      q = query(
        collection(db, COLLECTIONS.INTERVIEWS),
        where('type', '==', 'trial'),
        where('status', '==', 'completed'),
        orderBy('scheduledAt', 'desc')
      )
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: SubmittedFeedbackItem[] = []
        snapshot.forEach((doc) => {
          const data = doc.data() as Interview
          // Only include if feedback exists
          if (data.feedback) {
            const scheduledAt = data.scheduledAt?.toDate?.() || new Date(data.scheduledAt as any)
            items.push({
              id: doc.id,
              candidateId: data.candidateId,
              candidateName: data.candidateName,
              jobTitle: data.jobTitle,
              branchId: data.branchId,
              branchName: data.branchName,
              type: data.type,
              scheduledAt,
              daysOverdue: 0,
              isOverdue: false,
              feedback: {
                rating: data.feedback.rating,
                recommendation: data.feedback.recommendation,
                strengths: data.feedback.strengths,
                weaknesses: data.feedback.weaknesses,
                comments: data.feedback.comments,
                submittedAt: data.feedback.submittedAt?.toDate?.() || new Date(),
                submittedBy: data.feedback.submittedBy,
              },
            })
          }
        })
        setSubmitted(items)
        setLoading(false)
        setError(null)
      },
      (err) => {
        console.error('Error fetching submitted feedback:', err)
        setError('Failed to load feedback history')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [user])

  return { submitted, loading, error }
}

// ============================================================================
// HOOK: useFeedbackSubmit
// ============================================================================

export function useFeedbackSubmit() {
  const { user } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submitFeedback = useCallback(
    async (interviewId: string, formData: FeedbackFormData): Promise<boolean> => {
      if (!user) {
        setError('You must be logged in to submit feedback')
        return false
      }

      // Validate form data
      const { ratings, recommendation, strengths, areasForImprovement, additionalComments } = formData

      // Check all ratings are provided
      const ratingValues = Object.values(ratings)
      if (ratingValues.some((r) => r === 0)) {
        setError('Please provide all ratings')
        return false
      }

      if (!recommendation) {
        setError('Please select a recommendation')
        return false
      }

      setSubmitting(true)
      setError(null)

      try {
        const db = getFirebaseDb()
        const interviewRef = doc(db, COLLECTIONS.INTERVIEWS, interviewId)

        // Calculate overall rating
        const overallRating = calculateOverallRating(ratings)

        await updateDoc(interviewRef, {
          feedback: {
            rating: overallRating,
            recommendation,
            strengths: strengths.trim() || null,
            weaknesses: areasForImprovement.trim() || null,
            comments: additionalComments.trim() || null,
            // Store detailed ratings in comments for now
            // In production, you'd add a detailedRatings field
            submittedAt: serverTimestamp(),
            submittedBy: user.uid,
          },
          updatedAt: serverTimestamp(),
        })

        setSubmitting(false)
        return true
      } catch (err) {
        console.error('Error submitting feedback:', err)
        setError('Failed to submit feedback. Please try again.')
        setSubmitting(false)
        return false
      }
    },
    [user]
  )

  return { submitFeedback, submitting, error, clearError: () => setError(null) }
}

// ============================================================================
// HOOK: useFeedbackDetails
// ============================================================================

export function useFeedbackDetails(interviewId: string | null) {
  const [interview, setInterview] = useState<Interview | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!interviewId) {
      setInterview(null)
      return
    }

    setLoading(true)
    const db = getFirebaseDb()
    const interviewRef = doc(db, COLLECTIONS.INTERVIEWS, interviewId)

    const unsubscribe = onSnapshot(
      interviewRef,
      (doc) => {
        if (doc.exists()) {
          setInterview({ id: doc.id, ...doc.data() } as Interview)
        } else {
          setInterview(null)
          setError('Interview not found')
        }
        setLoading(false)
      },
      (err) => {
        console.error('Error fetching interview:', err)
        setError('Failed to load interview details')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [interviewId])

  return { interview, loading, error }
}

// ============================================================================
// UTILITIES
// ============================================================================

export function getInitialFormData(): FeedbackFormData {
  return {
    ratings: {
      punctuality: 0,
      attitude: 0,
      teamwork: 0,
      skillsKnowledge: 0,
      customerService: 0,
    },
    recommendation: null,
    strengths: '',
    areasForImprovement: '',
    additionalComments: '',
  }
}

export function getRatingLabel(rating: number): string {
  switch (rating) {
    case 1:
      return 'Poor'
    case 2:
      return 'Below Average'
    case 3:
      return 'Average'
    case 4:
      return 'Good'
    case 5:
      return 'Excellent'
    default:
      return 'Not Rated'
  }
}

export function getRecommendationColor(recommendation: FeedbackRecommendation): string {
  switch (recommendation) {
    case 'hire':
      return 'var(--color-success)'
    case 'maybe':
      return 'var(--color-warning)'
    case 'do_not_hire':
      return 'var(--color-error)'
    default:
      return 'var(--color-text-secondary)'
  }
}

export function formatFeedbackDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
