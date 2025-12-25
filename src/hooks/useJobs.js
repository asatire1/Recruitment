import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  serverTimestamp,
  writeBatch,
  increment,
  getCountFromServer
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Job status definitions
export const JOB_STATUSES = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  PAUSED: 'paused',
  CLOSED: 'closed'
};

// Job status configuration
export const JOB_STATUS_CONFIG = {
  draft: { label: 'Draft', color: '#8b5cf6', bg: '#ede9fe' },
  active: { label: 'Active', color: '#10b981', bg: '#d1fae5' },
  paused: { label: 'Paused', color: '#f59e0b', bg: '#fef3c7' },
  closed: { label: 'Closed', color: '#6b7280', bg: '#f3f4f6' }
};

// Job types with pharmacy-specific roles
export const JOB_TYPES = {
  CLINICAL: [
    { value: 'pharmacist', label: 'Pharmacist', requiresGPhC: true, requiresDBS: true },
    { value: 'pharmacist_manager', label: 'Pharmacist Manager', requiresGPhC: true, requiresDBS: true },
    { value: 'relief_pharmacist', label: 'Relief Pharmacist', requiresGPhC: true, requiresDBS: true },
    { value: 'locum_pharmacist', label: 'Locum Pharmacist', requiresGPhC: true, requiresDBS: true },
    { value: 'pre_reg_pharmacist', label: 'Pre-Registration Pharmacist', requiresGPhC: false, requiresDBS: true },
    { value: 'pharmacy_technician', label: 'Pharmacy Technician', requiresGPhC: true, requiresDBS: true },
    { value: 'accuracy_checking_tech', label: 'Accuracy Checking Technician', requiresGPhC: true, requiresDBS: true }
  ],
  DISPENSARY: [
    { value: 'dispenser', label: 'Dispenser', requiresGPhC: false, requiresDBS: true },
    { value: 'senior_dispenser', label: 'Senior Dispenser', requiresGPhC: false, requiresDBS: true },
    { value: 'dispensary_assistant', label: 'Dispensary Assistant', requiresGPhC: false, requiresDBS: true },
    { value: 'trainee_dispenser', label: 'Trainee Dispenser', requiresGPhC: false, requiresDBS: true }
  ],
  RETAIL: [
    { value: 'counter_assistant', label: 'Counter Assistant', requiresGPhC: false, requiresDBS: false },
    { value: 'healthcare_assistant', label: 'Healthcare Assistant', requiresGPhC: false, requiresDBS: false },
    { value: 'sales_assistant', label: 'Sales Assistant', requiresGPhC: false, requiresDBS: false },
    { value: 'retail_supervisor', label: 'Retail Supervisor', requiresGPhC: false, requiresDBS: false }
  ],
  MANAGEMENT: [
    { value: 'branch_manager', label: 'Branch Manager (Non-Pharmacist)', requiresGPhC: false, requiresDBS: true },
    { value: 'area_manager', label: 'Area Manager', requiresGPhC: false, requiresDBS: true },
    { value: 'regional_manager', label: 'Regional Manager', requiresGPhC: false, requiresDBS: true },
    { value: 'operations_manager', label: 'Operations Manager', requiresGPhC: false, requiresDBS: true }
  ],
  SUPPORT: [
    { value: 'delivery_driver', label: 'Delivery Driver', requiresGPhC: false, requiresDBS: false },
    { value: 'warehouse_operative', label: 'Warehouse Operative', requiresGPhC: false, requiresDBS: false },
    { value: 'cleaner', label: 'Cleaner', requiresGPhC: false, requiresDBS: false },
    { value: 'administrator', label: 'Administrator', requiresGPhC: false, requiresDBS: false }
  ]
};

// Flatten all job types for easy lookup
export const ALL_JOB_TYPES = Object.values(JOB_TYPES).flat();

// Employment types
export const EMPLOYMENT_TYPES = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'temporary', label: 'Temporary' },
  { value: 'locum', label: 'Locum' }
];

// Hook for fetching jobs with filtering
export function useJobs(options = {}) {
  const {
    status = null,
    entityId = null,
    branchId = null,
    searchQuery = '',
    sortField = 'createdAt',
    sortDirection = 'desc',
    pageSize = 20
  } = options;

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  // Build query constraints
  const buildQuery = useCallback(() => {
    const constraints = [];
    
    if (status && status !== 'all') {
      constraints.push(where('status', '==', status));
    }
    if (entityId) {
      constraints.push(where('entityId', '==', entityId));
    }
    if (branchId) {
      constraints.push(where('branchId', '==', branchId));
    }
    
    constraints.push(orderBy(sortField, sortDirection));
    constraints.push(limit(pageSize));
    
    return constraints;
  }, [status, entityId, branchId, sortField, sortDirection, pageSize]);

  // Fetch initial data
  useEffect(() => {
    setLoading(true);
    setLastDoc(null);
    
    const q = query(collection(db, 'jobs'), ...buildQuery());
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Client-side search filter
        let filtered = docs;
        if (searchQuery) {
          const search = searchQuery.toLowerCase();
          filtered = docs.filter(j => 
            j.title?.toLowerCase().includes(search) ||
            j.location?.toLowerCase().includes(search) ||
            j.description?.toLowerCase().includes(search)
          );
        }
        
        setJobs(filtered);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === pageSize);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching jobs:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [status, entityId, branchId, sortField, sortDirection, searchQuery, pageSize]);

  // Load more jobs
  const loadMore = async () => {
    if (!hasMore || loading || !lastDoc) return;
    
    setLoading(true);
    try {
      const q = query(
        collection(db, 'jobs'),
        ...buildQuery(),
        startAfter(lastDoc)
      );
      
      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setJobs(prev => [...prev, ...docs]);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === pageSize);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return { jobs, loading, error, hasMore, loadMore };
}

// Hook for a single job
export function useJob(jobId) {
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!jobId) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'jobs', jobId),
      (doc) => {
        if (doc.exists()) {
          setJob({ id: doc.id, ...doc.data() });
        } else {
          setJob(null);
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [jobId]);

  return { job, loading, error };
}

