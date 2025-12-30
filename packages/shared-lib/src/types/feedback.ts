// ============================================================================
// Allied Recruitment Portal - Interview Feedback Data Model (R10.1)
// Location: packages/shared-lib/src/types/feedback.ts
// 
// This file defines the data model for the Interview Feedback System:
// - InterviewFeedback: Main feedback document
// - ScorecardTemplate: Configurable criteria per job type
// - FeedbackCriterion: Individual rating criteria
// ============================================================================

import { Timestamp } from 'firebase/firestore'

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

/** Feedback recommendation options */
export type FeedbackRecommendation = 'progress' | 'hold' | 'reject'

/** Feedback status in workflow */
export type FeedbackStatus = 'pending' | 'draft' | 'submitted' | 'reviewed'

/** Interview type for feedback */
export type FeedbackInterviewType = 'phone_screen' | 'video_interview' | 'in_person' | 'technical' | 'trial'

/** Criterion category for grouping */
export type CriterionCategory = 
  | 'communication'
  | 'technical'
  | 'experience'
  | 'cultural_fit'
  | 'motivation'
  | 'pharmacy_specific'
  | 'customer_service'
  | 'general'

/** Rating scale type */
export type RatingScale = '1-5' | '1-10' | 'yes-no' | 'met-not_met'

// ============================================================================
// FEEDBACK CRITERION
// ============================================================================

/**
 * Individual criterion definition for scorecards
 * These are the building blocks of scorecard templates
 */
export interface FeedbackCriterion {
  id: string
  
  /** Display name of the criterion */
  name: string
  
  /** Detailed description / guidance for the interviewer */
  description?: string
  
  /** Category for grouping related criteria */
  category: CriterionCategory
  
  /** Rating scale to use */
  ratingScale: RatingScale
  
  /** Weight for calculating weighted average (0-100, default 100) */
  weight: number
  
  /** Whether this criterion is required */
  required: boolean
  
  /** Order for display */
  sortOrder: number
  
  /** Whether to show text input for notes on this criterion */
  allowNotes: boolean
  
  /** Guidance text shown during rating */
  ratingGuidance?: {
    1?: string  // e.g., "Poor - Does not meet expectations"
    2?: string  // e.g., "Below Average - Some concerns"
    3?: string  // e.g., "Average - Meets basic expectations"
    4?: string  // e.g., "Good - Exceeds expectations"
    5?: string  // e.g., "Excellent - Significantly exceeds"
  }
}

/**
 * A single criterion rating in submitted feedback
 */
export interface CriterionRating {
  criterionId: string
  criterionName: string
  category: CriterionCategory
  rating: number | boolean  // number for scales, boolean for yes/no
  maxRating: number         // e.g., 5 for 1-5 scale
  weight: number
  notes?: string
}

// ============================================================================
// SCORECARD TEMPLATE
// ============================================================================

/**
 * Scorecard template - configurable per job type/category
 * Stored in: scorecardTemplates collection
 */
export interface ScorecardTemplate {
  id: string
  
  /** Template name */
  name: string
  
  /** Description of when to use this template */
  description?: string
  
  /** Interview types this template applies to */
  interviewTypes: FeedbackInterviewType[]
  
  /** Job categories this template applies to (empty = all) */
  jobCategories?: string[]  // e.g., ['clinical', 'dispensary']
  
  /** Specific job title IDs (empty = all in category) */
  jobTitleIds?: string[]
  
  /** The criteria included in this scorecard */
  criteria: FeedbackCriterion[]
  
  /** Whether this is the default template */
  isDefault: boolean
  
  /** Whether this template is active */
  active: boolean
  
  /** Version for tracking changes */
  version: number
  
  /** Minimum overall score to recommend "Progress" */
  progressThreshold?: number  // e.g., 3.5 out of 5
  
  /** Minimum overall score to recommend "Hold" (below = Reject) */
  holdThreshold?: number      // e.g., 2.5 out of 5
  
  // Metadata
  createdAt: Timestamp
  updatedAt: Timestamp
  createdBy: string
  updatedBy?: string
}

// ============================================================================
// INTERVIEW FEEDBACK
// ============================================================================

/**
 * Interview Feedback document
 * Stored in: interviewFeedback collection
 * 
 * This is the main feedback record submitted by recruiters after interviews.
 * It references an interview and contains structured ratings plus free-form notes.
 */
