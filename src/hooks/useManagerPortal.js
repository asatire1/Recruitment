import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  limit
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

// Review decision types
export const REVIEW_DECISION = {
  APPROVE: 'approve',
  REJECT: 'reject',
  REQUEST_INFO: 'request_info',
  SCHEDULE_INTERVIEW: 'schedule_interview',
  SCHEDULE_TRIAL: 'schedule_trial'
};

// Review status for candidates
export const REVIEW_STATUS = {
  PENDING: 'pending_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  INFO_REQUESTED: 'info_requested'
};

// Hook for pending reviews
export function usePendingReviews() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?.branchId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Query candidates pending review at this branch
    const q = query(
      collection(db, 'candidates'),
      where('branchId', '==', user.branchId),
      where('status', 'in', ['new', 'screening', 'interview', 'trial']),
      where('managerReviewStatus', '==', REVIEW_STATUS.PENDING),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setReviews(items);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching pending reviews:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user?.branchId]);

  return { reviews, loading, error, count: reviews.length };
}

// Hook for review actions
export function useReviewActions() {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const submitReview = useCallback(async (candidateId, decision, notes = '') => {
    if (!user?.uid || !candidateId) return false;

    setSubmitting(true);
    setError(null);

    try {
      const candidateRef = doc(db, 'candidates', candidateId);
      
      const updateData = {
        managerReviewStatus: decision === REVIEW_DECISION.APPROVE 
          ? REVIEW_STATUS.APPROVED 
          : decision === REVIEW_DECISION.REJECT
            ? REVIEW_STATUS.REJECTED
            : REVIEW_STATUS.INFO_REQUESTED,
        managerReviewedBy: user.uid,
        managerReviewedByName: user.displayName || user.email,
        managerReviewedAt: serverTimestamp(),
        managerReviewNotes: notes,
        managerDecision: decision,
        updatedAt: serverTimestamp()
      };

      // Update candidate status based on decision
      if (decision === REVIEW_DECISION.APPROVE) {
        updateData.status = 'approved';
      } else if (decision === REVIEW_DECISION.REJECT) {
        updateData.status = 'rejected';
      } else if (decision === REVIEW_DECISION.SCHEDULE_INTERVIEW) {
        updateData.status = 'interview';
      } else if (decision === REVIEW_DECISION.SCHEDULE_TRIAL) {
        updateData.status = 'trial';
      }

      await updateDoc(candidateRef, updateData);
      setSubmitting(false);
      return true;
    } catch (err) {
      console.error('Review submission error:', err);
      setError(err.message);
      setSubmitting(false);
      return false;
    }
  }, [user]);

  return { submitReview, submitting, error };
}

// Hook for manager's schedule
export function useManagerSchedule(dateRange = 'today') {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Calculate date range
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);

    switch (dateRange) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'tomorrow':
        start.setDate(start.getDate() + 1);
        start.setHours(0, 0, 0, 0);
        end.setDate(end.getDate() + 1);
        end.setHours(23, 59, 59, 999);
        break;
      case 'week':
        start.setHours(0, 0, 0, 0);
        end.setDate(end.getDate() + 7);
        end.setHours(23, 59, 59, 999);
        break;
      default:
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
    }

    return { startDate: start, endDate: end };
  }, [dateRange]);

  useEffect(() => {
    if (!user?.branchId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, 'events'),
      where('branchId', '==', user.branchId),
      where('startTime', '>=', Timestamp.fromDate(startDate)),
      where('startTime', '<=', Timestamp.fromDate(endDate)),
      where('status', 'in', ['scheduled', 'confirmed']),
      orderBy('startTime', 'asc')
    );

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          startTime: doc.data().startTime?.toDate(),
          endTime: doc.data().endTime?.toDate()
        }));
        setEvents(items);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching schedule:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user?.branchId, startDate, endDate]);

  // Group events by time
  const groupedEvents = useMemo(() => {
    const groups = {
      morning: [],    // Before 12:00
      afternoon: [],  // 12:00 - 17:00
      evening: []     // After 17:00
    };

    events.forEach(event => {
      const hour = event.startTime?.getHours() || 0;
      if (hour < 12) {
        groups.morning.push(event);
      } else if (hour < 17) {
        groups.afternoon.push(event);
      } else {
        groups.evening.push(event);
      }
    });

    return groups;
  }, [events]);

  return { 
    events, 
    groupedEvents,
    loading, 
    error, 
    count: events.length,
    startDate,
    endDate
  };
}

