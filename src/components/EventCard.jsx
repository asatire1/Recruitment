import React from 'react';
import './EventCard.css';

// Icons
const Icons = {
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
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  ChevronRight: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  )
};

// Event type colors
const TYPE_COLORS = {
  interview: '#3b82f6',
  trial: '#10b981',
  meeting: '#8b5cf6',
  reminder: '#f59e0b',
  other: '#6b7280'
};

// Format time
function formatTime(date) {
  if (!date) return '--:--';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

// Format duration
function formatDuration(startTime, endTime) {
  if (!startTime || !endTime) return '';
  
  const start = startTime instanceof Date ? startTime : new Date(startTime);
  const end = endTime instanceof Date ? endTime : new Date(endTime);
  const diffMs = end - start;
  const diffMins = Math.round(diffMs / (1000 * 60));
  
  if (diffMins < 60) return `${diffMins}min`;
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export default function EventCard({ event, onClick }) {
  const typeColor = TYPE_COLORS[event.type] || TYPE_COLORS.other;
  const isConfirmed = event.status === 'confirmed';

  return (
    <div 
      className={`event-card ${isConfirmed ? 'confirmed' : ''}`}
      style={{ '--type-color': typeColor }}
      onClick={onClick}
    >
      <div className="event-time-block">
        <span className="event-start-time">{formatTime(event.startTime)}</span>
        <span className="event-duration">{formatDuration(event.startTime, event.endTime)}</span>
      </div>

      <div className="event-content">
        <div className="event-header">
          <span className="event-type">{event.type}</span>
          {isConfirmed && (
            <span className="confirmed-badge">
              <Icons.Check />
              Confirmed
            </span>
          )}
        </div>

        <h4 className="event-title">{event.title}</h4>

        {event.candidateName && (
          <div className="event-detail">
            <Icons.User />
            <span>{event.candidateName}</span>
          </div>
        )}

        {event.branchName && (
          <div className="event-detail">
            <Icons.MapPin />
            <span>{event.branchName}</span>
          </div>
        )}
      </div>

      <div className="event-arrow">
        <Icons.ChevronRight />
      </div>
    </div>
  );
}
