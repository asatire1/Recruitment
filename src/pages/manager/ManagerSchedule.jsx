import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useManagerSchedule, useEventActions } from '../../hooks/useManagerPortal';
import { useServiceWorker } from '../../hooks/usePWA';
import EventCard from '../../components/EventCard';
import EventActionModal from '../../components/EventActionModal';
import './ManagerSchedule.css';

// Icons
const Icons = {
  ArrowLeft: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="19" y1="12" x2="5" y2="12"/>
      <polyline points="12 19 5 12 12 5"/>
    </svg>
  ),
  Calendar: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  ChevronLeft: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
  ChevronRight: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  Sunrise: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 18a5 5 0 0 0-10 0"/>
      <line x1="12" y1="2" x2="12" y2="9"/>
      <line x1="4.22" y1="10.22" x2="5.64" y2="11.64"/>
      <line x1="1" y1="18" x2="3" y2="18"/>
      <line x1="21" y1="18" x2="23" y2="18"/>
      <line x1="18.36" y1="11.64" x2="19.78" y2="10.22"/>
      <line x1="23" y1="22" x2="1" y2="22"/>
      <polyline points="8 6 12 2 16 6"/>
    </svg>
  ),
  Sun: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  ),
  Moon: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  ),
  CheckCircle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  )
};

// Date range options
const DATE_RANGES = [
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'week', label: 'This Week' }
];

// Time period icons
const TIME_ICONS = {
  morning: Icons.Sunrise,
  afternoon: Icons.Sun,
  evening: Icons.Moon
};

// Event group component
function EventGroup({ title, icon: Icon, events, onEventClick }) {
  if (events.length === 0) return null;

  return (
    <div className="event-group">
      <div className="group-header">
        <Icon />
        <span>{title}</span>
        <span className="group-count">{events.length}</span>
      </div>
      <div className="group-events">
        {events.map(event => (
          <EventCard
            key={event.id}
            event={event}
            onClick={() => onEventClick(event)}
          />
        ))}
      </div>
    </div>
  );
}

export default function ManagerSchedule() {
  const [dateRange, setDateRange] = useState('today');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const { events, groupedEvents, loading, error, startDate } = useManagerSchedule(dateRange);
  const { confirmEvent, completeEvent, markNoShow, cancelEvent, submitting } = useEventActions();
  const { isOnline } = useServiceWorker();

  // Format date for display
  const formatDateHeader = () => {
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    return startDate.toLocaleDateString('en-GB', options);
  };

  // Handle event action
  const handleEventAction = async (action, notes) => {
    if (!selectedEvent) return;

    let success = false;
    switch (action) {
      case 'confirm':
        success = await confirmEvent(selectedEvent.id);
        break;
      case 'complete':
        success = await completeEvent(selectedEvent.id, notes);
        break;
      case 'no_show':
        success = await markNoShow(selectedEvent.id, notes);
        break;
      case 'cancel':
        success = await cancelEvent(selectedEvent.id, notes);
        break;
      default:
        break;
    }

    if (success) {
      setSelectedEvent(null);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  const hasEvents = events.length > 0;

  return (
    <div className="manager-schedule">
      {/* Header */}
      <header className="schedule-header">
        <Link to="/manager" className="back-btn">
          <Icons.ArrowLeft />
        </Link>
        <div className="header-content">
          <h1>Schedule</h1>
          <span className="date-label">{formatDateHeader()}</span>
        </div>
      </header>

      {/* Date Range Selector */}
      <div className="date-selector">
        {DATE_RANGES.map(range => (
          <button
            key={range.value}
            className={`date-btn ${dateRange === range.value ? 'active' : ''}`}
            onClick={() => setDateRange(range.value)}
          >
            {range.label}
          </button>
        ))}
      </div>

      {/* Success Toast */}
      {showSuccess && (
        <div className="success-toast">
          <Icons.CheckCircle />
          <span>Event updated successfully</span>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="schedule-loading">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton-event">
              <div className="skeleton-time" />
              <div className="skeleton-content">
                <div className="skeleton-line" />
                <div className="skeleton-line short" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="schedule-error">
          <p>Error loading schedule: {error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && !hasEvents && (
        <div className="schedule-empty">
          <Icons.Calendar />
          <h2>No events scheduled</h2>
          <p>
            {dateRange === 'today' && 'You have no events scheduled for today'}
            {dateRange === 'tomorrow' && 'You have no events scheduled for tomorrow'}
            {dateRange === 'week' && 'You have no events scheduled this week'}
          </p>
        </div>
      )}

      {/* Schedule Content */}
      {!loading && !error && hasEvents && (
        <div className="schedule-content">
          <EventGroup
            title="Morning"
            icon={TIME_ICONS.morning}
            events={groupedEvents.morning}
            onEventClick={setSelectedEvent}
          />
          <EventGroup
            title="Afternoon"
            icon={TIME_ICONS.afternoon}
            events={groupedEvents.afternoon}
            onEventClick={setSelectedEvent}
          />
          <EventGroup
            title="Evening"
            icon={TIME_ICONS.evening}
            events={groupedEvents.evening}
            onEventClick={setSelectedEvent}
          />
        </div>
      )}

      {/* Event Action Modal */}
      {selectedEvent && (
        <EventActionModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onAction={handleEventAction}
          submitting={submitting}
        />
      )}
    </div>
  );
}