// Hook for manager dashboard stats
export function useManagerDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    pendingReviews: 0,
    todayEvents: 0,
    weekEvents: 0,
    recentHires: 0,
    activeJobs: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.branchId) {
      setLoading(false);
      return;
    }

    const unsubscribers = [];

    // Pending reviews count
    const reviewsQuery = query(
      collection(db, 'candidates'),
      where('branchId', '==', user.branchId),
      where('managerReviewStatus', '==', REVIEW_STATUS.PENDING),
      limit(100)
    );
    
    unsubscribers.push(
      onSnapshot(reviewsQuery, (snapshot) => {
        setStats(prev => ({ ...prev, pendingReviews: snapshot.size }));
      })
    );

    // Today's events
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayQuery = query(
      collection(db, 'events'),
      where('branchId', '==', user.branchId),
      where('startTime', '>=', Timestamp.fromDate(today)),
      where('startTime', '<', Timestamp.fromDate(tomorrow)),
      where('status', 'in', ['scheduled', 'confirmed'])
    );

    unsubscribers.push(
      onSnapshot(todayQuery, (snapshot) => {
        setStats(prev => ({ ...prev, todayEvents: snapshot.size }));
      })
    );

    // This week's events
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const weekQuery = query(
      collection(db, 'events'),
      where('branchId', '==', user.branchId),
      where('startTime', '>=', Timestamp.fromDate(today)),
      where('startTime', '<', Timestamp.fromDate(weekEnd)),
      where('status', 'in', ['scheduled', 'confirmed'])
    );

    unsubscribers.push(
      onSnapshot(weekQuery, (snapshot) => {
        setStats(prev => ({ ...prev, weekEvents: snapshot.size }));
      })
    );

    // Recent hires (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const hiresQuery = query(
      collection(db, 'candidates'),
      where('branchId', '==', user.branchId),
      where('status', '==', 'hired'),
      where('hiredAt', '>=', Timestamp.fromDate(thirtyDaysAgo))
    );

    unsubscribers.push(
      onSnapshot(hiresQuery, (snapshot) => {
        setStats(prev => ({ ...prev, recentHires: snapshot.size }));
      })
    );

    // Active jobs
    const jobsQuery = query(
      collection(db, 'jobs'),
      where('branchId', '==', user.branchId),
      where('status', '==', 'open')
    );

    unsubscribers.push(
      onSnapshot(jobsQuery, (snapshot) => {
        setStats(prev => ({ ...prev, activeJobs: snapshot.size }));
        setLoading(false);
      })
    );

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [user?.branchId]);

  return { stats, loading };
}

// Hook for event actions (confirm, complete, no-show)
export function useEventActions() {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const updateEventStatus = useCallback(async (eventId, status, notes = '') => {
    if (!user?.uid || !eventId) return false;

    setSubmitting(true);
    setError(null);

    try {
      const eventRef = doc(db, 'events', eventId);
      
      const updateData = {
        status,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
        updatedByName: user.displayName || user.email
      };

      if (status === 'completed') {
        updateData.completedAt = serverTimestamp();
        updateData.completionNotes = notes;
      } else if (status === 'no_show') {
        updateData.noShowAt = serverTimestamp();
        updateData.noShowNotes = notes;
      } else if (status === 'confirmed') {
        updateData.confirmedAt = serverTimestamp();
        updateData.confirmedBy = user.uid;
      }

      await updateDoc(eventRef, updateData);
      setSubmitting(false);
      return true;
    } catch (err) {
      console.error('Event update error:', err);
      setError(err.message);
      setSubmitting(false);
      return false;
    }
  }, [user]);

  const confirmEvent = useCallback((eventId) => {
    return updateEventStatus(eventId, 'confirmed');
  }, [updateEventStatus]);

  const completeEvent = useCallback((eventId, notes) => {
    return updateEventStatus(eventId, 'completed', notes);
  }, [updateEventStatus]);

  const markNoShow = useCallback((eventId, notes) => {
    return updateEventStatus(eventId, 'no_show', notes);
  }, [updateEventStatus]);

  const cancelEvent = useCallback((eventId, reason) => {
    return updateEventStatus(eventId, 'cancelled', reason);
  }, [updateEventStatus]);

  return {
    confirmEvent,
    completeEvent,
    markNoShow,
    cancelEvent,
    submitting,
    error
  };
}

// Hook for quick candidate lookup
export function useCandidateLookup(candidateId) {
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!candidateId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribe = onSnapshot(
      doc(db, 'candidates', candidateId),
      (snapshot) => {
        if (snapshot.exists()) {
          setCandidate({ id: snapshot.id, ...snapshot.data() });
        } else {
          setCandidate(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Candidate lookup error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [candidateId]);

  return { candidate, loading, error };
}

export default usePendingReviews;
