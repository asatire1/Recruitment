import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Hook for main dashboard statistics
export function useDashboardStats() {
  const [stats, setStats] = useState({
    totalCandidates: 0,
    newThisWeek: 0,
    newToday: 0,
    activeJobs: 0,
    upcomingInterviews: 0,
    pendingFeedback: 0,
    pipelineBreakdown: {
      new: 0,
      screening: 0,
      interview: 0,
      trial: 0,
      approved: 0,
      rejected: 0
    },
    conversionRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Get date boundaries
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    // Listen to candidates collection
    const candidatesUnsubscribe = onSnapshot(
      collection(db, 'candidates'),
      (snapshot) => {
        const pipelineBreakdown = {
          new: 0,
          screening: 0,
          interview: 0,
          trial: 0,
          approved: 0,
          rejected: 0
        };
        
        let newThisWeek = 0;
        let newToday = 0;
        let hired = 0;

        snapshot.docs.forEach(doc => {
          const data = doc.data();
          const status = data.status || 'new';
          
          // Count by status
          if (pipelineBreakdown.hasOwnProperty(status)) {
            pipelineBreakdown[status]++;
          }
          
          if (status === 'hired') {
            hired++;
          }
          
          // Count new this week/today
          if (data.createdAt) {
            const createdAt = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
            if (createdAt >= startOfWeek) newThisWeek++;
            if (createdAt >= startOfDay) newToday++;
          }
        });

        const totalCandidates = snapshot.docs.length;
        const conversionRate = totalCandidates > 0 
          ? Math.round((hired / totalCandidates) * 100) 
          : 0;

        setStats(prev => ({
          ...prev,
          totalCandidates,
          newThisWeek,
          newToday,
          pipelineBreakdown,
          conversionRate
        }));
      },
      (err) => {
        console.error('Error fetching candidate stats:', err);
        setError(err.message);
      }
    );

    // Listen to jobs collection for active jobs count
    const jobsUnsubscribe = onSnapshot(
      query(collection(db, 'jobs'), where('status', '==', 'active')),
      (snapshot) => {
        setStats(prev => ({
          ...prev,
          activeJobs: snapshot.docs.length
        }));
      }
    );

    // Listen to interviews collection for upcoming interviews
    const interviewsUnsubscribe = onSnapshot(
      query(
        collection(db, 'interviews'),
        where('scheduledAt', '>=', Timestamp.now()),
        where('status', '==', 'scheduled')
      ),
      (snapshot) => {
        setStats(prev => ({
          ...prev,
          upcomingInterviews: snapshot.docs.length
        }));
      },
      // If interviews collection doesn't exist, just ignore
      () => {}
    );

    setLoading(false);

    return () => {
      candidatesUnsubscribe();
      jobsUnsubscribe();
      interviewsUnsubscribe();
    };
  }, []);

  return { stats, loading, error };
}

// Hook for recent activity feed
export function useRecentActivity(limitCount = 10) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const q = query(
      collection(db, 'activities'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setActivities(docs);
        setLoading(false);
      },
      (err) => {
        // If collection doesn't exist, generate activities from candidates
        console.log('Activities collection not found, generating from candidates');
        generateActivitiesFromCandidates();
      }
    );

    return unsubscribe;
  }, [limitCount]);

  // Fallback: generate activities from candidate timeline
  const generateActivitiesFromCandidates = () => {
    const q = query(
      collection(db, 'candidates'),
      orderBy('updatedAt', 'desc'),
      limit(20)
    );

    onSnapshot(q, (snapshot) => {
      const generatedActivities = [];
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const timeline = data.timeline || [];
        
        // Get most recent timeline entry
        if (timeline.length > 0) {
          const lastEntry = timeline[timeline.length - 1];
          generatedActivities.push({
            id: `${doc.id}-${timeline.length}`,
            type: lastEntry.action,
            candidateId: doc.id,
            candidateName: data.name,
            description: getActivityDescription(lastEntry, data.name),
            createdAt: lastEntry.timestamp,
            metadata: {
              fromStatus: lastEntry.fromStatus,
              toStatus: lastEntry.toStatus
            }
          });
        }
      });

      // Sort by timestamp and limit
      generatedActivities.sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      );

      setActivities(generatedActivities.slice(0, limitCount));
      setLoading(false);
    });
  };

  return { activities, loading, error };
}

