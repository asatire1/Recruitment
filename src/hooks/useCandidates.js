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

// Candidate status flow
export const CANDIDATE_STATUSES = {
  NEW: 'new',
  SCREENING: 'screening',
  INTERVIEW: 'interview',
  TRIAL: 'trial',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  HIRED: 'hired',
  WITHDRAWN: 'withdrawn'
};

// Status colors and labels
export const STATUS_CONFIG = {
  new: { label: 'New', color: '#8b5cf6', bg: '#ede9fe' },
  screening: { label: 'Screening', color: '#f59e0b', bg: '#fef3c7' },
  interview: { label: 'Interview', color: '#3b82f6', bg: '#dbeafe' },
  trial: { label: 'Trial', color: '#06b6d4', bg: '#cffafe' },
  approved: { label: 'Approved', color: '#10b981', bg: '#d1fae5' },
  rejected: { label: 'Rejected', color: '#ef4444', bg: '#fee2e2' },
  hired: { label: 'Hired', color: '#22c55e', bg: '#dcfce7' },
  withdrawn: { label: 'Withdrawn', color: '#6b7280', bg: '#f3f4f6' }
};

// Hook for fetching candidates with filtering and pagination
export function useCandidates(options = {}) {
  const {
    status = null,
    jobId = null,
    branchId = null,
    entityId = null,
    searchQuery = '',
    sortField = 'createdAt',
    sortDirection = 'desc',
    pageSize = 20
  } = options;

  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Build query constraints
  const buildQuery = useCallback((isCount = false) => {
    const constraints = [];
    
    if (status && status !== 'all') {
      constraints.push(where('status', '==', status));
    }
    if (jobId) {
      constraints.push(where('jobId', '==', jobId));
    }
    if (branchId) {
      constraints.push(where('branchId', '==', branchId));
    }
    if (entityId) {
      constraints.push(where('entityId', '==', entityId));
    }
    
    if (!isCount) {
      constraints.push(orderBy(sortField, sortDirection));
      constraints.push(limit(pageSize));
    }
    
    return constraints;
  }, [status, jobId, branchId, entityId, sortField, sortDirection, pageSize]);

  // Fetch initial data
  useEffect(() => {
    setLoading(true);
    setLastDoc(null);
    
    const q = query(collection(db, 'candidates'), ...buildQuery());
    
    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const docs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Client-side search filter
        let filtered = docs;
        if (searchQuery) {
          const search = searchQuery.toLowerCase();
          filtered = docs.filter(c => 
            c.name?.toLowerCase().includes(search) ||
            c.email?.toLowerCase().includes(search) ||
            c.phone?.includes(search)
          );
        }
        
        setCandidates(filtered);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === pageSize);
        setLoading(false);
        
        // Get total count
        try {
          const countQuery = query(collection(db, 'candidates'), ...buildQuery(true));
          const countSnapshot = await getCountFromServer(countQuery);
          setTotalCount(countSnapshot.data().count);
        } catch (err) {
          console.error('Error getting count:', err);
        }
      },
      (err) => {
        console.error('Error fetching candidates:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [status, jobId, branchId, entityId, sortField, sortDirection, searchQuery, pageSize]);

  // Load more candidates
  const loadMore = async () => {
    if (!hasMore || loading || !lastDoc) return;
    
    setLoading(true);
    try {
      const q = query(
        collection(db, 'candidates'),
        ...buildQuery(),
        startAfter(lastDoc)
      );
      
      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setCandidates(prev => [...prev, ...docs]);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === pageSize);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return { candidates, loading, error, hasMore, loadMore, totalCount };
}

// Hook for a single candidate
export function useCandidate(candidateId) {
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!candidateId) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'candidates', candidateId),
      (doc) => {
        if (doc.exists()) {
          setCandidate({ id: doc.id, ...doc.data() });
        } else {
          setCandidate(null);
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [candidateId]);

  return { candidate, loading, error };
}

// Hook for candidate CRUD operations
export function useCandidateActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Create a new candidate
  const createCandidate = async (candidateData) => {
    setLoading(true);
    setError(null);
    try {
      const docRef = await addDoc(collection(db, 'candidates'), {
        ...candidateData,
        status: CANDIDATE_STATUSES.NEW,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        timeline: [{
          action: 'created',
          status: CANDIDATE_STATUSES.NEW,
          timestamp: new Date().toISOString(),
          note: 'Candidate created'
        }]
      });
      
      // Update job applicant count
      if (candidateData.jobId) {
        await updateDoc(doc(db, 'jobs', candidateData.jobId), {
          applicantCount: increment(1),
          [`statusCounts.${CANDIDATE_STATUSES.NEW}`]: increment(1)
        });
      }
      
      setLoading(false);
      return docRef.id;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  // Update candidate status
  const updateStatus = async (candidateId, newStatus, note = '') => {
    setLoading(true);
    setError(null);
    try {
      const candidateRef = doc(db, 'candidates', candidateId);
      const candidateSnap = await getDoc(candidateRef);
      
      if (!candidateSnap.exists()) {
        throw new Error('Candidate not found');
      }
      
      const candidate = candidateSnap.data();
      const oldStatus = candidate.status;
      
      // Update candidate
      await updateDoc(candidateRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
        timeline: [
          ...(candidate.timeline || []),
          {
            action: 'status_change',
            fromStatus: oldStatus,
            toStatus: newStatus,
            timestamp: new Date().toISOString(),
            note
          }
        ]
      });
      
      // Update job status counts
      if (candidate.jobId) {
        const batch = writeBatch(db);
        const jobRef = doc(db, 'jobs', candidate.jobId);
        batch.update(jobRef, {
          [`statusCounts.${oldStatus}`]: increment(-1),
          [`statusCounts.${newStatus}`]: increment(1)
        });
        await batch.commit();
      }
      
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  // Update candidate details
  const updateCandidate = async (candidateId, data) => {
    setLoading(true);
    setError(null);
    try {
      await updateDoc(doc(db, 'candidates', candidateId), {
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

  // Add note to candidate
  const addNote = async (candidateId, note, userId, userName) => {
    setLoading(true);
    setError(null);
    try {
      const candidateRef = doc(db, 'candidates', candidateId);
      const candidateSnap = await getDoc(candidateRef);
      
      if (!candidateSnap.exists()) {
        throw new Error('Candidate not found');
      }
      
      const candidate = candidateSnap.data();
      
      await updateDoc(candidateRef, {
        notes: [
          ...(candidate.notes || []),
          {
            id: Date.now().toString(),
            content: note,
            createdBy: userId,
            createdByName: userName,
            createdAt: new Date().toISOString()
          }
        ],
        updatedAt: serverTimestamp()
      });
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  // Delete candidate
  const deleteCandidate = async (candidateId) => {
    setLoading(true);
    setError(null);
    try {
      const candidateRef = doc(db, 'candidates', candidateId);
      const candidateSnap = await getDoc(candidateRef);
      
      if (candidateSnap.exists()) {
        const candidate = candidateSnap.data();
        
        // Update job counts
        if (candidate.jobId) {
          await updateDoc(doc(db, 'jobs', candidate.jobId), {
            applicantCount: increment(-1),
            [`statusCounts.${candidate.status}`]: increment(-1)
          });
        }
      }
      
      await deleteDoc(candidateRef);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  // Bulk status update
  const bulkUpdateStatus = async (candidateIds, newStatus, note = '') => {
    setLoading(true);
    setError(null);
    try {
      const batch = writeBatch(db);
      
      for (const id of candidateIds) {
        const candidateRef = doc(db, 'candidates', id);
        const candidateSnap = await getDoc(candidateRef);
        
        if (candidateSnap.exists()) {
          const candidate = candidateSnap.data();
          batch.update(candidateRef, {
            status: newStatus,
            updatedAt: serverTimestamp(),
            timeline: [
              ...(candidate.timeline || []),
              {
                action: 'status_change',
                fromStatus: candidate.status,
                toStatus: newStatus,
                timestamp: new Date().toISOString(),
                note: note || 'Bulk status update'
              }
            ]
          });
        }
      }
      
      await batch.commit();
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  return {
    createCandidate,
    updateStatus,
    updateCandidate,
    addNote,
    deleteCandidate,
    bulkUpdateStatus,
    loading,
    error
  };
}

// Hook for candidate statistics
export function useCandidateStats() {
  const [stats, setStats] = useState({
    total: 0,
    byStatus: {},
    newThisWeek: 0,
    newToday: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'candidates'),
      async (snapshot) => {
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        
        const byStatus = {};
        let newThisWeek = 0;
        let newToday = 0;
        
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          const status = data.status || 'unknown';
          byStatus[status] = (byStatus[status] || 0) + 1;
          
          if (data.createdAt) {
            const createdAt = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
            if (createdAt >= startOfWeek) newThisWeek++;
            if (createdAt >= startOfDay) newToday++;
          }
        });
        
        setStats({
          total: snapshot.docs.length,
          byStatus,
          newThisWeek,
          newToday
        });
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  return { stats, loading };
}

export default useCandidates;
