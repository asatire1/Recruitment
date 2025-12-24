import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { updateCandidate, addActivity } from './candidates';

/**
 * Firestore Interview Schema
 * Collection: interviews
 * 
 * Fields:
 * - candidateId: string (required)
 * - candidateName: string (denormalized)
 * - candidatePhone: string (denormalized)
 * - candidateEmail: string (denormalized)
 * - jobId: string | null
 * - jobTitle: string | null
 * - type: 'interview' | 'trial'
 * - status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
 * - dateTime: timestamp (required)
 * - duration: number (minutes, default 30)
 * - location: string | null (branch address or 'Phone' or 'Video')
 * - locationType: 'in_person' | 'phone' | 'video'
 * - notes: string | null
 * - interviewerName: string | null
 * - interviewerPhone: string | null
 * - feedback: string | null (post-interview)
 * - rating: number | null (1-5 post-interview)
 * - createdBy: string
 * - createdAt: timestamp
 * - updatedAt: timestamp
 */

export const INTERVIEW_TYPES = [
  { value: 'interview', label: 'Interview' },
  { value: 'trial', label: 'Trial Day' }
];

export const INTERVIEW_STATUSES = [
  { value: 'scheduled', label: 'Scheduled', color: 'primary' },
  { value: 'completed', label: 'Completed', color: 'success' },
  { value: 'cancelled', label: 'Cancelled', color: 'gray' },
  { value: 'no_show', label: 'No Show', color: 'error' }
];

export const LOCATION_TYPES = [
  { value: 'in_person', label: 'In Person' },
  { value: 'phone', label: 'Phone Call' },
  { value: 'video', label: 'Video Call' }
];

export const DURATION_OPTIONS = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
  { value: 240, label: '4 hours (half day)' },
  { value: 480, label: '8 hours (full day)' }
];

const INTERVIEWS_COLLECTION = 'interviews';

/**
 * Create a new interview/trial
 */