// Helper function to generate activity descriptions
function getActivityDescription(entry, candidateName) {
  switch (entry.action) {
    case 'created':
      return `<strong>${candidateName}</strong> was added as a new candidate`;
    case 'status_change':
      return `<strong>${candidateName}</strong> moved from ${formatStatus(entry.fromStatus)} to ${formatStatus(entry.toStatus)}`;
    case 'note_added':
      return `Note added to <strong>${candidateName}</strong>'s profile`;
    case 'interview_scheduled':
      return `Interview scheduled for <strong>${candidateName}</strong>`;
    case 'trial_scheduled':
      return `Trial scheduled for <strong>${candidateName}</strong>`;
    case 'feedback_submitted':
      return `Feedback submitted for <strong>${candidateName}</strong>`;
    default:
      return `Activity on <strong>${candidateName}</strong>'s profile`;
  }
}

// Helper to format status labels
function formatStatus(status) {
  const statusLabels = {
    new: 'New',
    screening: 'Screening',
    interview: 'Interview',
    trial: 'Trial',
    approved: 'Approved',
    rejected: 'Rejected',
    hired: 'Hired',
    withdrawn: 'Withdrawn'
  };
  return statusLabels[status] || status;
}

// Hook for upcoming interviews
export function useUpcomingInterviews(limitCount = 5) {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Try to fetch from interviews collection
    const q = query(
      collection(db, 'interviews'),
      where('scheduledAt', '>=', Timestamp.now()),
      where('status', '==', 'scheduled'),
      orderBy('scheduledAt', 'asc'),
      limit(limitCount)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setInterviews(docs);
        setLoading(false);
      },
      (err) => {
        // If collection doesn't exist, fetch from candidates with interview status
        fetchInterviewsFromCandidates();
      }
    );

    return unsubscribe;
  }, [limitCount]);

  // Fallback: get candidates in interview status
  const fetchInterviewsFromCandidates = () => {
    const q = query(
      collection(db, 'candidates'),
      where('status', '==', 'interview'),
      orderBy('updatedAt', 'desc'),
      limit(limitCount)
    );

    onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          candidateId: doc.id,
          candidateName: data.name,
          jobTitle: data.jobTitle || 'Position',
          type: 'interview',
          scheduledAt: data.interviewDate || data.updatedAt,
          location: data.interviewLocation || 'TBC',
          status: 'scheduled'
        };
      });
      setInterviews(docs);
      setLoading(false);
    });
  };

  return { interviews, loading, error };
}

// Hook for upcoming trials
export function useUpcomingTrials(limitCount = 5) {
  const [trials, setTrials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch candidates in trial status
    const q = query(
      collection(db, 'candidates'),
      where('status', '==', 'trial'),
      orderBy('updatedAt', 'desc'),
      limit(limitCount)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          candidateId: doc.id,
          candidateName: data.name,
          jobTitle: data.jobTitle || 'Position',
          branchName: data.branchName || 'Branch TBC',
          scheduledAt: data.trialDate || data.updatedAt,
          status: 'scheduled'
        };
      });
      setTrials(docs);
      setLoading(false);
    });

    return unsubscribe;
  }, [limitCount]);

  return { trials, loading };
}

// Hook for top performing jobs (most applicants)
export function useTopJobs(limitCount = 5) {
  const [topJobs, setTopJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'jobs'),
      where('status', '==', 'active'),
      orderBy('applicantCount', 'desc'),
      limit(limitCount)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTopJobs(docs);
      setLoading(false);
    });

    return unsubscribe;
  }, [limitCount]);

  return { topJobs, loading };
}

// Hook for pipeline summary by entity
export function usePipelineByEntity() {
  const [pipelineData, setPipelineData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'candidates'),
      (snapshot) => {
        const entityData = {};

        snapshot.docs.forEach(doc => {
          const data = doc.data();
          const entityId = data.entityId || 'unassigned';
          const entityName = data.entityName || 'Unassigned';
          const status = data.status || 'new';

          if (!entityData[entityId]) {
            entityData[entityId] = {
              entityId,
              entityName,
              total: 0,
              new: 0,
              screening: 0,
              interview: 0,
              trial: 0,
              approved: 0,
              rejected: 0,
              hired: 0
            };
          }

          entityData[entityId].total++;
          if (entityData[entityId].hasOwnProperty(status)) {
            entityData[entityId][status]++;
          }
        });

        setPipelineData(Object.values(entityData));
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  return { pipelineData, loading };
}

// Combined dashboard hook for convenience
export function useDashboard() {
  const { stats, loading: statsLoading, error: statsError } = useDashboardStats();
  const { activities, loading: activitiesLoading } = useRecentActivity(8);
  const { interviews, loading: interviewsLoading } = useUpcomingInterviews(5);
  const { trials, loading: trialsLoading } = useUpcomingTrials(5);
  const { topJobs, loading: jobsLoading } = useTopJobs(5);

  return {
    stats,
    activities,
    interviews,
    trials,
    topJobs,
    loading: statsLoading || activitiesLoading || interviewsLoading || trialsLoading || jobsLoading,
    error: statsError
  };
}

export default useDashboard;
