import { useState, useEffect, useMemo } from 'react';
import {
  collection,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { EVENT_TYPES, EVENT_STATUSES } from './useCalendar';

// Booking slot durations (in minutes)
export const SLOT_DURATIONS = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
  { value: 240, label: '4 hours' }
];

// Default working hours
export const DEFAULT_WORKING_HOURS = {
  start: '09:00',
  end: '17:00'
};

// Days of the week
export const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' }
];

// Hook for fetching booking links
export function useBookingLinks(options = {}) {
  const { recruiterId = null, active = null } = options;
  
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let q = query(
      collection(db, 'bookingLinks'),
      orderBy('createdAt', 'desc')
    );

    if (recruiterId) {
      q = query(
        collection(db, 'bookingLinks'),
        where('recruiterId', '==', recruiterId),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        let docs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        if (active !== null) {
          docs = docs.filter(l => l.active === active);
        }

        setLinks(docs);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [recruiterId, active]);

  return { links, loading, error };
}

// Hook for a single booking link (by ID or slug)
export function useBookingLink(identifier) {
  const [link, setLink] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!identifier) {
      setLoading(false);
      return;
    }

    // First try to get by ID
    const fetchLink = async () => {
      try {
        // Try by document ID first
        const docSnap = await getDoc(doc(db, 'bookingLinks', identifier));
        
        if (docSnap.exists()) {
          setLink({ id: docSnap.id, ...docSnap.data() });
          setLoading(false);
          return;
        }

        // Try by slug
        const q = query(
          collection(db, 'bookingLinks'),
          where('slug', '==', identifier)
        );
        const querySnap = await getDocs(q);
        
        if (!querySnap.empty) {
          const doc = querySnap.docs[0];
          setLink({ id: doc.id, ...doc.data() });
        } else {
          setLink(null);
        }
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchLink();
  }, [identifier]);

  return { link, loading, error };
}