export interface InterviewFeedback {
  id: string
  
  // ============================================
  // References
  // ============================================
  
  /** Interview this feedback is for */
  interviewId: string
  
  /** Candidate being evaluated */
  candidateId: string
  candidateName: string
  candidateEmail?: string
  
  /** Job applied for */
  jobId?: string
  jobTitle?: string
  jobCategory?: string
  
  /** Branch/location */
  branchId?: string
  branchName?: string
  
  // ============================================
  // Interview Context
  // ============================================
  
  /** Type of interview conducted */
  interviewType: FeedbackInterviewType
  
  /** When the interview took place */
  interviewDate: Timestamp
  
  /** Duration of the interview (minutes) */
  interviewDuration?: number
  
  /** Interview format details */
  interviewFormat?: 'in_person' | 'video' | 'phone'
  
  // ============================================
  // Scorecard & Ratings
  // ============================================
  
  /** Scorecard template used */
  scorecardTemplateId?: string
  scorecardTemplateName?: string
  scorecardVersion?: number
  
  /** Individual criterion ratings */
  criteriaRatings: CriterionRating[]
  
  /** Calculated scores */
  scores: {
    /** Simple average of all ratings (normalized to 0-5) */
    averageRating: number
    
    /** Weighted average based on criterion weights */
    weightedAverage: number
    
    /** Number of criteria rated */
    criteriaCount: number
    
    /** Breakdown by category */
    categoryScores?: Record<CriterionCategory, {
      average: number
      count: number
    }>
  }
  
  // ============================================
  // Recommendation
  // ============================================
  
  /** Overall recommendation */
  recommendation: FeedbackRecommendation
  
  /** Confidence in the recommendation (1-5) */
  recommendationConfidence?: number
  
  /** Suggested next step */
  suggestedNextStep?: 
    | 'schedule_trial'
    | 'schedule_second_interview'
    | 'make_offer'
    | 'reject'
    | 'hold_for_future'
    | 'need_more_info'
  
  // ============================================
  // Qualitative Feedback
  // ============================================
  
  /** Key strengths observed */
  strengths?: string
  
  /** Areas of concern or improvement */
  concerns?: string
  
  /** Overall impression / summary */
  overallImpression?: string
  
  /** Questions the candidate asked (for tracking) */
  candidateQuestions?: string
  
  /** Red flags or deal breakers */
  redFlags?: string[]
  
  /** Notable highlights */
  highlights?: string[]
  
  /** Additional notes (internal) */
  internalNotes?: string
  
  // ============================================
  // Comparison Helpers
  // ============================================
  
  /** Skills demonstrated (for filtering/comparison) */
  skillsObserved?: string[]
  
  /** Experience relevance (1-5) */
  experienceRelevance?: number
  
  /** Cultural fit score (1-5) */
  culturalFitScore?: number
  
  /** Communication score (1-5) */
  communicationScore?: number
  
  /** Would you want to work with this person? */
  wouldWorkWith?: boolean
  
  // ============================================
  // Workflow Status
  // ============================================
  
  /** Current status */
  status: FeedbackStatus
  
  /** When feedback is due */
  dueAt?: Timestamp
  
  /** Whether feedback is overdue */
  isOverdue?: boolean
  
  /** Reminder sent? */
  reminderSent?: boolean
  reminderSentAt?: Timestamp
  
  // ============================================
  // Submission & Review
  // ============================================
  
  /** Who submitted the feedback */
  submittedBy: string
  submittedByName: string
  submittedByEmail?: string
  
  /** When submitted */
  submittedAt?: Timestamp
  
  /** Review tracking */
  reviewedAt?: Timestamp
  reviewedBy?: string
  reviewedByName?: string
  reviewNotes?: string
  
  // ============================================
  // Metadata
  // ============================================
  
  createdAt: Timestamp
  updatedAt: Timestamp
  
  /** For tracking if feedback was edited after submission */
  editHistory?: {
    editedAt: Timestamp
    editedBy: string
    fieldsChanged: string[]
  }[]
}

// ============================================================================
// INPUT TYPES
// ============================================================================

/** Create feedback input (for new feedback) */
export type CreateInterviewFeedbackInput = Omit<
  InterviewFeedback, 
  'id' | 'createdAt' | 'updatedAt' | 'scores' | 'isOverdue'
>

