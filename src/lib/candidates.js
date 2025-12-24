import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  getCountFromServer,
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  onSnapshot,
  limit,
  startAfter
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from './firebase';
import { sanitizeCandidateData, sanitizeNoteContent, containsSuspiciousContent } from './sanitize';

/**
 * Firestore Candidate Schema
 * Collection: candidates
 * 
 * Fields:
 * - firstName: string (required)
 * - lastName: string (required)
 * - email: string (required)
 * - phone: string (required)
 * - address: string | null
 * - postcode: string | null
 * - status: string (from CANDIDATE_STATUSES)
 * - jobId: string | null (linked job listing)
 * - jobTitle: string | null (denormalized for display)
 * - cvUrl: string | null (Firebase Storage URL)
 * - cvFileName: string | null
 * - cvStoragePath: string | null
 * - notes: string | null
 * - source: string | null (e.g., 'Indeed', 'Direct', 'Referral')
 * - parsedData: object | null (AI-extracted data from CV)
 * - entityId: string | null
 * - branchId: string | null
 * - createdBy: string (user ID)
 * - createdAt: timestamp
 * - updatedAt: timestamp
 * 
 * Subcollection: candidates/{id}/notes
 * - content: string
 * - createdBy: string (user ID)
 * - createdByName: string (display name)
 * - createdAt: timestamp
 * 
 * Subcollection: candidates/{id}/activity
 * - type: 'status_change' | 'note_added' | 'cv_uploaded' | 'interview_scheduled' | etc.
 * - description: string
 * - metadata: object | null
 * - createdBy: string
 * - createdByName: string
 * - createdAt: timestamp
 */

export const CANDIDATE_STATUSES = [
  { value: 'new', label: 'New', color: 'primary' },
  { value: 'contacted', label: 'Contacted', color: 'info' },
  { value: 'awaiting_response', label: 'Awaiting Response', color: 'warning' },
  { value: 'availability_confirmed', label: 'Availability Confirmed', color: 'success' },
  { value: 'interview_scheduled', label: 'Interview Scheduled', color: 'primary' },
  { value: 'interview_complete', label: 'Interview Complete', color: 'info' },
  { value: 'trial_scheduled', label: 'Trial Scheduled', color: 'primary' },
  { value: 'trial_complete', label: 'Trial Complete', color: 'info' },
  { value: 'awaiting_approval', label: 'Awaiting Approval', color: 'warning' },
  { value: 'approved', label: 'Approved', color: 'success' },
  { value: 'rejected', label: 'Rejected', color: 'error' },
  { value: 'withdrawn', label: 'Withdrawn', color: 'gray' }
];

export const CANDIDATE_SOURCES = [
  { value: 'indeed', label: 'Indeed' },
  { value: 'direct', label: 'Direct Application' },
  { value: 'referral', label: 'Referral' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'website', label: 'Company Website' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'other', label: 'Other' }
];

const CANDIDATES_COLLECTION = 'candidates';

/**
 * Upload CV file to Firebase Storage
 */
export async function uploadCV(file, candidateId) {
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storagePath = `cvs/${candidateId}/${timestamp}_${sanitizedName}`;
  const storageRef = ref(storage, storagePath);
  
  await uploadBytes(storageRef, file);
  const downloadUrl = await getDownloadURL(storageRef);
  
  return {
    cvUrl: downloadUrl,
    cvFileName: file.name,
    cvStoragePath: storagePath
  };
}

/**
 * Delete CV file from Firebase Storage
 */
export async function deleteCV(storagePath) {
  if (!storagePath) return;
  const storageRef = ref(storage, storagePath);
  try {
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Error deleting CV:', error);
  }
}

/**
 * Create a new candidate
 */
export async function createCandidate(candidateData, userId) {
  const candidatesRef = collection(db, CANDIDATES_COLLECTION);
  
  // Sanitise user inputs
  const sanitized = sanitizeCandidateData(candidateData);
  
  // Log if suspicious content detected (for monitoring)
  if (containsSuspiciousContent(JSON.stringify(candidateData))) {
    console.warn('Suspicious content detected in candidate data, sanitising...');
  }
  
  const candidate = {
    firstName: sanitized.firstName,
    lastName: sanitized.lastName,
    email: sanitized.email,
    phone: sanitized.phone,
    address: sanitized.address || null,
    postcode: sanitized.postcode || null,
    status: 'new',
    jobId: candidateData.jobId || null, // ID, not user input
    jobTitle: candidateData.jobTitle || null, // From job record, already validated
    cvUrl: candidateData.cvUrl || null, // System generated
    cvFileName: candidateData.cvFileName || null,
    cvStoragePath: candidateData.cvStoragePath || null,
    notes: sanitized.notes || null,
    source: sanitized.source || null,
    parsedData: candidateData.parsedData || null, // From CV parser
    entityId: candidateData.entityId || null,
    branchId: candidateData.branchId || null,
    createdBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const docRef = await addDoc(candidatesRef, candidate);
  return { id: docRef.id, ...candidate };
}

/**
 * Get a single candidate by ID
 */
export async function getCandidate(candidateId) {
  const candidateRef = doc(db, CANDIDATES_COLLECTION, candidateId);
  const candidateSnap = await getDoc(candidateRef);
  
  if (candidateSnap.exists()) {
    return { id: candidateSnap.id, ...candidateSnap.data() };
  }
  return null;
}

/**
 * Subscribe to a single candidate (real-time)
 */
export function subscribeToCandidate(candidateId, callback) {
  const candidateRef = doc(db, CANDIDATES_COLLECTION, candidateId);
  
  return onSnapshot(candidateRef, (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() });
    } else {
      callback(null);
    }
  }, (error) => {
    console.error('Error subscribing to candidate:', error);
    callback(null);
  });
}

