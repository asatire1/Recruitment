import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  collection,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Event types
export const EVENT_TYPES = {
  INTERVIEW: 'interview',
  TRIAL: 'trial',
  MEETING: 'meeting',
  REMINDER: 'reminder',
  OTHER: 'other'
};

// Event type configuration
export const EVENT_TYPE_CONFIG = {
  [EVENT_TYPES.INTERVIEW]: {
    label: 'Interview',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.1)',
    icon: '🎤',
    defaultDuration: 60
  },
  [EVENT_TYPES.TRIAL]: {
    label: 'Trial Shift',
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.1)',
    icon: '🏥',
    defaultDuration: 240
  },
  [EVENT_TYPES.MEETING]: {
    label: 'Meeting',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.1)',
    icon: '👥',
    defaultDuration: 30
  },
  [EVENT_TYPES.REMINDER]: {
    label: 'Reminder',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    icon: '⏰',
    defaultDuration: 15
  },
  [EVENT_TYPES.OTHER]: {
    label: 'Other',
    color: '#6b7280',
    bgColor: 'rgba(107, 114, 128, 0.1)',
    icon: '📌',
    defaultDuration: 60
  }
};

// Event statuses
export const EVENT_STATUSES = {
  SCHEDULED: 'scheduled',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
  RESCHEDULED: 'rescheduled'
};

export const EVENT_STATUS_CONFIG = {
  [EVENT_STATUSES.SCHEDULED]: { label: 'Scheduled', color: '#3b82f6' },
  [EVENT_STATUSES.CONFIRMED]: { label: 'Confirmed', color: '#10b981' },
  [EVENT_STATUSES.COMPLETED]: { label: 'Completed', color: '#6b7280' },
  [EVENT_STATUSES.CANCELLED]: { label: 'Cancelled', color: '#ef4444' },
  [EVENT_STATUSES.NO_SHOW]: { label: 'No Show', color: '#f59e0b' },
  [EVENT_STATUSES.RESCHEDULED]: { label: 'Rescheduled', color: '#8b5cf6' }
};

// Helper: Get date range for a month view
function getMonthRange(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  start.setDate(start.getDate() - start.getDay()); // Start from Sunday
  
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  end.setDate(end.getDate() + (6 - end.getDay())); // End on Saturday
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
}

// Helper: Get date range for a week view
function getWeekRange(date) {
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
}

// Helper: Get date range for a day view
function getDayRange(date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
}

// Hook for fetching calendar events
export function useCalendarEvents(options = {}) {
  const { 
    view = 'month', 
    currentDate = new Date(),
    eventType = null,
    branchId = null,
    recruiterId = null
  } = options;
  
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Calculate date range based on view
  const dateRange = useMemo(() => {
    switch (view) {
      case 'week':
        return getWeekRange(currentDate);
      case 'day':
        return getDayRange(currentDate);
      case 'month':
      default:
        return getMonthRange(currentDate);
    }
  }, [view, currentDate]);

  useEffect(() => {
    let q = query(
      collection(db, 'events'),
      where('startTime', '>=', Timestamp.fromDate(dateRange.start)),
      where('startTime', '<=', Timestamp.fromDate(dateRange.end)),
      orderBy('startTime', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        let docs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          startTime: doc.data().startTime?.toDate(),
          endTime: doc.data().endTime?.toDate()
        }));

        // Client-side filters
        if (eventType) {
          docs = docs.filter(e => e.type === eventType);
        }
        if (branchId) {
          docs = docs.filter(e => e.branchId === branchId);
        }
        if (recruiterId) {
          docs = docs.filter(e => e.recruiterId === recruiterId);
        }

        setEvents(docs);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching events:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [dateRange, eventType, branchId, recruiterId]);

  return { events, loading, error, dateRange };
}

// Hook for a single event
export function useCalendarEvent(eventId) {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'events', eventId),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setEvent({
            id: doc.id,
            ...data,
            startTime: data.startTime?.toDate(),
            endTime: data.endTime?.toDate()
          });
        } else {
          setEvent(null);
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [eventId]);

  return { event, loading, error };
}