// Hook for booking link actions
export function useBookingLinkActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Create booking link
  const createBookingLink = async (linkData) => {
    setLoading(true);
    setError(null);
    try {
      // Generate slug if not provided
      const slug = linkData.slug || generateSlug(linkData.title);
      
      const docRef = await addDoc(collection(db, 'bookingLinks'), {
        ...linkData,
        slug,
        active: true,
        bookingCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setLoading(false);
      return { id: docRef.id, slug };
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  // Update booking link
  const updateBookingLink = async (linkId, data) => {
    setLoading(true);
    setError(null);
    try {
      await updateDoc(doc(db, 'bookingLinks', linkId), {
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

  // Toggle booking link active status
  const toggleBookingLink = async (linkId, active) => {
    return updateBookingLink(linkId, { active });
  };

  // Delete booking link
  const deleteBookingLink = async (linkId) => {
    setLoading(true);
    setError(null);
    try {
      await updateDoc(doc(db, 'bookingLinks', linkId), {
        active: false,
        deletedAt: serverTimestamp()
      });
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  return {
    createBookingLink,
    updateBookingLink,
    toggleBookingLink,
    deleteBookingLink,
    loading,
    error
  };
}

// Hook for getting available time slots
export function useAvailableSlots(options = {}) {
  const {
    bookingLinkId,
    date,
    duration = 60
  } = options;

  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bookingLink, setBookingLink] = useState(null);

  useEffect(() => {
    if (!bookingLinkId || !date) {
      setLoading(false);
      return;
    }

    const fetchSlots = async () => {
      try {
        // Get booking link settings
        const linkDoc = await getDoc(doc(db, 'bookingLinks', bookingLinkId));
        if (!linkDoc.exists()) {
          setError('Booking link not found');
          setLoading(false);
          return;
        }
        
        const linkData = { id: linkDoc.id, ...linkDoc.data() };
        setBookingLink(linkData);

        // Check if the day is available
        const dayOfWeek = date.getDay();
        const availableDays = linkData.availableDays || [1, 2, 3, 4, 5]; // Mon-Fri default
        
        if (!availableDays.includes(dayOfWeek)) {
          setSlots([]);
          setLoading(false);
          return;
        }

        // Get existing events for the day
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        const eventsQuery = query(
          collection(db, 'events'),
          where('recruiterId', '==', linkData.recruiterId),
          where('startTime', '>=', Timestamp.fromDate(dayStart)),
          where('startTime', '<=', Timestamp.fromDate(dayEnd)),
          where('status', 'in', [EVENT_STATUSES.SCHEDULED, EVENT_STATUSES.CONFIRMED])
        );

        const eventsSnap = await getDocs(eventsQuery);
        const existingEvents = eventsSnap.docs.map(doc => ({
          startTime: doc.data().startTime.toDate(),
          endTime: doc.data().endTime.toDate()
        }));

        // Generate available slots
        const workingHours = linkData.workingHours || DEFAULT_WORKING_HOURS;
        const slotDuration = linkData.duration || duration;
        const bufferTime = linkData.bufferTime || 0;

        const availableSlots = generateTimeSlots(
          date,
          workingHours,
          slotDuration,
          bufferTime,
          existingEvents
        );

        setSlots(availableSlots);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchSlots();
  }, [bookingLinkId, date?.toDateString(), duration]);

  return { slots, loading, error, bookingLink };
}

// Hook for submitting a booking
export function useBookingSubmit() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const submitBooking = async (bookingData) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const {
        bookingLinkId,
        candidateId,
        candidateName,
        candidateEmail,
        candidatePhone,
        startTime,
        duration,
        notes,
        eventType = EVENT_TYPES.INTERVIEW
      } = bookingData;

      // Get booking link for context
      const linkDoc = await getDoc(doc(db, 'bookingLinks', bookingLinkId));
      if (!linkDoc.exists()) {
        throw new Error('Booking link not found');
      }
      const linkData = linkDoc.data();

      // Calculate end time
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + duration);

      // Create the event
      const eventData = {
        type: eventType,
        title: `${eventType === EVENT_TYPES.INTERVIEW ? 'Interview' : 'Trial'} - ${candidateName}`,
        startTime: Timestamp.fromDate(new Date(startTime)),
        endTime: Timestamp.fromDate(endTime),
        status: EVENT_STATUSES.SCHEDULED,
        candidateId: candidateId || null,
        candidateName,
        candidateEmail,
        candidatePhone,
        recruiterId: linkData.recruiterId,
        recruiterName: linkData.recruiterName,
        branchId: linkData.branchId || null,
        branchName: linkData.branchName || null,
        jobId: linkData.jobId || null,
        jobTitle: linkData.jobTitle || null,
        bookingLinkId,
        notes: notes || '',
        bookedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const eventRef = await addDoc(collection(db, 'events'), eventData);

      // Increment booking count on the link
      await updateDoc(doc(db, 'bookingLinks', bookingLinkId), {
        bookingCount: (linkData.bookingCount || 0) + 1,
        lastBookingAt: serverTimestamp()
      });

      setSuccess(true);
      setLoading(false);
      
      return {
        eventId: eventRef.id,
        startTime: new Date(startTime),
        endTime,
        recruiterName: linkData.recruiterName,
        branchName: linkData.branchName
      };
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  const reset = () => {
    setSuccess(false);
    setError(null);
  };

  return { submitBooking, loading, error, success, reset };
}

// Utility: Generate time slots for a day
function generateTimeSlots(date, workingHours, duration, bufferTime, existingEvents) {
  const slots = [];
  const now = new Date();
  
  // Parse working hours
  const [startHour, startMin] = workingHours.start.split(':').map(Number);
  const [endHour, endMin] = workingHours.end.split(':').map(Number);
  
  // Create start time
  const slotStart = new Date(date);
  slotStart.setHours(startHour, startMin, 0, 0);
  
  // Create end time (last possible slot start)
  const dayEnd = new Date(date);
  dayEnd.setHours(endHour, endMin, 0, 0);
  dayEnd.setMinutes(dayEnd.getMinutes() - duration);
  
  // Generate slots
  while (slotStart <= dayEnd) {
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotEnd.getMinutes() + duration);
    
    // Check if slot is in the past
    const isPast = slotStart < now;
    
    // Check if slot conflicts with existing events
    const hasConflict = existingEvents.some(event => {
      const eventStart = new Date(event.startTime);
      const eventEnd = new Date(event.endTime);
      // Add buffer time
      eventStart.setMinutes(eventStart.getMinutes() - bufferTime);
      eventEnd.setMinutes(eventEnd.getMinutes() + bufferTime);
      
      return (slotStart < eventEnd && slotEnd > eventStart);
    });
    
    slots.push({
      startTime: new Date(slotStart),
      endTime: new Date(slotEnd),
      available: !isPast && !hasConflict,
      isPast,
      hasConflict
    });
    
    // Move to next slot
    slotStart.setMinutes(slotStart.getMinutes() + duration);
  }
  
  return slots;
}

// Utility: Generate URL-friendly slug
function generateSlug(title) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 30);
  
  const random = Math.random().toString(36).substring(2, 8);
  return `${base}-${random}`;
}

// Utility: Generate booking URL
export function getBookingUrl(slug) {
  const baseUrl = window.location.origin;
  return `${baseUrl}/book/${slug}`;
}

// Utility: Format slot time for display
export function formatSlotTime(date) {
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

// Utility: Get next N available dates
export function getNextAvailableDates(availableDays = [1, 2, 3, 4, 5], count = 14) {
  const dates = [];
  const current = new Date();
  current.setHours(0, 0, 0, 0);
  
  // Start from tomorrow
  current.setDate(current.getDate() + 1);
  
  while (dates.length < count) {
    if (availableDays.includes(current.getDay())) {
      dates.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

export default useAvailableSlots;