/**
 * Get all candidates with optional filters
 */
export async function getCandidates(filters = {}) {
  const candidatesRef = collection(db, CANDIDATES_COLLECTION);
  let q = query(candidatesRef, orderBy('createdAt', 'desc'));

  if (filters.status && filters.status !== 'all') {
    q = query(candidatesRef, where('status', '==', filters.status), orderBy('createdAt', 'desc'));
  }

  if (filters.jobId) {
    q = query(candidatesRef, where('jobId', '==', filters.jobId), orderBy('createdAt', 'desc'));
  }

  if (filters.limit) {
    q = query(q, limit(filters.limit));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Page size for paginated queries
 */
export const PAGE_SIZE = 20;

/**
 * Subscribe to candidates collection (real-time updates) - for initial page
 * Returns unsubscribe function
 */
export function subscribeToCandidates(callback, filters = {}) {
  const candidatesRef = collection(db, CANDIDATES_COLLECTION);
  let q = query(candidatesRef, orderBy('createdAt', 'desc'), limit(PAGE_SIZE));

  if (filters.status && filters.status !== 'all') {
    q = query(
      candidatesRef, 
      where('status', '==', filters.status), 
      orderBy('createdAt', 'desc'),
      limit(PAGE_SIZE)
    );
  }

  if (filters.jobId && filters.jobId !== 'all') {
    q = query(
      candidatesRef, 
      where('jobId', '==', filters.jobId), 
      orderBy('createdAt', 'desc'),
      limit(PAGE_SIZE)
    );
  }

  return onSnapshot(q, (snapshot) => {
    const candidates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
    const hasMore = snapshot.docs.length === PAGE_SIZE;
    callback({ candidates, lastDoc, hasMore });
  }, (error) => {
    console.error('Error subscribing to candidates:', error);
    callback({ candidates: [], lastDoc: null, hasMore: false, error });
  });
}

/**
 * Fetch next page of candidates (cursor-based pagination)
 * @param {DocumentSnapshot} startAfterDoc - Last document from previous page
 * @param {Object} filters - Filter options
 * @returns {Promise<{candidates, lastDoc, hasMore}>}
 */
export async function fetchCandidatesPage(startAfterDoc, filters = {}) {
  const candidatesRef = collection(db, CANDIDATES_COLLECTION);
  
  let constraints = [orderBy('createdAt', 'desc')];
  
  if (filters.status && filters.status !== 'all') {
    constraints = [where('status', '==', filters.status), ...constraints];
  }
  
  if (filters.jobId && filters.jobId !== 'all') {
    constraints = [where('jobId', '==', filters.jobId), ...constraints];
  }
  
  if (startAfterDoc) {
    constraints.push(startAfter(startAfterDoc));
  }
  
  constraints.push(limit(PAGE_SIZE));
  
  const q = query(candidatesRef, ...constraints);
  const snapshot = await getDocs(q);
  
  const candidates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
  const hasMore = snapshot.docs.length === PAGE_SIZE;
  
  return { candidates, lastDoc, hasMore };
}

/**
 * Update a candidate
 */
export async function updateCandidate(candidateId, updates) {
  const candidateRef = doc(db, CANDIDATES_COLLECTION, candidateId);
  
  const updateData = {
    ...updates,
    updatedAt: serverTimestamp()
  };

  await updateDoc(candidateRef, updateData);
  return { id: candidateId, ...updateData };
}

/**
 * Delete a candidate (and their CV)
 */
export async function deleteCandidate(candidateId) {
  // First get the candidate to find CV path
  const candidate = await getCandidate(candidateId);
  
  // Delete CV from storage if exists
  if (candidate?.cvStoragePath) {
    await deleteCV(candidate.cvStoragePath);
  }
  
  // Delete candidate document
  const candidateRef = doc(db, CANDIDATES_COLLECTION, candidateId);
  await deleteDoc(candidateRef);
}

/**
 * Get candidate counts by status (using efficient server-side counting)
 */
export async function getCandidateCounts() {
  const candidatesRef = collection(db, CANDIDATES_COLLECTION);
  
  // Run all count queries in parallel for speed
  const [
    totalSnap,
    newSnap,
    approvedSnap,
    rejectedSnap,
    withdrawnSnap
  ] = await Promise.all([
    getCountFromServer(query(candidatesRef)),
    getCountFromServer(query(candidatesRef, where('status', '==', 'new'))),
    getCountFromServer(query(candidatesRef, where('status', '==', 'approved'))),
    getCountFromServer(query(candidatesRef, where('status', '==', 'rejected'))),
    getCountFromServer(query(candidatesRef, where('status', '==', 'withdrawn')))
  ]);

  const total = totalSnap.data().count;
  const newCount = newSnap.data().count;
  const approved = approvedSnap.data().count;
  const rejected = rejectedSnap.data().count + withdrawnSnap.data().count;
  
  // in_progress = total - new - approved - rejected - withdrawn
  const inProgress = total - newCount - approved - rejected;

  return {
    total,
    new: newCount,
    in_progress: inProgress,
    approved,
    rejected
  };
}

// ============================================
// NOTES SUBCOLLECTION
// ============================================

/**
 * Add a note to a candidate
 */
export async function addNote(candidateId, content, userId, userName) {
  const notesRef = collection(db, CANDIDATES_COLLECTION, candidateId, 'notes');
  
  // Sanitise note content
  const sanitizedContent = sanitizeNoteContent(content);
  
  const note = {
    content: sanitizedContent,
    createdBy: userId,
    createdByName: userName || 'Unknown',
    createdAt: serverTimestamp()
  };

  const docRef = await addDoc(notesRef, note);
  
  // Also add to activity log
  await addActivity(candidateId, {
    type: 'note_added',
    description: 'Added a note',
    createdBy: userId,
    createdByName: userName
  });

  return { id: docRef.id, ...note };
}

/**
 * Get all notes for a candidate
 */
export async function getNotes(candidateId) {
  const notesRef = collection(db, CANDIDATES_COLLECTION, candidateId, 'notes');
  const q = query(notesRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Subscribe to notes for a candidate (real-time)
 */
export function subscribeToNotes(candidateId, callback) {
  const notesRef = collection(db, CANDIDATES_COLLECTION, candidateId, 'notes');
  const q = query(notesRef, orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const notes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(notes);
  }, (error) => {
    console.error('Error subscribing to notes:', error);
  });
}

/**
 * Delete a note
 */
export async function deleteNote(candidateId, noteId) {
  const noteRef = doc(db, CANDIDATES_COLLECTION, candidateId, 'notes', noteId);
  await deleteDoc(noteRef);
}

// ============================================
// ACTIVITY LOG SUBCOLLECTION
// ============================================

/**
 * Add an activity log entry
 */
export async function addActivity(candidateId, activityData) {
  const activityRef = collection(db, CANDIDATES_COLLECTION, candidateId, 'activity');
  
  const activity = {
    type: activityData.type,
    description: activityData.description,
    metadata: activityData.metadata || null,
    createdBy: activityData.createdBy,
    createdByName: activityData.createdByName || 'System',
    createdAt: serverTimestamp()
  };

  const docRef = await addDoc(activityRef, activity);
  return { id: docRef.id, ...activity };
}

/**
 * Subscribe to activity for a candidate (real-time)
 */
export function subscribeToActivity(candidateId, callback) {
  const activityRef = collection(db, CANDIDATES_COLLECTION, candidateId, 'activity');
  const q = query(activityRef, orderBy('createdAt', 'desc'), limit(50));
  
  return onSnapshot(q, (snapshot) => {
    const activities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(activities);
  }, (error) => {
    console.error('Error subscribing to activity:', error);
  });
}

/**
 * Log a status change
 */
export async function logStatusChange(candidateId, oldStatus, newStatus, userId, userName) {
  const oldLabel = getStatusConfig(oldStatus).label;
  const newLabel = getStatusConfig(newStatus).label;
  
  await addActivity(candidateId, {
    type: 'status_change',
    description: `Status changed from ${oldLabel} to ${newLabel}`,
    metadata: { oldStatus, newStatus },
    createdBy: userId,
    createdByName: userName
  });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get status config (label and color)
 */
export function getStatusConfig(value) {
  const status = CANDIDATE_STATUSES.find(s => s.value === value);
  return status || { value, label: value, color: 'gray' };
}

/**
 * Get source label
 */
export function getSourceLabel(value) {
  const source = CANDIDATE_SOURCES.find(s => s.value === value);
  return source?.label || value || 'Unknown';
}

/**
 * Get full name from candidate
 */
export function getFullName(candidate) {
  return `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim() || 'Unknown';
}

/**
 * Get initials from candidate name
 */
export function getInitials(candidate) {
  const first = candidate.firstName?.[0] || '';
  const last = candidate.lastName?.[0] || '';
  return (first + last).toUpperCase() || '?';
}
