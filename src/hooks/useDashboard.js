import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit,
  getDocs,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';

/**
 * Hook for dashboard statistics
 */
export function useDashboardStats() {
  const [stats, setStats] = useState({
    candidates: { total: 0, new: 0, inProgress: 0, approved: 0 },
    jobs: { total: 0, active: 0 },
    interviews: { today: 0, upcoming: 0 },
    loading: true
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        // Candidates stats
        const candidatesRef = collection(db, 'candidates');
        const candidatesSnap = await getDocs(candidatesRef);
        
        let candidateStats = { total: 0, new: 0, inProgress: 0, approved: 0 };
        candidatesSnap.docs.forEach(doc => {
          const data = doc.data();
          candidateStats.total++;
          if (data.status === 'new') candidateStats.new++;
          else if (data.status === 'approved') candidateStats.approved++;
          else if (!['rejected', 'withdrawn'].includes(data.status)) candidateStats.inProgress++;
        });

        // Jobs stats
        const jobsRef = collection(db, 'jobs');
        const jobsSnap = await getDocs(jobsRef);
        
        let jobStats = { total: 0, active: 0 };
        jobsSnap.docs.forEach(doc => {
          const data = doc.data();
          jobStats.total++;
          if (data.status === 'active') jobStats.active++;
        });

        // Interviews stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);

        const interviewsRef = collection(db, 'interviews');
        
        // Today's interviews
        const todayQuery = query(
          interviewsRef,
          where('status', '==', 'scheduled'),
          where('dateTime', '>=', Timestamp.fromDate(today)),
          where('dateTime', '<', Timestamp.fromDate(tomorrow))
        );
        const todaySnap = await getDocs(todayQuery);
        
        // Upcoming (next 7 days)
        const upcomingQuery = query(
          interviewsRef,
          where('status', '==', 'scheduled'),
          where('dateTime', '>=', Timestamp.fromDate(today)),
          where('dateTime', '<', Timestamp.fromDate(nextWeek))
        );
        const upcomingSnap = await getDocs(upcomingQuery);

        setStats({
          candidates: candidateStats,
          jobs: jobStats,
          interviews: { 
            today: todaySnap.docs.length, 
            upcoming: upcomingSnap.docs.length 
          },
          loading: false
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        setStats(prev => ({ ...prev, loading: false }));
      }
    }

    fetchStats();
  }, []);

  return stats;
}

/**
 * Hook for recent candidates (real-time)
 */
export function useRecentCandidates(limitCount = 5) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const candidatesRef = collection(db, 'candidates');
    const q = query(
      candidatesRef,
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCandidates(data);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching recent candidates:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [limitCount]);

  return { candidates, loading };
}

/**
 * Hook for upcoming interviews (real-time)
 */
export function useUpcomingInterviews(limitCount = 5) {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const interviewsRef = collection(db, 'interviews');
    const now = Timestamp.now();
    
    const q = query(
      interviewsRef,
      where('status', '==', 'scheduled'),
      where('dateTime', '>=', now),
      orderBy('dateTime', 'asc'),
      limit(limitCount)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setInterviews(data);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching upcoming interviews:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [limitCount]);

  return { interviews, loading };
}

/**
 * Hook for today's interviews (real-time)
 */
export function useTodaysInterviews() {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const interviewsRef = collection(db, 'interviews');
    const q = query(
      interviewsRef,
      where('status', '==', 'scheduled'),
      where('dateTime', '>=', Timestamp.fromDate(today)),
      where('dateTime', '<', Timestamp.fromDate(tomorrow)),
      orderBy('dateTime', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setInterviews(data);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching today\'s interviews:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { interviews, loading };
}

/**
 * Hook for recent activity across all candidates
 */
export function useRecentActivity(limitCount = 10) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Note: Firestore doesn't support collection group queries well without setup
    // For now, we'll fetch recent candidates and their latest activity
    async function fetchActivity() {
      try {
        const candidatesRef = collection(db, 'candidates');
        const q = query(
          candidatesRef,
          orderBy('updatedAt', 'desc'),
          limit(limitCount)
        );
        
        const snapshot = await getDocs(q);
        const recentActivity = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            candidateId: doc.id,
            candidateName: `${data.firstName} ${data.lastName}`,
            status: data.status,
            jobTitle: data.jobTitle,
            updatedAt: data.updatedAt
          };
        });
        
        setActivities(recentActivity);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching recent activity:', error);
        setLoading(false);
      }
    }

    fetchActivity();
  }, [limitCount]);

  return { activities, loading };
}