/** Update feedback input (for saving drafts or editing) */
export type UpdateInterviewFeedbackInput = Partial<
  Omit<InterviewFeedback, 'id' | 'createdAt' | 'interviewId' | 'candidateId'>
>

/** Submit feedback input (final submission) */
export interface SubmitFeedbackInput {
  feedbackId: string
  criteriaRatings: CriterionRating[]
  recommendation: FeedbackRecommendation
  strengths?: string
  concerns?: string
  overallImpression?: string
  suggestedNextStep?: InterviewFeedback['suggestedNextStep']
}

// ============================================================================
// QUERY TYPES
// ============================================================================

/** Filter options for querying feedback */
export interface FeedbackFilters {
  status?: FeedbackStatus | FeedbackStatus[]
  recommendation?: FeedbackRecommendation | FeedbackRecommendation[]
  interviewType?: FeedbackInterviewType | FeedbackInterviewType[]
  candidateId?: string
  jobId?: string
  branchId?: string
  submittedBy?: string
  dateFrom?: Timestamp
  dateTo?: Timestamp
  isOverdue?: boolean
  minRating?: number
  maxRating?: number
}

/** Feedback summary for dashboard/lists */
export interface FeedbackSummary {
  id: string
  interviewId: string
  candidateId: string
  candidateName: string
  jobTitle?: string
  branchName?: string
  interviewType: FeedbackInterviewType
  interviewDate: Timestamp
  status: FeedbackStatus
  recommendation?: FeedbackRecommendation
  averageRating?: number
  submittedByName?: string
  submittedAt?: Timestamp
  dueAt?: Timestamp
  isOverdue: boolean
}

// ============================================================================
// AGGREGATION TYPES
// ============================================================================

/** Aggregated feedback for a candidate (multiple interviews) */
export interface CandidateFeedbackAggregate {
  candidateId: string
  candidateName: string
  
  /** Total feedback count */
  totalFeedback: number
  
  /** Breakdown by status */
  byStatus: Record<FeedbackStatus, number>
  
  /** Breakdown by recommendation */
  byRecommendation: Record<FeedbackRecommendation, number>
  
  /** Overall average rating across all feedback */
  overallAverageRating: number
  
  /** Most recent recommendation */
  latestRecommendation?: FeedbackRecommendation
  
  /** All feedback summaries */
  feedbackList: FeedbackSummary[]
}

/** Comparison data for side-by-side view */
export interface CandidateComparison {
  candidates: {
    candidateId: string
    candidateName: string
    jobTitle?: string
    feedback: InterviewFeedback[]
    aggregateScores: {
      overall: number
      byCategory: Record<CriterionCategory, number>
    }
    recommendation: FeedbackRecommendation | null
    strengthsSummary: string[]
    concernsSummary: string[]
  }[]
}

// ============================================================================
// DEFAULT CRITERIA
// ============================================================================

/**
 * Default criteria for the standard scorecard template
 * These can be customized in Settings
 */
