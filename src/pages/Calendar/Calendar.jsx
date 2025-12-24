import { useState, useEffect, useMemo, useCallback } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  Phone,
  Video,
  Building,
  Plus,
  List,
  Grid3X3,
  Filter
} from 'lucide-react';
import Header from '../../components/layout/Header';
import { Card, CardBody, Button, Badge, Modal, EmptyState } from '../../components/ui';
import { 
  subscribeToInterviewsInRange, 
  INTERVIEW_TYPES,
  INTERVIEW_STATUSES,
  formatTime,
  getInterviewStatusConfig
} from '../../lib/interviews';
import './Calendar.css';

// Calendar constants
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// View modes
const VIEW_MODES = {
  MONTH: 'month',
  WEEK: 'week',
  DAY: 'day',
  LIST: 'list'
};

export default function Calendar() {
  const { toggleMobileMenu } = useOutletContext();
  const navigate = useNavigate();
  
  // State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState(VIEW_MODES.MONTH);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all'
  });

  // Calculate date range based on view mode
  const dateRange = useMemo(() => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);
    
    if (viewMode === VIEW_MODES.MONTH) {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      // Go back to start of week
      start.setDate(start.getDate() - start.getDay());
      
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
      // Go forward to end of week
      end.setDate(end.getDate() + (6 - end.getDay()));
    } else if (viewMode === VIEW_MODES.WEEK) {
      start.setDate(start.getDate() - start.getDay());
      start.setHours(0, 0, 0, 0);
      
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else if (viewMode === VIEW_MODES.DAY) {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else {
      // List view - show 30 days
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() + 30);
      end.setHours(23, 59, 59, 999);
    }
    
    return { start, end };
  }, [currentDate, viewMode]);

  // Subscribe to interviews in range
  useEffect(() => {
    setLoading(true);
    
    const unsubscribe = subscribeToInterviewsInRange(
      dateRange.start,
      dateRange.end,
      (data) => {
        setInterviews(data);
        setLoading(false);
      }
    );
    
    return () => unsubscribe();
  }, [dateRange.start.getTime(), dateRange.end.getTime()]);

  // Filter interviews
  const filteredInterviews = useMemo(() => {
    return interviews.filter(interview => {
      if (filters.type !== 'all' && interview.type !== filters.type) return false;
      if (filters.status !== 'all' && interview.status !== filters.status) return false;
      return true;
    });
  }, [interviews, filters]);

  // Group interviews by date
  const interviewsByDate = useMemo(() => {
    const grouped = {};
    
    filteredInterviews.forEach(interview => {
      const date = interview.dateTime?.toDate ? interview.dateTime.toDate() : new Date(interview.dateTime);
      const dateKey = date.toDateString();
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(interview);
    });
    
    // Sort interviews within each day by time
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => {
        const aTime = a.dateTime?.toDate ? a.dateTime.toDate() : new Date(a.dateTime);
        const bTime = b.dateTime?.toDate ? b.dateTime.toDate() : new Date(b.dateTime);
        return aTime - bTime;
      });
    });
    
    return grouped;
  }, [filteredInterviews]);

  // Navigation functions
  const goToToday = () => setCurrentDate(new Date());
  
  const goToPrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === VIEW_MODES.MONTH) {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (viewMode === VIEW_MODES.WEEK) {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };
  
  const goToNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === VIEW_MODES.MONTH) {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (viewMode === VIEW_MODES.WEEK) {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  // Get title based on view mode
  const getTitle = () => {
    if (viewMode === VIEW_MODES.MONTH) {
      return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    } else if (viewMode === VIEW_MODES.WEEK) {
      const weekStart = new Date(currentDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      if (weekStart.getMonth() === weekEnd.getMonth()) {
        return `${weekStart.getDate()} - ${weekEnd.getDate()} ${MONTHS[weekStart.getMonth()]} ${weekStart.getFullYear()}`;
      } else {
        return `${weekStart.getDate()} ${MONTHS[weekStart.getMonth()].slice(0, 3)} - ${weekEnd.getDate()} ${MONTHS[weekEnd.getMonth()].slice(0, 3)} ${weekEnd.getFullYear()}`;
      }
    } else if (viewMode === VIEW_MODES.DAY) {
      return currentDate.toLocaleDateString('en-GB', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
    } else {
      return 'Upcoming Events';
    }
  };

  // Generate calendar grid for month view
  const calendarGrid = useMemo(() => {
    if (viewMode !== VIEW_MODES.MONTH) return [];
    
    const grid = [];
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    // Start from the Sunday before the first day
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    // Generate 6 weeks of days
    for (let week = 0; week < 6; week++) {
      const weekDays = [];
      for (let day = 0; day < 7; day++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + (week * 7) + day);
        weekDays.push(date);
      }
      grid.push(weekDays);
    }
    
    return grid;
  }, [currentDate, viewMode]);

  // Check if date is today
  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Check if date is in current month
  const isCurrentMonth = (date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  // Get event color based on type and status
  const getEventColor = (interview) => {
    if (interview.status === 'cancelled') return 'gray';
    if (interview.status === 'completed') return 'success';
    if (interview.status === 'no_show') return 'error';
    return interview.type === 'trial' ? 'warning' : 'primary';
  };

  // Get location icon
  const getLocationIcon = (locationType) => {
    switch (locationType) {
      case 'phone': return Phone;
      case 'video': return Video;
      default: return Building;
    }
  };

  // Handle event click
  const handleEventClick = (event, e) => {
    e.stopPropagation();
    setSelectedEvent(event);
  };

  // Handle day click
  const handleDayClick = (date) => {
    setCurrentDate(date);
    setViewMode(VIEW_MODES.DAY);
  };

  // Navigate to candidate
  const goToCandidate = (candidateId) => {
    navigate(`/candidates/${candidateId}`);
  };

  // Render month view
  const renderMonthView = () => (
    <div className="calendar-grid">
      <div className="calendar-header-row">
        {DAYS.map(day => (
          <div key={day} className="calendar-header-cell">{day}</div>
        ))}
      </div>
      {calendarGrid.map((week, weekIndex) => (
        <div key={weekIndex} className="calendar-week">
          {week.map((date, dayIndex) => {
            const dateKey = date.toDateString();
            const dayEvents = interviewsByDate[dateKey] || [];
            const isCurrentMonthDay = isCurrentMonth(date);
            const isTodayDay = isToday(date);
            
            return (
              <div 
                key={dayIndex} 
                className={`calendar-day ${!isCurrentMonthDay ? 'other-month' : ''} ${isTodayDay ? 'today' : ''}`}
                onClick={() => handleDayClick(date)}
              >
                <div className="calendar-day-header">
                  <span className={`calendar-day-number ${isTodayDay ? 'today-badge' : ''}`}>
                    {date.getDate()}
                  </span>
                </div>
                <div className="calendar-day-events">
                  {dayEvents.slice(0, 3).map(event => (
                    <div 
                      key={event.id} 
                      className={`calendar-event calendar-event-${getEventColor(event)}`}
                      onClick={(e) => handleEventClick(event, e)}
                      title={`${event.candidateName} - ${event.type === 'trial' ? 'Trial' : 'Interview'}`}
                    >
                      <span className="event-time">{formatTime(event.dateTime)}</span>
                      <span className="event-title">{event.candidateName}</span>
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="calendar-more-events">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );

  // Render week view
  const renderWeekView = () => {
    const weekStart = new Date(currentDate);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      weekDays.push(date);
    }
    
    return (
      <div className="calendar-week-view">
        <div className="week-header">
          {weekDays.map((date, index) => (
            <div 
              key={index} 
              className={`week-header-cell ${isToday(date) ? 'today' : ''}`}
              onClick={() => handleDayClick(date)}
            >
              <span className="week-day-name">{DAYS[index]}</span>
              <span className={`week-day-number ${isToday(date) ? 'today-badge' : ''}`}>
                {date.getDate()}
              </span>
            </div>
          ))}
        </div>
        <div className="week-body">
          {weekDays.map((date, index) => {
            const dateKey = date.toDateString();
            const dayEvents = interviewsByDate[dateKey] || [];
            
            return (
              <div key={index} className={`week-column ${isToday(date) ? 'today' : ''}`}>
                {dayEvents.map(event => (
                  <div 
                    key={event.id}
                    className={`week-event week-event-${getEventColor(event)}`}
                    onClick={(e) => handleEventClick(event, e)}
                  >
                    <div className="week-event-time">{formatTime(event.dateTime)}</div>
                    <div className="week-event-title">{event.candidateName}</div>
                    <div className="week-event-type">
                      {event.type === 'trial' ? 'Trial' : 'Interview'}
                    </div>
                  </div>
                ))}
                {dayEvents.length === 0 && (
                  <div className="week-empty">No events</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render day view
  const renderDayView = () => {
    const dateKey = currentDate.toDateString();
    const dayEvents = interviewsByDate[dateKey] || [];
    
    // Generate time slots (8am to 8pm)
    const timeSlots = [];
    for (let hour = 8; hour <= 20; hour++) {
      timeSlots.push(hour);
    }
    
    return (
      <div className="calendar-day-view">
        <div className="day-timeline">
          {timeSlots.map(hour => (
            <div key={hour} className="day-time-slot">
              <div className="day-time-label">
                {hour.toString().padStart(2, '0')}:00
              </div>
              <div className="day-time-content">
                {dayEvents
                  .filter(event => {
                    const eventDate = event.dateTime?.toDate ? event.dateTime.toDate() : new Date(event.dateTime);
                    return eventDate.getHours() === hour;
                  })
                  .map(event => (
                    <div 
                      key={event.id}
                      className={`day-event day-event-${getEventColor(event)}`}
                      onClick={(e) => handleEventClick(event, e)}
                      style={{ 
                        height: `${Math.max(event.duration / 60 * 60, 50)}px`,
                        top: `${(event.dateTime?.toDate ? event.dateTime.toDate() : new Date(event.dateTime)).getMinutes()}px`
                      }}
                    >
                      <div className="day-event-time">{formatTime(event.dateTime)}</div>
                      <div className="day-event-title">{event.candidateName}</div>
                      <div className="day-event-details">
                        <span>{event.type === 'trial' ? 'Trial' : 'Interview'}</span>
                        <span>{event.duration} min</span>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render list view
  const renderListView = () => {
    const sortedDates = Object.keys(interviewsByDate).sort((a, b) => 
      new Date(a) - new Date(b)
    );
    
    return (
      <div className="calendar-list-view">
        {sortedDates.length === 0 ? (
          <EmptyState
            variant="calendar"
            title="No upcoming events"
            description="Schedule interviews or trials to see them here"
            className="empty-state-compact"
          />
        ) : (
          sortedDates.map(dateKey => (
            <div key={dateKey} className="list-day-group">
              <div className="list-day-header">
                <span className={`list-day-date ${isToday(new Date(dateKey)) ? 'today' : ''}`}>
                  {new Date(dateKey).toLocaleDateString('en-GB', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long'
                  })}
                </span>
                <span className="list-day-count">
                  {interviewsByDate[dateKey].length} event{interviewsByDate[dateKey].length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="list-events">
                {interviewsByDate[dateKey].map(event => {
                  const LocationIcon = getLocationIcon(event.locationType);
                  const statusConfig = getInterviewStatusConfig(event.status);
                  
                  return (
                    <Card 
                      key={event.id} 
                      className={`list-event-card list-event-${getEventColor(event)}`}
                      onClick={() => setSelectedEvent(event)}
                    >
                      <CardBody>
                        <div className="list-event-content">
                          <div className="list-event-time">
                            <Clock size={16} />
                            <span>{formatTime(event.dateTime)}</span>
                            <span className="list-event-duration">{event.duration} min</span>
                          </div>
                          <div className="list-event-main">
                            <h4>{event.candidateName}</h4>
                            <p className="list-event-job">{event.jobTitle || 'No job assigned'}</p>
                          </div>
                          <div className="list-event-meta">
                            <Badge variant={event.type === 'trial' ? 'warning' : 'primary'}>
                              {event.type === 'trial' ? 'Trial' : 'Interview'}
                            </Badge>
                            <Badge variant={statusConfig.color}>
                              {statusConfig.label}
                            </Badge>
                          </div>
                          <div className="list-event-location">
                            <LocationIcon size={14} />
                            <span>{event.location || event.locationType}</span>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  // Event detail modal
  const renderEventModal = () => {
    if (!selectedEvent) return null;
    
    const eventDate = selectedEvent.dateTime?.toDate 
      ? selectedEvent.dateTime.toDate() 
      : new Date(selectedEvent.dateTime);
    const statusConfig = getInterviewStatusConfig(selectedEvent.status);
    const LocationIcon = getLocationIcon(selectedEvent.locationType);
    
    return (
      <Modal 
        isOpen={!!selectedEvent} 
        onClose={() => setSelectedEvent(null)}
        title={selectedEvent.type === 'trial' ? 'Trial Details' : 'Interview Details'}
      >
        <div className="event-modal">
          <div className="event-modal-header">
            <div className="event-modal-badges">
              <Badge variant={selectedEvent.type === 'trial' ? 'warning' : 'primary'}>
                {selectedEvent.type === 'trial' ? 'Trial Day' : 'Interview'}
              </Badge>
              <Badge variant={statusConfig.color}>
                {statusConfig.label}
              </Badge>
            </div>
          </div>
          
          <div className="event-modal-section">
            <h4>Candidate</h4>
            <div 
              className="event-modal-candidate"
              onClick={() => goToCandidate(selectedEvent.candidateId)}
            >
              <User size={20} />
              <div>
                <strong>{selectedEvent.candidateName}</strong>
                <span>{selectedEvent.candidateEmail}</span>
                <span>{selectedEvent.candidatePhone}</span>
              </div>
            </div>
          </div>
          
          <div className="event-modal-section">
            <h4>Date & Time</h4>
            <div className="event-modal-datetime">
              <CalendarIcon size={20} />
              <div>
                <strong>
                  {eventDate.toLocaleDateString('en-GB', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </strong>
                <span>{formatTime(selectedEvent.dateTime)} ({selectedEvent.duration} minutes)</span>
              </div>
            </div>
          </div>
          
          <div className="event-modal-section">
            <h4>Location</h4>
            <div className="event-modal-location">
              <LocationIcon size={20} />
              <div>
                <strong>
                  {selectedEvent.locationType === 'phone' ? 'Phone Call' : 
                   selectedEvent.locationType === 'video' ? 'Video Call' : 'In Person'}
                </strong>
                {selectedEvent.location && <span>{selectedEvent.location}</span>}
              </div>
            </div>
          </div>
          
          {selectedEvent.jobTitle && (
            <div className="event-modal-section">
              <h4>Position</h4>
              <p>{selectedEvent.jobTitle}</p>
            </div>
          )}
          
          {selectedEvent.interviewerName && (
            <div className="event-modal-section">
              <h4>Interviewer</h4>
              <p>{selectedEvent.interviewerName}</p>
              {selectedEvent.interviewerPhone && (
                <span className="event-modal-phone">{selectedEvent.interviewerPhone}</span>
              )}
            </div>
          )}
          
          {selectedEvent.notes && (
            <div className="event-modal-section">
              <h4>Notes</h4>
              <p>{selectedEvent.notes}</p>
            </div>
          )}
          
          {selectedEvent.feedback && (
            <div className="event-modal-section">
              <h4>Feedback</h4>
              <p>{selectedEvent.feedback}</p>
              {selectedEvent.rating && (
                <div className="event-modal-rating">
                  Rating: {selectedEvent.rating}/5
                </div>
              )}
            </div>
          )}
          
          <div className="event-modal-actions">
            <Button 
              variant="outline" 
              onClick={() => setSelectedEvent(null)}
            >
              Close
            </Button>
            <Button onClick={() => goToCandidate(selectedEvent.candidateId)}>
              View Candidate
            </Button>
          </div>
        </div>
      </Modal>
    );
  };

  return (
    <>
      <Header 
        title="Calendar" 
        toggleMobileMenu={toggleMobileMenu}
      />
      
      <main className="calendar-page">
        {/* Calendar Controls */}
        <div className="calendar-controls">
          <div className="calendar-nav">
            <Button variant="outline" onClick={goToToday}>
              Today
            </Button>
            <div className="calendar-nav-arrows">
              <button className="nav-arrow" onClick={goToPrevious}>
                <ChevronLeft size={20} />
              </button>
              <button className="nav-arrow" onClick={goToNext}>
                <ChevronRight size={20} />
              </button>
            </div>
            <h2 className="calendar-title">{getTitle()}</h2>
          </div>
          
          <div className="calendar-actions">
            {/* View Mode Toggle */}
            <div className="view-mode-toggle">
              <button 
                className={`view-mode-btn ${viewMode === VIEW_MODES.MONTH ? 'active' : ''}`}
                onClick={() => setViewMode(VIEW_MODES.MONTH)}
                title="Month view"
              >
                <Grid3X3 size={18} />
              </button>
              <button 
                className={`view-mode-btn ${viewMode === VIEW_MODES.WEEK ? 'active' : ''}`}
                onClick={() => setViewMode(VIEW_MODES.WEEK)}
                title="Week view"
              >
                <CalendarIcon size={18} />
              </button>
              <button 
                className={`view-mode-btn ${viewMode === VIEW_MODES.LIST ? 'active' : ''}`}
                onClick={() => setViewMode(VIEW_MODES.LIST)}
                title="List view"
              >
                <List size={18} />
              </button>
            </div>
            
            {/* Filters */}
            <div className="calendar-filters">
              <select 
                value={filters.type} 
                onChange={(e) => setFilters(f => ({ ...f, type: e.target.value }))}
                className="calendar-filter-select"
              >
                <option value="all">All Types</option>
                {INTERVIEW_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
              <select 
                value={filters.status} 
                onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
                className="calendar-filter-select"
              >
                <option value="all">All Status</option>
                {INTERVIEW_STATUSES.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        {/* Calendar Content */}
        <div className={`calendar-content calendar-${viewMode}`}>
          {loading ? (
            <div className="calendar-loading">
              <div className="calendar-loading-spinner"></div>
              <p>Loading events...</p>
            </div>
          ) : (
            <>
              {viewMode === VIEW_MODES.MONTH && renderMonthView()}
              {viewMode === VIEW_MODES.WEEK && renderWeekView()}
              {viewMode === VIEW_MODES.DAY && renderDayView()}
              {viewMode === VIEW_MODES.LIST && renderListView()}
            </>
          )}
        </div>
        
        {/* Legend */}
        <div className="calendar-legend">
          <div className="legend-item">
            <span className="legend-dot legend-dot-primary"></span>
            <span>Interview</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot legend-dot-warning"></span>
            <span>Trial</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot legend-dot-success"></span>
            <span>Completed</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot legend-dot-gray"></span>
            <span>Cancelled</span>
          </div>
        </div>
      </main>
      
      {/* Event Detail Modal */}
      {renderEventModal()}
    </>
  );
}