// Hook for calendar event actions
export function useCalendarActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Create event
  const createEvent = async (eventData) => {
    setLoading(true);
    setError(null);
    try {
      const docRef = await addDoc(collection(db, 'events'), {
        ...eventData,
        startTime: Timestamp.fromDate(new Date(eventData.startTime)),
        endTime: Timestamp.fromDate(new Date(eventData.endTime)),
        status: eventData.status || EVENT_STATUSES.SCHEDULED,
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

  // Update event
  const updateEvent = async (eventId, data) => {
    setLoading(true);
    setError(null);
    try {
      const updateData = { ...data, updatedAt: serverTimestamp() };
      
      if (data.startTime) {
        updateData.startTime = Timestamp.fromDate(new Date(data.startTime));
      }
      if (data.endTime) {
        updateData.endTime = Timestamp.fromDate(new Date(data.endTime));
      }
      
      await updateDoc(doc(db, 'events', eventId), updateData);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  // Delete event
  const deleteEvent = async (eventId) => {
    setLoading(true);
    setError(null);
    try {
      await deleteDoc(doc(db, 'events', eventId));
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  // Update event status
  const updateEventStatus = async (eventId, status) => {
    return updateEvent(eventId, { status });
  };

  // Reschedule event
  const rescheduleEvent = async (eventId, newStartTime, newEndTime) => {
    return updateEvent(eventId, {
      startTime: newStartTime,
      endTime: newEndTime,
      status: EVENT_STATUSES.RESCHEDULED,
      rescheduledAt: serverTimestamp()
    });
  };

  // Mark event as completed with notes
  const completeEvent = async (eventId, notes = '') => {
    return updateEvent(eventId, {
      status: EVENT_STATUSES.COMPLETED,
      completionNotes: notes,
      completedAt: serverTimestamp()
    });
  };

  return {
    createEvent,
    updateEvent,
    deleteEvent,
    updateEventStatus,
    rescheduleEvent,
    completeEvent,
    loading,
    error
  };
}

// Hook for getting events for a specific candidate
export function useCandidateEvents(candidateId) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!candidateId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'events'),
      where('candidateId', '==', candidateId),
      orderBy('startTime', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          startTime: doc.data().startTime?.toDate(),
          endTime: doc.data().endTime?.toDate()
        }));
        setEvents(docs);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [candidateId]);

  return { events, loading, error };
}

// Hook for upcoming events (next 7 days)
export function useUpcomingEvents(limit = 10) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);

    const q = query(
      collection(db, 'events'),
      where('startTime', '>=', Timestamp.fromDate(now)),
      where('startTime', '<=', Timestamp.fromDate(nextWeek)),
      where('status', 'in', [EVENT_STATUSES.SCHEDULED, EVENT_STATUSES.CONFIRMED]),
      orderBy('startTime', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.slice(0, limit).map(doc => ({
          id: doc.id,
          ...doc.data(),
          startTime: doc.data().startTime?.toDate(),
          endTime: doc.data().endTime?.toDate()
        }));
        setEvents(docs);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [limit]);

  return { events, loading, error };
}

// Hook for today's events
export function useTodayEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const { start, end } = getDayRange(new Date());

    const q = query(
      collection(db, 'events'),
      where('startTime', '>=', Timestamp.fromDate(start)),
      where('startTime', '<=', Timestamp.fromDate(end)),
      orderBy('startTime', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          startTime: doc.data().startTime?.toDate(),
          endTime: doc.data().endTime?.toDate()
        }));
        setEvents(docs);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  return { events, loading, error };
}

// Utility: Format time for display
export function formatEventTime(date) {
  if (!date) return '';
  return date.toLocaleTimeString('en-GB', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
}

// Utility: Format date for display
export function formatEventDate(date) {
  if (!date) return '';
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });
}

// Utility: Get event duration in minutes
export function getEventDuration(startTime, endTime) {
  if (!startTime || !endTime) return 0;
  return Math.round((endTime - startTime) / (1000 * 60));
}

// Utility: Check if event is in the past
export function isEventPast(event) {
  return event.endTime < new Date();
}

// Utility: Check if event is happening now
export function isEventNow(event) {
  const now = new Date();
  return event.startTime <= now && event.endTime >= now;
}

export default useCalendarEvents;
