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
  onSnapshot
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Firestore Job Schema
 * Collection: jobs
 * 
 * Fields:
 * - title: string (required) - e.g., "Dispenser", "Pharmacist"
 * - category: string (required) - from JOB_CATEGORIES
 * - location: string (required) - branch name or area
 * - description: string - job description/requirements
 * - status: 'active' | 'paused' | 'closed'
 * - entityId: string | null - linked entity
 * - branchId: string | null - linked branch
 * - salary: string | null - salary range or rate
 * - contractType: 'full_time' | 'part_time' | 'temporary' | 'contract'
 * - hoursPerWeek: number | null
 * - createdBy: string - user ID who created
 * - createdAt: timestamp
 * - updatedAt: timestamp
 * - closedAt: timestamp | null
 */

export const JOB_CATEGORIES = [
  { value: 'dispenser', label: 'Dispenser' },
  { value: 'counter_assistant', label: 'Counter Assistant' },
  { value: 'pharmacist', label: 'Pharmacist' },
  { value: 'delivery_driver', label: 'Delivery Driver' },
  { value: 'pharmacy_technician', label: 'Pharmacy Technician' },
  { value: 'prereg_pharmacist', label: 'Pre-reg Pharmacist' },
  { value: 'cleaner', label: 'Cleaner' },
  { value: 'head_office', label: 'Head Office' },
  { value: 'other', label: 'Other' }
];

export const JOB_STATUSES = [
  { value: 'active', label: 'Active', color: 'success' },
  { value: 'paused', label: 'Paused', color: 'warning' },
  { value: 'closed', label: 'Closed', color: 'gray' }
];

export const CONTRACT_TYPES = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'temporary', label: 'Temporary' },
  { value: 'contract', label: 'Contract' }
];

const JOBS_COLLECTION = 'jobs';

/**
 * Create a new job listing
 */
export async function createJob(jobData, userId) {
  const jobsRef = collection(db, JOBS_COLLECTION);
  
  const job = {
    title: jobData.title,
    category: jobData.category,
    location: jobData.location,
    description: jobData.description || '',
    status: 'active',
    entityId: jobData.entityId || null,
    branchId: jobData.branchId || null,
    salary: jobData.salary || null,
    contractType: jobData.contractType || 'full_time',
    hoursPerWeek: jobData.hoursPerWeek || null,
    createdBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    closedAt: null
  };

  const docRef = await addDoc(jobsRef, job);
  return { id: docRef.id, ...job };
}

/**
 * Get a single job by ID
 */
export async function getJob(jobId) {
  const jobRef = doc(db, JOBS_COLLECTION, jobId);
  const jobSnap = await getDoc(jobRef);
  
  if (jobSnap.exists()) {
    return { id: jobSnap.id, ...jobSnap.data() };
  }
  return null;
}

/**
 * Get all jobs with optional filters
 */
export async function getJobs(filters = {}) {
  const jobsRef = collection(db, JOBS_COLLECTION);
  let q = query(jobsRef, orderBy('createdAt', 'desc'));

  // Apply filters
  if (filters.status && filters.status !== 'all') {
    q = query(jobsRef, where('status', '==', filters.status), orderBy('createdAt', 'desc'));
  }

  if (filters.category && filters.category !== 'all') {
    q = query(jobsRef, where('category', '==', filters.category), orderBy('createdAt', 'desc'));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Subscribe to jobs collection (real-time updates)
 */
export function subscribeToJobs(callback, filters = {}) {
  const jobsRef = collection(db, JOBS_COLLECTION);
  let q = query(jobsRef, orderBy('createdAt', 'desc'));

  // Apply status filter if provided
  if (filters.status && filters.status !== 'all') {
    q = query(jobsRef, where('status', '==', filters.status), orderBy('createdAt', 'desc'));
  }

  return onSnapshot(q, (snapshot) => {
    const jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(jobs);
  }, (error) => {
    console.error('Error subscribing to jobs:', error);
  });
}

/**
 * Update a job listing
 */
export async function updateJob(jobId, updates) {
  const jobRef = doc(db, JOBS_COLLECTION, jobId);
  
  const updateData = {
    ...updates,
    updatedAt: serverTimestamp()
  };

  // If closing the job, set closedAt
  if (updates.status === 'closed') {
    updateData.closedAt = serverTimestamp();
  }

  await updateDoc(jobRef, updateData);
  return { id: jobId, ...updateData };
}

/**
 * Delete a job listing (hard delete - use with caution)
 */
export async function deleteJob(jobId) {
  const jobRef = doc(db, JOBS_COLLECTION, jobId);
  await deleteDoc(jobRef);
}

/**
 * Archive a job (soft delete by setting status to closed)
 */
export async function archiveJob(jobId) {
  return updateJob(jobId, { status: 'closed' });
}

/**
 * Get job counts by status
 */
export async function getJobCounts() {
  const jobsRef = collection(db, JOBS_COLLECTION);
  const snapshot = await getDocs(jobsRef);
  
  const counts = {
    total: 0,
    active: 0,
    paused: 0,
    closed: 0
  };

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    counts.total++;
    if (data.status === 'active') counts.active++;
    else if (data.status === 'paused') counts.paused++;
    else if (data.status === 'closed') counts.closed++;
  });

  return counts;
}

/**
 * Get category label from value
 */
export function getCategoryLabel(value) {
  const category = JOB_CATEGORIES.find(c => c.value === value);
  return category?.label || value;
}

/**
 * Get status config (label and color)
 */
export function getStatusConfig(value) {
  const status = JOB_STATUSES.find(s => s.value === value);
  return status || { value, label: value, color: 'gray' };
}
