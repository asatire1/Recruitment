import React, { useState, useMemo } from 'react';
import {
  useCalendarEvents,
  useCalendarActions,
  EVENT_TYPES,
  EVENT_TYPE_CONFIG,
  EVENT_STATUSES,
  EVENT_STATUS_CONFIG,
  formatEventTime
} from '../hooks/useCalendar';
import EventModal from '../components/EventModal';
import ConfirmModal from '../components/ConfirmModal';
import './Calendar.css';

// Icons
const Icons = {
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
  Plus: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
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
  Clock: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  User: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  MapPin: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  Link: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  ),
  Filter: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
    </svg>
  )
};

// Days of week header
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 
                'July', 'August', 'September', 'October', 'November', 'December'];

// Helper: Check if two dates are same day
function isSameDay(d1, d2) {
  return d1.getDate() === d2.getDate() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getFullYear() === d2.getFullYear();
}

// Helper: Check if date is today
function isToday(date) {
  return isSameDay(date, new Date());
}

// Helper: Get calendar grid for month
function getCalendarGrid(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());
  
  const grid = [];
  const current = new Date(startDate);
  
  for (let week = 0; week < 6; week++) {
    const days = [];
    for (let day = 0; day < 7; day++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    grid.push(days);
    
    // Stop if we've passed the last day and completed the week
    if (current > lastDay && current.getDay() === 0) break;
  }
  
  return grid;
}

// View Switcher Component
function ViewSwitcher({ view, onChange }) {
  return (
    <div className="view-switcher">
      <button 
        className={view === 'month' ? 'active' : ''}
        onClick={() => onChange('month')}
      >
        Month
      </button>
      <button 
        className={view === 'week' ? 'active' : ''}
        onClick={() => onChange('week')}
      >
        Week
      </button>
      <button 
        className={view === 'day' ? 'active' : ''}
        onClick={() => onChange('day')}
      >
        Day
      </button>
    </div>
  );
}

// Event Type Filter Component
function EventTypeFilter({ selected, onChange }) {
  return (
    <div className="event-type-filter">
      <button
        className={`filter-chip ${selected === null ? 'active' : ''}`}
        onClick={() => onChange(null)}
      >
        All
      </button>
      {Object.entries(EVENT_TYPE_CONFIG).map(([type, config]) => (
        <button
          key={type}
          className={`filter-chip ${selected === type ? 'active' : ''}`}
          onClick={() => onChange(type)}
          style={{ '--chip-color': config.color }}
        >
          <span className="chip-icon">{config.icon}</span>
          {config.label}
        </button>
      ))}
    </div>
  );
}

// Calendar Event Component (for month view)
function CalendarEvent({ event, onClick }) {
  const config = EVENT_TYPE_CONFIG[event.type] || EVENT_TYPE_CONFIG.other;
  
  return (
    <div 
      className="calendar-event"
      style={{ 
        '--event-color': config.color,
        '--event-bg': config.bgColor
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(event);
      }}
    >
      <span className="event-time">{formatEventTime(event.startTime)}</span>
      <span className="event-title">{event.title}</span>
    </div>
  );
}

// Day Cell Component
function DayCell({ date, events, currentMonth, onDayClick, onEventClick }) {
  const isCurrentMonth = date.getMonth() === currentMonth;
  const dayEvents = events.filter(e => isSameDay(e.startTime, date));
  const maxDisplay = 3;
  const moreCount = dayEvents.length - maxDisplay;
  
  return (
    <div 
      className={`day-cell ${!isCurrentMonth ? 'other-month' : ''} ${isToday(date) ? 'today' : ''}`}
      onClick={() => onDayClick(date)}
    >
      <span className="day-number">{date.getDate()}</span>
      <div className="day-events">
        {dayEvents.slice(0, maxDisplay).map(event => (
          <CalendarEvent 
            key={event.id} 
            event={event} 
            onClick={onEventClick}
          />
        ))}
        {moreCount > 0 && (
          <div className="more-events">+{moreCount} more</div>
        )}
      </div>
    </div>
  );
}