export async function createInterview(interviewData, userId, userName) {
  const interviewsRef = collection(db, INTERVIEWS_COLLECTION);
  
  // Convert date string to Timestamp
  const dateTime = interviewData.dateTime instanceof Date 
    ? Timestamp.fromDate(interviewData.dateTime)
    : Timestamp.fromDate(new Date(interviewData.dateTime));
  
  const interview = {
    candidateId: interviewData.candidateId,
    candidateName: interviewData.candidateName || '',
    candidatePhone: interviewData.candidatePhone || '',
    candidateEmail: interviewData.candidateEmail || '',
    jobId: interviewData.jobId || null,
    jobTitle: interviewData.jobTitle || null,
    type: interviewData.type || 'interview',
    status: 'scheduled',
    dateTime,
    duration: interviewData.duration || 30,
    location: interviewData.location || null,
    locationType: interviewData.locationType || 'in_person',
    notes: interviewData.notes || null,
    interviewerName: interviewData.interviewerName || null,
    interviewerPhone: interviewData.interviewerPhone || null,
    feedback: null,
    rating: null,
    createdBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const docRef = await addDoc(interviewsRef, interview);
  
  // Update candidate status
  const newStatus = interviewData.type === 'trial' ? 'trial_scheduled' : 'interview_scheduled';
  await updateCandidate(interviewData.candidateId, { status: newStatus });
  
  // Add activity log
  const typeLabel = interviewData.type === 'trial' ? 'Trial' : 'Interview';
  await addActivity(interviewData.candidateId, {
    type: interviewData.type === 'trial' ? 'trial_scheduled' : 'interview_scheduled',
    description: `${typeLabel} scheduled for ${formatDateTime(dateTime)}`,
    metadata: { interviewId: docRef.id },
    createdBy: userId,
    createdByName: userName
  });

  return { id: docRef.id, ...interview };
}

/**
 * Get a single interview by ID
 */
export async function getInterview(interviewId) {
  const interviewRef = doc(db, INTERVIEWS_COLLECTION, interviewId);
  const interviewSnap = await getDoc(interviewRef);
  
  if (interviewSnap.exists()) {
    return { id: interviewSnap.id, ...interviewSnap.data() };
  }
  return null;
}

/**
 * Get interviews for a candidate
 */
export async function getCandidateInterviews(candidateId) {
  const interviewsRef = collection(db, INTERVIEWS_COLLECTION);
  const q = query(
    interviewsRef, 
    where('candidateId', '==', candidateId),
    orderBy('dateTime', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Subscribe to interviews for a candidate
 */
export function subscribeToCandidateInterviews(candidateId, callback) {
  const interviewsRef = collection(db, INTERVIEWS_COLLECTION);
  const q = query(
    interviewsRef, 
    where('candidateId', '==', candidateId),
    orderBy('dateTime', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const interviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(interviews);
  }, (error) => {
    console.error('Error subscribing to candidate interviews:', error);
  });
}

/**
 * Get all upcoming interviews
 */
export async function getUpcomingInterviews(limitDays = 7) {
  const interviewsRef = collection(db, INTERVIEWS_COLLECTION);
  const now = Timestamp.now();
  const futureDate = Timestamp.fromDate(
    new Date(Date.now() + limitDays * 24 * 60 * 60 * 1000)
  );
  
  const q = query(
    interviewsRef,
    where('status', '==', 'scheduled'),
    where('dateTime', '>=', now),
    where('dateTime', '<=', futureDate),
    orderBy('dateTime', 'asc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Subscribe to all scheduled interviews
 */
export function subscribeToInterviews(callback, filters = {}) {
  const interviewsRef = collection(db, INTERVIEWS_COLLECTION);
  let q = query(interviewsRef, orderBy('dateTime', 'desc'));
  
  if (filters.status && filters.status !== 'all') {
    q = query(
      interviewsRef, 
      where('status', '==', filters.status),
      orderBy('dateTime', 'desc')
    );
  }
  
  if (filters.type && filters.type !== 'all') {
    q = query(
      interviewsRef, 
      where('type', '==', filters.type),
      orderBy('dateTime', 'desc')
    );
  }

  return onSnapshot(q, (snapshot) => {
    const interviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(interviews);
  }, (error) => {
    console.error('Error subscribing to interviews:', error);
  });
}

/**
 * Update an interview
 */
export async function updateInterview(interviewId, updates, userId, userName) {
  const interviewRef = doc(db, INTERVIEWS_COLLECTION, interviewId);
  
  // Convert dateTime if provided
  if (updates.dateTime) {
    updates.dateTime = updates.dateTime instanceof Date
      ? Timestamp.fromDate(updates.dateTime)
      : Timestamp.fromDate(new Date(updates.dateTime));
  }
  
  const updateData = {
    ...updates,
    updatedAt: serverTimestamp()
  };

  await updateDoc(interviewRef, updateData);
  
  // If status changed, update candidate and log activity
  if (updates.status) {
    const interview = await getInterview(interviewId);
    if (interview) {
      let candidateStatus = null;
      let activityType = null;
      let activityDesc = null;
      
      if (updates.status === 'completed') {
        candidateStatus = interview.type === 'trial' ? 'trial_complete' : 'interview_complete';
        activityType = interview.type === 'trial' ? 'trial_completed' : 'interview_completed';
        activityDesc = `${interview.type === 'trial' ? 'Trial' : 'Interview'} marked as completed`;
      } else if (updates.status === 'cancelled') {
        activityType = 'interview_cancelled';
        activityDesc = `${interview.type === 'trial' ? 'Trial' : 'Interview'} was cancelled`;
      } else if (updates.status === 'no_show') {
        activityType = 'interview_no_show';
        activityDesc = `Candidate did not show up for ${interview.type === 'trial' ? 'trial' : 'interview'}`;
      }
      
      if (candidateStatus) {
        await updateCandidate(interview.candidateId, { status: candidateStatus });
      }
      
      if (activityType && userId) {
        await addActivity(interview.candidateId, {
          type: activityType,
          description: activityDesc,
          metadata: { interviewId },
          createdBy: userId,
          createdByName: userName
        });
      }
    }
  }
  
  return { id: interviewId, ...updateData };
}

/**
 * Delete an interview
 */
export async function deleteInterview(interviewId) {
  const interviewRef = doc(db, INTERVIEWS_COLLECTION, interviewId);
  await deleteDoc(interviewRef);
}

/**
 * Add feedback to a completed interview
 */
export async function addInterviewFeedback(interviewId, feedback, rating, userId, userName) {
  const interview = await getInterview(interviewId);
  if (!interview) throw new Error('Interview not found');
  
  await updateInterview(interviewId, { 
    feedback, 
    rating,
    status: 'completed'
  }, userId, userName);
  
  // Log activity
  await addActivity(interview.candidateId, {
    type: 'feedback_added',
    description: `Feedback added for ${interview.type === 'trial' ? 'trial' : 'interview'} (Rating: ${rating}/5)`,
    metadata: { interviewId, rating },
    createdBy: userId,
    createdByName: userName
  });
}

/**
 * Get today's interviews
 */
export async function getTodaysInterviews() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const interviewsRef = collection(db, INTERVIEWS_COLLECTION);
  const q = query(
    interviewsRef,
    where('status', '==', 'scheduled'),
    where('dateTime', '>=', Timestamp.fromDate(today)),
    where('dateTime', '<', Timestamp.fromDate(tomorrow)),
    orderBy('dateTime', 'asc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Format dateTime for display
 */
export function formatDateTime(timestamp) {
  if (!timestamp) return 'Unknown';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Format date only
 */
export function formatDate(timestamp) {
  if (!timestamp) return 'Unknown';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

/**
 * Format time only
 */
export function formatTime(timestamp) {
  if (!timestamp) return 'Unknown';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Get status config
 */
export function getInterviewStatusConfig(value) {
  const status = INTERVIEW_STATUSES.find(s => s.value === value);
  return status || { value, label: value, color: 'gray' };
}

/**
 * Check if interview is in the past
 */
export function isInterviewPast(timestamp) {
  if (!timestamp) return false;
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date < new Date();
}

/**
 * Check if interview is today
 */
export function isInterviewToday(timestamp) {
  if (!timestamp) return false;
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

/**
 * Get interviews within a date range (for calendar view)
 * @param {Date} startDate - Start of range
 * @param {Date} endDate - End of range
 * @returns {Promise<Array>} Interviews in range
 */
export async function getInterviewsInRange(startDate, endDate) {
  const interviewsRef = collection(db, INTERVIEWS_COLLECTION);
  
  const q = query(
    interviewsRef,
    where('dateTime', '>=', Timestamp.fromDate(startDate)),
    where('dateTime', '<=', Timestamp.fromDate(endDate)),
    orderBy('dateTime', 'asc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Subscribe to interviews in a date range (for calendar real-time updates)
 * @param {Date} startDate - Start of range
 * @param {Date} endDate - End of range
 * @param {Function} callback - Callback with interviews array
 * @returns {Function} Unsubscribe function
 */
export function subscribeToInterviewsInRange(startDate, endDate, callback) {
  const interviewsRef = collection(db, INTERVIEWS_COLLECTION);
  
  const q = query(
    interviewsRef,
    where('dateTime', '>=', Timestamp.fromDate(startDate)),
    where('dateTime', '<=', Timestamp.fromDate(endDate)),
    orderBy('dateTime', 'asc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const interviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(interviews);
  }, (error) => {
    console.error('Error subscribing to interviews in range:', error);
    callback([]);
  });
}