// Hook for job statistics
export function useJobStats() {
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    paused: 0,
    closed: 0,
    draft: 0,
    totalApplicants: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'jobs'),
      (snapshot) => {
        let total = 0;
        let active = 0;
        let paused = 0;
        let closed = 0;
        let draft = 0;
        let totalApplicants = 0;

        snapshot.docs.forEach(doc => {
          const data = doc.data();
          total++;
          totalApplicants += data.applicantCount || 0;
          
          switch (data.status) {
            case JOB_STATUSES.ACTIVE:
              active++;
              break;
            case JOB_STATUSES.PAUSED:
              paused++;
              break;
            case JOB_STATUSES.CLOSED:
              closed++;
              break;
            case JOB_STATUSES.DRAFT:
              draft++;
              break;
            default:
              break;
          }
        });

        setStats({ total, active, paused, closed, draft, totalApplicants });
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  return { stats, loading };
}

// Hook for job CRUD operations
export function useJobActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Create a new job
  const createJob = async (jobData) => {
    setLoading(true);
    setError(null);
    try {
      const docRef = await addDoc(collection(db, 'jobs'), {
        ...jobData,
        status: jobData.status || JOB_STATUSES.DRAFT,
        applicantCount: 0,
        statusCounts: {
          new: 0,
          screening: 0,
          interview: 0,
          trial: 0,
          approved: 0,
          rejected: 0,
          hired: 0,
          withdrawn: 0
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      setLoading(false);
      return docRef.id;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  // Update job
  const updateJob = async (jobId, data) => {
    setLoading(true);
    setError(null);
    try {
      await updateDoc(doc(db, 'jobs', jobId), {
        ...data,
        updatedAt: serverTimestamp()
      });
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  // Update job status
  const updateJobStatus = async (jobId, newStatus) => {
    setLoading(true);
    setError(null);
    try {
      const updateData = {
        status: newStatus,
        updatedAt: serverTimestamp()
      };
      
      // If closing the job, add closedAt timestamp
      if (newStatus === JOB_STATUSES.CLOSED) {
        updateData.closedAt = serverTimestamp();
      }
      
      await updateDoc(doc(db, 'jobs', jobId), updateData);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  // Delete job
  const deleteJob = async (jobId) => {
    setLoading(true);
    setError(null);
    try {
      // Check if job has candidates
      const candidatesQuery = query(
        collection(db, 'candidates'),
        where('jobId', '==', jobId),
        limit(1)
      );
      const candidatesSnapshot = await getDocs(candidatesQuery);
      
      if (!candidatesSnapshot.empty) {
        throw new Error('Cannot delete job with linked candidates. Please reassign or remove candidates first.');
      }
      
      await deleteDoc(doc(db, 'jobs', jobId));
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  // Duplicate job
  const duplicateJob = async (jobId) => {
    setLoading(true);
    setError(null);
    try {
      const jobDoc = await getDoc(doc(db, 'jobs', jobId));
      
      if (!jobDoc.exists()) {
        throw new Error('Job not found');
      }
      
      const jobData = jobDoc.data();
      
      // Create new job with same data but reset counts and status
      const newJobData = {
        ...jobData,
        title: `${jobData.title} (Copy)`,
        status: JOB_STATUSES.DRAFT,
        applicantCount: 0,
        statusCounts: {
          new: 0,
          screening: 0,
          interview: 0,
          trial: 0,
          approved: 0,
          rejected: 0,
          hired: 0,
          withdrawn: 0
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Remove timestamps that shouldn't be copied
      delete newJobData.closedAt;
      
      const docRef = await addDoc(collection(db, 'jobs'), newJobData);
      setLoading(false);
      return docRef.id;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  return {
    createJob,
    updateJob,
    updateJobStatus,
    deleteJob,
    duplicateJob,
    loading,
    error
  };
}

// Hook to get candidates for a specific job
export function useJobCandidates(jobId) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!jobId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'candidates'),
      where('jobId', '==', jobId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setCandidates(docs);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [jobId]);

  return { candidates, loading, error };
}

export default useJobs;