export const DEFAULT_FEEDBACK_CRITERIA: Omit<FeedbackCriterion, 'id'>[] = [
  // Communication
  {
    name: 'Verbal Communication',
    description: 'Clarity, articulation, and effectiveness of verbal communication',
    category: 'communication',
    ratingScale: '1-5',
    weight: 100,
    required: true,
    sortOrder: 1,
    allowNotes: true,
    ratingGuidance: {
      1: 'Difficult to understand, unclear responses',
      2: 'Some communication issues, occasionally unclear',
      3: 'Adequate communication, gets point across',
      4: 'Clear and effective communicator',
      5: 'Exceptional communicator, articulate and engaging'
    }
  },
  {
    name: 'Listening Skills',
    description: 'Ability to listen, understand questions, and respond appropriately',
    category: 'communication',
    ratingScale: '1-5',
    weight: 80,
    required: true,
    sortOrder: 2,
    allowNotes: false,
  },
  
  // Experience
  {
    name: 'Relevant Experience',
    description: 'How well their experience matches the role requirements',
    category: 'experience',
    ratingScale: '1-5',
    weight: 100,
    required: true,
    sortOrder: 3,
    allowNotes: true,
    ratingGuidance: {
      1: 'No relevant experience',
      2: 'Limited relevant experience',
      3: 'Some relevant experience',
      4: 'Strong relevant experience',
      5: 'Extensive, highly relevant experience'
    }
  },
  {
    name: 'Skills Match',
    description: 'Technical and professional skills alignment with role',
    category: 'technical',
    ratingScale: '1-5',
    weight: 100,
    required: true,
    sortOrder: 4,
    allowNotes: true,
  },
  
  // Pharmacy Specific
  {
    name: 'Pharmacy Knowledge',
    description: 'Understanding of pharmacy operations, regulations, and practices',
    category: 'pharmacy_specific',
    ratingScale: '1-5',
    weight: 100,
    required: false,
    sortOrder: 5,
    allowNotes: true,
  },
  {
    name: 'Customer Service Orientation',
    description: 'Attitude and approach to customer/patient care',
    category: 'customer_service',
    ratingScale: '1-5',
    weight: 90,
    required: true,
    sortOrder: 6,
    allowNotes: true,
  },
  
  // Cultural Fit
  {
    name: 'Cultural Fit',
    description: 'Alignment with company values and team dynamics',
    category: 'cultural_fit',
    ratingScale: '1-5',
    weight: 80,
    required: true,
    sortOrder: 7,
    allowNotes: true,
  },
  {
    name: 'Teamwork',
    description: 'Ability and willingness to work collaboratively',
    category: 'cultural_fit',
    ratingScale: '1-5',
    weight: 80,
    required: false,
    sortOrder: 8,
    allowNotes: false,
  },
  
  // Motivation
  {
    name: 'Motivation & Enthusiasm',
    description: 'Interest in the role and company, career motivation',
    category: 'motivation',
    ratingScale: '1-5',
    weight: 90,
    required: true,
    sortOrder: 9,
    allowNotes: true,
  },
  {
    name: 'Career Goals Alignment',
    description: 'How well their career goals align with the opportunity',
    category: 'motivation',
    ratingScale: '1-5',
    weight: 70,
    required: false,
    sortOrder: 10,
    allowNotes: false,
  },
  
  // General
  {
    name: 'Professionalism',
    description: 'Professional demeanor, punctuality, preparation',
    category: 'general',
    ratingScale: '1-5',
    weight: 80,
    required: true,
    sortOrder: 11,
    allowNotes: false,
  },
  {
    name: 'Problem Solving',
    description: 'Ability to think through challenges and propose solutions',
    category: 'general',
    ratingScale: '1-5',
    weight: 80,
    required: false,
    sortOrder: 12,
    allowNotes: true,
  },
]

/**
 * Default scorecard template
 */
export const DEFAULT_SCORECARD_TEMPLATE: Omit<ScorecardTemplate, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'> = {
  name: 'Standard Interview Scorecard',
  description: 'Default scorecard for all interview types. Customize per job category in Settings.',
  interviewTypes: ['phone_screen', 'video_interview', 'in_person'],
  jobCategories: [],
  jobTitleIds: [],
  criteria: DEFAULT_FEEDBACK_CRITERIA.map((c, i) => ({ ...c, id: `default-${i + 1}` })),
  isDefault: true,
  active: true,
  version: 1,
  progressThreshold: 3.5,
  holdThreshold: 2.5,
}

// ============================================================================
// CATEGORY LABELS
// ============================================================================

export const CRITERION_CATEGORY_LABELS: Record<CriterionCategory, string> = {
  communication: 'Communication',
  technical: 'Technical Skills',
  experience: 'Experience',
  cultural_fit: 'Cultural Fit',
  motivation: 'Motivation',
  pharmacy_specific: 'Pharmacy Knowledge',
  customer_service: 'Customer Service',
  general: 'General',
}

export const RECOMMENDATION_LABELS: Record<FeedbackRecommendation, string> = {
  progress: 'Progress to Next Stage',
  hold: 'Hold / Consider Later',
  reject: 'Do Not Progress',
}

export const RECOMMENDATION_COLORS: Record<FeedbackRecommendation, string> = {
  progress: '#10b981',  // green
  hold: '#f59e0b',      // amber
  reject: '#ef4444',    // red
}

export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  pending: 'Pending',
  draft: 'Draft',
  submitted: 'Submitted',
  reviewed: 'Reviewed',
}

export const INTERVIEW_TYPE_LABELS: Record<FeedbackInterviewType, string> = {
  phone_screen: 'Phone Screen',
  video_interview: 'Video Interview',
  in_person: 'In-Person Interview',
  technical: 'Technical Interview',
  trial: 'Trial Shift',
}