// Month View Component
function MonthView({ currentDate, events, onDayClick, onEventClick }) {
  const grid = useMemo(() => getCalendarGrid(currentDate), [currentDate]);
  const currentMonth = currentDate.getMonth();
  
  return (
    <div className="month-view">
      <div className="calendar-header">
        {DAYS.map(day => (
          <div key={day} className="header-cell">{day}</div>
        ))}
      </div>
      <div className="calendar-grid">
        {grid.map((week, i) => (
          <div key={i} className="calendar-week">
            {week.map((date) => (
              <DayCell
                key={date.toISOString()}
                date={date}
                events={events}
                currentMonth={currentMonth}
                onDayClick={onDayClick}
                onEventClick={onEventClick}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Week View Component
function WeekView({ currentDate, events, onTimeClick, onEventClick }) {
  const weekStart = new Date(currentDate);
  weekStart.setDate(currentDate.getDate() - currentDate.getDay());
  
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    return day;
  });
  
  const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 7 PM
  
  return (
    <div className="week-view">
      <div className="week-header">
        <div className="time-gutter"></div>
        {weekDays.map(day => (
          <div 
            key={day.toISOString()} 
            className={`week-header-cell ${isToday(day) ? 'today' : ''}`}
          >
            <span className="day-name">{DAYS[day.getDay()]}</span>
            <span className="day-number">{day.getDate()}</span>
          </div>
        ))}
      </div>
      <div className="week-grid">
        <div className="time-column">
          {hours.map(hour => (
            <div key={hour} className="time-slot">
              <span>{hour.toString().padStart(2, '0')}:00</span>
            </div>
          ))}
        </div>
        {weekDays.map(day => (
          <div key={day.toISOString()} className="day-column">
            {hours.map(hour => {
              const slotTime = new Date(day);
              slotTime.setHours(hour, 0, 0, 0);
              
              const slotEvents = events.filter(e => 
                isSameDay(e.startTime, day) && 
                e.startTime.getHours() === hour
              );
              
              return (
                <div 
                  key={hour} 
                  className="hour-slot"
                  onClick={() => onTimeClick(slotTime)}
                >
                  {slotEvents.map(event => {
                    const config = EVENT_TYPE_CONFIG[event.type] || EVENT_TYPE_CONFIG.other;
                    return (
                      <div
                        key={event.id}
                        className="week-event"
                        style={{ 
                          '--event-color': config.color,
                          '--event-bg': config.bgColor
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick(event);
                        }}
                      >
                        <span className="event-time">{formatEventTime(event.startTime)}</span>
                        <span className="event-title">{event.title}</span>
                        {event.candidateName && (
                          <span className="event-candidate">{event.candidateName}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// Day View Component
function DayView({ currentDate, events, onTimeClick, onEventClick }) {
  const dayEvents = events.filter(e => isSameDay(e.startTime, currentDate));
  const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 7 PM
  
  return (
    <div className="day-view">
      <div className="day-header">
        <h2>{DAYS[currentDate.getDay()]}</h2>
        <span className="day-date">
          {currentDate.getDate()} {MONTHS[currentDate.getMonth()]}
        </span>
      </div>
      <div className="day-schedule">
        {hours.map(hour => {
          const slotTime = new Date(currentDate);
          slotTime.setHours(hour, 0, 0, 0);
          
          const slotEvents = dayEvents.filter(e => e.startTime.getHours() === hour);
          
          return (
            <div key={hour} className="day-hour-row">
              <div className="hour-label">
                {hour.toString().padStart(2, '0')}:00
              </div>
              <div 
                className="hour-content"
                onClick={() => onTimeClick(slotTime)}
              >
                {slotEvents.map(event => {
                  const config = EVENT_TYPE_CONFIG[event.type] || EVENT_TYPE_CONFIG.other;
                  const statusConfig = EVENT_STATUS_CONFIG[event.status];
                  const duration = Math.round((event.endTime - event.startTime) / (1000 * 60));
                  
                  return (
                    <div
                      key={event.id}
                      className="day-event"
                      style={{ '--event-color': config.color }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(event);
                      }}
                    >
                      <div className="day-event-header">
                        <span className="event-icon">{config.icon}</span>
                        <span className="event-type">{config.label}</span>
                        <span 
                          className="event-status"
                          style={{ color: statusConfig?.color }}
                        >
                          {statusConfig?.label}
                        </span>
                      </div>
                      <h4 className="event-title">{event.title}</h4>
                      <div className="event-details">
                        <span>
                          <Icons.Clock />
                          {formatEventTime(event.startTime)} - {formatEventTime(event.endTime)} ({duration} min)
                        </span>
                        {event.candidateName && (
                          <span>
                            <Icons.User />
                            {event.candidateName}
                          </span>
                        )}
                        {event.branchName && (
                          <span>
                            <Icons.MapPin />
                            {event.branchName}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Sidebar Upcoming Events Component
function UpcomingEvents({ events, onEventClick }) {
  const upcoming = events
    .filter(e => e.startTime >= new Date())
    .sort((a, b) => a.startTime - b.startTime)
    .slice(0, 5);
  
  if (upcoming.length === 0) {
    return (
      <div className="sidebar-section">
        <h3>Upcoming</h3>
        <p className="no-events">No upcoming events</p>
      </div>
    );
  }
  
  return (
    <div className="sidebar-section">
      <h3>Upcoming</h3>
      <div className="upcoming-list">
        {upcoming.map(event => {
          const config = EVENT_TYPE_CONFIG[event.type] || EVENT_TYPE_CONFIG.other;
          return (
            <div 
              key={event.id} 
              className="upcoming-event"
              onClick={() => onEventClick(event)}
            >
              <div 
                className="upcoming-event-indicator"
                style={{ background: config.color }}
              />
              <div className="upcoming-event-content">
                <span className="upcoming-event-time">
                  {event.startTime.toLocaleDateString('en-GB', { 
                    weekday: 'short', 
                    day: 'numeric',
                    month: 'short'
                  })} at {formatEventTime(event.startTime)}
                </span>
                <span className="upcoming-event-title">{event.title}</span>
                {event.candidateName && (
                  <span className="upcoming-event-candidate">{event.candidateName}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Main Calendar Page Component
export default function Calendar() {
  const [view, setView] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [eventTypeFilter, setEventTypeFilter] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { events, loading, error } = useCalendarEvents({
    view,
    currentDate,
    eventType: eventTypeFilter
  });

  const { deleteEvent, loading: actionLoading } = useCalendarActions();

  // Navigation handlers
  const goToToday = () => setCurrentDate(new Date());
  
  const navigate = (direction) => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + direction);
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() + (7 * direction));
    } else {
      newDate.setDate(newDate.getDate() + direction);
    }
    setCurrentDate(newDate);
  };

  // Event handlers
  const handleDayClick = (date) => {
    if (view === 'month') {
      setCurrentDate(date);
      setView('day');
    }
  };

  const handleTimeClick = (time) => {
    setSelectedDate(time);
    setSelectedEvent(null);
    setShowEventModal(true);
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setSelectedDate(null);
    setShowEventModal(true);
  };

  const handleCreateEvent = () => {
    setSelectedEvent(null);
    setSelectedDate(new Date());
    setShowEventModal(true);
  };

  const handleCloseModal = () => {
    setShowEventModal(false);
    setSelectedEvent(null);
    setSelectedDate(null);
  };

  const handleDeleteEvent = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteEvent(deleteConfirm.id);
      setDeleteConfirm(null);
      handleCloseModal();
    } catch (err) {
      console.error('Error deleting event:', err);
    }
  };

  // Get title for current view
  const getTitle = () => {
    if (view === 'day') {
      return currentDate.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    }
    return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  };

  return (
    <div className="calendar-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Calendar</h1>
          <p>Manage interviews, trials, and appointments</p>
        </div>
        <div className="page-header-right">
          <button className="btn btn-secondary" onClick={goToToday}>
            Today
          </button>
          <button className="btn btn-primary" onClick={handleCreateEvent}>
            <Icons.Plus />
            New Event
          </button>
        </div>
      </div>

      <div className="calendar-layout">
        {/* Main Calendar */}
        <div className="calendar-main">
          {/* Toolbar */}
          <div className="calendar-toolbar">
            <div className="nav-controls">
              <button className="nav-btn" onClick={() => navigate(-1)}>
                <Icons.ChevronLeft />
              </button>
              <h2 className="calendar-title">{getTitle()}</h2>
              <button className="nav-btn" onClick={() => navigate(1)}>
                <Icons.ChevronRight />
              </button>
            </div>
            <ViewSwitcher view={view} onChange={setView} />
          </div>

          {/* Event Type Filter */}
          <EventTypeFilter 
            selected={eventTypeFilter} 
            onChange={setEventTypeFilter} 
          />

          {/* Calendar View */}
          {loading ? (
            <div className="calendar-loading">
              <div className="spinner" />
              <p>Loading events...</p>
            </div>
          ) : error ? (
            <div className="calendar-error">
              <p>Error loading events: {error}</p>
            </div>
          ) : (
            <>
              {view === 'month' && (
                <MonthView
                  currentDate={currentDate}
                  events={events}
                  onDayClick={handleDayClick}
                  onEventClick={handleEventClick}
                />
              )}
              {view === 'week' && (
                <WeekView
                  currentDate={currentDate}
                  events={events}
                  onTimeClick={handleTimeClick}
                  onEventClick={handleEventClick}
                />
              )}
              {view === 'day' && (
                <DayView
                  currentDate={currentDate}
                  events={events}
                  onTimeClick={handleTimeClick}
                  onEventClick={handleEventClick}
                />
              )}
            </>
          )}
        </div>

        {/* Sidebar */}
        <aside className="calendar-sidebar">
          <UpcomingEvents events={events} onEventClick={handleEventClick} />
          
          <div className="sidebar-section">
            <h3>Event Types</h3>
            <div className="legend">
              {Object.entries(EVENT_TYPE_CONFIG).map(([type, config]) => (
                <div key={type} className="legend-item">
                  <span 
                    className="legend-color" 
                    style={{ background: config.color }}
                  />
                  <span className="legend-icon">{config.icon}</span>
                  <span className="legend-label">{config.label}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Event Modal */}
      {showEventModal && (
        <EventModal
          isOpen={showEventModal}
          onClose={handleCloseModal}
          event={selectedEvent}
          defaultDate={selectedDate}
          onDelete={() => setDeleteConfirm(selectedEvent)}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <ConfirmModal
          isOpen={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={handleDeleteEvent}
          title="Delete Event?"
          message={`Are you sure you want to delete "${deleteConfirm.title}"? This cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
          loading={actionLoading}
        />
      )}
    </div>
  );
}
