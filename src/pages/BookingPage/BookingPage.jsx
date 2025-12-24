import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Building2,
  User,
  Briefcase
} from 'lucide-react';
import { doc, getDoc, collection, query, where, getDocs, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import './BookingPage.css';

export default function BookingPage() {
  const { token } = useParams();
  
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bookingData, setBookingData] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [existingBookings, setExistingBookings] = useState([]);
  
  // Selection state
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Booking state
  const [isBooking, setIsBooking] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  // Load booking data
  useEffect(() => {
    loadBookingData();
  }, [token]);

  const loadBookingData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get booking link data
      const linkDoc = await getDoc(doc(db, 'bookingLinks', token));
      if (!linkDoc.exists()) {
        setError('This booking link is invalid or has expired.');
        return;
      }

      const linkData = linkDoc.data();
      
      // Check if expired
      if (linkData.expiresAt && linkData.expiresAt.toDate() < new Date()) {
        setError('This booking link has expired. Please request a new one.');
        return;
      }

      // Check if already used
      if (linkData.used) {
        setError('This booking link has already been used.');
        setConfirmedBooking(linkData.bookedSlot);
        setBookingComplete(true);
        return;
      }

      // Get candidate data
      const candidateDoc = await getDoc(doc(db, 'candidates', linkData.candidateId));
      const candidateData = candidateDoc.exists() ? candidateDoc.data() : null;

      // Get job data if linked
      let jobData = null;
      if (linkData.jobId) {
        const jobDoc = await getDoc(doc(db, 'jobs', linkData.jobId));
        jobData = jobDoc.exists() ? jobDoc.data() : null;
      }

      // Get availability settings
      const availDoc = await getDoc(doc(db, 'settings', 'bookingAvailability'));
      if (!availDoc.exists()) {
        setError('Booking is not configured. Please contact the recruiter.');
        return;
      }

      const availData = availDoc.data();
      const typeAvailability = availData[linkData.type]; // 'interview' or 'trial'
      
      if (!typeAvailability?.enabled) {
        setError(`Online booking for ${linkData.type}s is currently disabled.`);
        return;
      }

      // Get existing bookings to exclude
      const bookingsQuery = query(
        collection(db, 'interviews'),
        where('status', 'in', ['scheduled', 'confirmed'])
      );
      const bookingsSnapshot = await getDocs(bookingsQuery);
      const bookings = bookingsSnapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));

      setBookingData({
        ...linkData,
        candidate: candidateData,
        job: jobData
      });
      setAvailability(typeAvailability);
      setExistingBookings(bookings);

    } catch (err) {
      console.error('Error loading booking data:', err);
      setError('Failed to load booking information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Generate calendar days
  const calendarDays = useMemo(() => {
    if (!availability) return [];

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Monday start
    
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + availability.bookingWindow);

    // Add padding days from previous month
    for (let i = startPadding - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({ date, isCurrentMonth: false, isAvailable: false });
    }

    // Add days of current month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      const dayOfWeek = date.getDay();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[dayOfWeek];
      
      const daySettings = availability.days[dayName];
      const dateStr = date.toISOString().split('T')[0];
      
      const isAvailable = 
        date >= today &&
        date <= maxDate &&
        daySettings?.enabled &&
        !availability.excludedDates?.includes(dateStr);

      days.push({ 
        date, 
        isCurrentMonth: true, 
        isAvailable,
        daySettings 
      });
    }

    // Add padding days from next month
    const remainingDays = 42 - days.length; // 6 rows × 7 days
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ date, isCurrentMonth: false, isAvailable: false });
    }

    return days;
  }, [currentMonth, availability]);

  // Generate available time slots for selected date
  const availableSlots = useMemo(() => {
    if (!selectedDate || !availability) return [];

    const dayOfWeek = selectedDate.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];
    const daySettings = availability.days[dayName];

    if (!daySettings?.enabled) return [];

    const slots = [];
    const slotDuration = availability.slotDuration;
    const dateStr = selectedDate.toISOString().split('T')[0];

    daySettings.slots.forEach(({ start, end }) => {
      const [startHour, startMin] = start.split(':').map(Number);
      const [endHour, endMin] = end.split(':').map(Number);
      
      let currentTime = startHour * 60 + startMin;
      const endTime = endHour * 60 + endMin;

      while (currentTime + slotDuration <= endTime) {
        const hour = Math.floor(currentTime / 60);
        const min = currentTime % 60;
        const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
        
        // Check if slot is already booked
        const slotStart = new Date(selectedDate);
        slotStart.setHours(hour, min, 0, 0);
        
        const isBooked = existingBookings.some(booking => {
          const bookingDate = booking.dateTime?.toDate?.() || new Date(booking.dateTime);
          return bookingDate.getTime() === slotStart.getTime();
        });

        // Check if slot is in the past
        const now = new Date();
        const isPast = slotStart <= now;

        if (!isBooked && !isPast) {
          slots.push({
            time: timeStr,
            display: formatTime(hour, min),
            dateTime: slotStart
          });
        }

        currentTime += slotDuration;
      }
    });

    return slots;
  }, [selectedDate, availability, existingBookings]);

  const formatTime = (hour, min) => {
    const period = hour >= 12 ? 'pm' : 'am';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${min.toString().padStart(2, '0')}${period}`;
  };

  const handleDateSelect = (day) => {
    if (day.isAvailable) {
      setSelectedDate(day.date);
      setSelectedTime(null);
    }
  };

  const handleTimeSelect = (slot) => {
    setSelectedTime(slot);
  };

  const handleConfirmBooking = async () => {
    if (!selectedTime || !bookingData) return;

    setIsBooking(true);
    try {
      // Create interview/trial record
      const interviewData = {
        candidateId: bookingData.candidateId,
        candidateName: bookingData.candidate 
          ? `${bookingData.candidate.firstName} ${bookingData.candidate.lastName}`
          : 'Unknown',
        jobId: bookingData.jobId || null,
        jobTitle: bookingData.job?.title || bookingData.jobTitle || null,
        type: bookingData.type,
        dateTime: selectedTime.dateTime,
        duration: availability.slotDuration,
        status: 'scheduled',
        location: bookingData.location || 'TBC',
        bookedBy: 'candidate',
        bookingToken: token,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const interviewRef = await addDoc(collection(db, 'interviews'), interviewData);

      // Update booking link as used
      await updateDoc(doc(db, 'bookingLinks', token), {
        used: true,
        usedAt: serverTimestamp(),
        interviewId: interviewRef.id,
        bookedSlot: {
          date: selectedDate.toISOString().split('T')[0],
          time: selectedTime.time,
          display: selectedTime.display
        }
      });

      // Update candidate status
      if (bookingData.candidateId) {
        await updateDoc(doc(db, 'candidates', bookingData.candidateId), {
          status: 'interviewing',
          statusChangedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        // Add activity log
        await addDoc(collection(db, 'candidates', bookingData.candidateId, 'activity'), {
          type: 'interview_scheduled',
          description: `${bookingData.type === 'interview' ? 'Interview' : 'Trial shift'} self-booked for ${selectedDate.toLocaleDateString('en-GB')} at ${selectedTime.display}`,
          performedBy: 'Candidate (self-service)',
          timestamp: serverTimestamp()
        });

        // Create notification for recruiters
        await addDoc(collection(db, 'notifications'), {
          type: 'booking_confirmed',
          title: 'New Booking',
          message: `${bookingData.candidate?.firstName || 'A candidate'} ${bookingData.candidate?.lastName || ''} booked ${bookingData.type === 'interview' ? 'an interview' : 'a trial shift'} for ${selectedDate.toLocaleDateString('en-GB')} at ${selectedTime.display}`,
          candidateId: bookingData.candidateId,
          candidateName: bookingData.candidate 
            ? `${bookingData.candidate.firstName} ${bookingData.candidate.lastName}`
            : 'Unknown',
          interviewId: interviewRef.id,
          read: false,
          createdAt: serverTimestamp()
        });
      }

      setConfirmedBooking({
        date: selectedDate.toLocaleDateString('en-GB', { 
          weekday: 'long', 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric' 
        }),
        time: selectedTime.display,
        type: bookingData.type,
        location: bookingData.location || 'To be confirmed'
      });
      setBookingComplete(true);

    } catch (err) {
      console.error('Error confirming booking:', err);
      alert('Failed to confirm booking. Please try again.');
    } finally {
      setIsBooking(false);
    }
  };

  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      newMonth.setMonth(newMonth.getMonth() + direction);
      return newMonth;
    });
    setSelectedDate(null);
    setSelectedTime(null);
  };

  // Render loading state
  if (loading) {
    return (
      <div className="booking-page">
        <div className="booking-container">
          <div className="booking-loading">
            <div className="loading-spinner"></div>
            <p>Loading booking options...</p>
          </div>
        </div>
      </div>
    );
  }

  // Render error state
  if (error && !bookingComplete) {
    return (
      <div className="booking-page">
        <div className="booking-container">
          <div className="booking-error">
            <AlertCircle size={48} />
            <h2>Unable to Book</h2>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Render confirmation state
  if (bookingComplete && confirmedBooking) {
    return (
      <div className="booking-page">
        <div className="booking-container">
          <div className="booking-confirmed">
            <div className="confirmed-icon">
              <CheckCircle size={64} />
            </div>
            <h2>Booking Confirmed!</h2>
            <p>Your {confirmedBooking.type === 'interview' ? 'interview' : 'trial shift'} has been scheduled.</p>
            
            <div className="confirmed-details">
              <div className="confirmed-detail">
                <Calendar size={20} />
                <span>{confirmedBooking.date}</span>
              </div>
              <div className="confirmed-detail">
                <Clock size={20} />
                <span>{confirmedBooking.time}</span>
              </div>
              <div className="confirmed-detail">
                <Building2 size={20} />
                <span>{confirmedBooking.location}</span>
              </div>
            </div>

            <div className="confirmed-note">
              <p>You will receive a confirmation message shortly.</p>
              <p>If you need to reschedule, please contact us directly.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-page">
      <div className="booking-container">
        {/* Header */}
        <div className="booking-header">
          <div className="booking-logo">
            <Building2 size={32} />
            <span>Allied Pharmacies</span>
          </div>
          <h1>
            Book Your {bookingData?.type === 'interview' ? 'Interview' : 'Trial Shift'}
          </h1>
          {bookingData?.job && (
            <p className="booking-job">
              <Briefcase size={16} />
              {bookingData.job.title} - {bookingData.job.location}
            </p>
          )}
        </div>

        <div className="booking-content">
          {/* Calendar */}
          <div className="booking-calendar">
            <div className="calendar-header">
              <button onClick={() => navigateMonth(-1)} className="calendar-nav">
                <ChevronLeft size={20} />
              </button>
              <h3>
                {currentMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
              </h3>
              <button onClick={() => navigateMonth(1)} className="calendar-nav">
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="calendar-weekdays">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <div key={day} className="calendar-weekday">{day}</div>
              ))}
            </div>

            <div className="calendar-days">
              {calendarDays.map((day, idx) => (
                <button
                  key={idx}
                  className={`calendar-day ${!day.isCurrentMonth ? 'other-month' : ''} ${day.isAvailable ? 'available' : 'unavailable'} ${selectedDate?.getTime() === day.date.getTime() ? 'selected' : ''}`}
                  onClick={() => handleDateSelect(day)}
                  disabled={!day.isAvailable}
                >
                  {day.date.getDate()}
                </button>
              ))}
            </div>
          </div>

          {/* Time Slots */}
          <div className="booking-times">
            <h3>
              {selectedDate 
                ? `Available times on ${selectedDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}`
                : 'Select a date to see available times'
              }
            </h3>

            {selectedDate && availableSlots.length === 0 && (
              <p className="no-slots">No available times on this date. Please select another date.</p>
            )}

            {availableSlots.length > 0 && (
              <div className="time-slots-grid">
                {availableSlots.map((slot) => (
                  <button
                    key={slot.time}
                    className={`time-slot-btn ${selectedTime?.time === slot.time ? 'selected' : ''}`}
                    onClick={() => handleTimeSelect(slot)}
                  >
                    {slot.display}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Confirm Button */}
        {selectedTime && (
          <div className="booking-confirm">
            <div className="confirm-summary">
              <p>
                <strong>{bookingData?.type === 'interview' ? 'Interview' : 'Trial Shift'}</strong>
              </p>
              <p>
                {selectedDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                {' at '}
                {selectedTime.display}
              </p>
            </div>
            <button 
              className="confirm-btn"
              onClick={handleConfirmBooking}
              disabled={isBooking}
            >
              {isBooking ? 'Confirming...' : 'Confirm Booking'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
