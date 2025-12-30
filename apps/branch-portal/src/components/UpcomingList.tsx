import { useUpcomingEvents, formatEventTime, formatEventDate, getEventTypeLabel } from '../hooks/useBranchData'
import type { BranchEvent } from '../hooks/useBranchData'
import { Spinner } from '@allied/shared-ui'

interface UpcomingListProps { onEventClick?: (event: BranchEvent) => void; limit?: number }

export function UpcomingList({ onEventClick, limit = 10 }: UpcomingListProps) {
  const { events, loading, error } = useUpcomingEvents(7)

  if (loading) return <div className="upcoming-list upcoming-list--loading"><Spinner size="sm" /><span>Loading...</span></div>
  if (error) return <div className="upcoming-list upcoming-list--error"><p>{error}</p></div>
  if (events.length === 0) return <div className="upcoming-list upcoming-list--empty"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg><p>No upcoming events</p></div>

  const grouped = events.slice(0, limit).reduce((g, e) => { const k = new Date(e.scheduledAt).toDateString(); if (!g[k]) g[k] = []; g[k].push(e); return g }, {} as Record<string, BranchEvent[]>)

  return (
    <div className="upcoming-list">
      {Object.entries(grouped).map(([dateKey, dayEvents]) => (
        <div key={dateKey} className="upcoming-day">
          <div className="upcoming-day-header"><span className="upcoming-day-date">{formatEventDate(new Date(dateKey))}</span><span className="upcoming-day-count">{dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}</span></div>
          <div className="upcoming-day-events">
            {dayEvents.map(event => (
              <div key={event.id} className={`upcoming-event upcoming-event--${event.type}`} onClick={() => onEventClick?.(event)} role="button" tabIndex={0}>
                <div className="upcoming-event-time"><span className="time">{formatEventTime(event.scheduledAt)}</span><span className="duration">{event.duration}m</span></div>
                <div className={`upcoming-event-indicator upcoming-event-indicator--${event.type}`} />
                <div className="upcoming-event-info">
                  <span className="candidate-name">{event.candidateName}</span>
                  <span className="event-meta"><span className={`event-type event-type--${event.type}`}>{getEventTypeLabel(event.type)}</span>{event.jobTitle && <><span className="separator">•</span><span className="job-title">{event.jobTitle}</span></>}</span>
                </div>
                <svg className="upcoming-event-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
