import { useTodaySchedule, formatEventTime, getEventTypeLabel } from '../hooks/useBranchData'
import type { BranchEvent } from '../hooks/useBranchData'
import { Spinner } from '@allied/shared-ui'

interface TodayWidgetProps { onEventClick?: (event: BranchEvent) => void }

export function TodayWidget({ onEventClick }: TodayWidgetProps) {
  const { events, loading } = useTodaySchedule()
  const now = new Date()
  const currentHour = now.getHours()
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 17 ? 'Good afternoon' : 'Good evening'

  if (loading) return <div className="today-widget"><div className="today-widget__header"><h3>{greeting}</h3></div><div className="today-widget__loading"><Spinner size="sm" /></div></div>

  const upcomingToday = events.filter(e => new Date(e.scheduledAt) > now && e.status === 'scheduled')

  return (
    <div className="today-widget">
      <div className="today-widget__header">
        <h3>{greeting}</h3>
        <span className="today-date">{now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
      </div>
      {events.length === 0 ? (
        <div className="today-widget__empty">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
          <p>No events scheduled for today</p>
        </div>
      ) : (
        <div className="today-widget__content">
          <div className="today-summary"><span className="today-count">{events.length}</span><span className="today-label">event{events.length !== 1 ? 's' : ''} today</span></div>
          {upcomingToday.length > 0 && (
            <div className="today-next">
              <span className="today-next-label">Next up:</span>
              <div className="today-next-event" onClick={() => onEventClick?.(upcomingToday[0])} role="button" tabIndex={0}>
                <span className="event-time">{formatEventTime(upcomingToday[0].scheduledAt)}</span>
                <span className={`event-type-dot event-type-dot--${upcomingToday[0].type}`} />
                <span className="event-info"><strong>{upcomingToday[0].candidateName}</strong><span>{getEventTypeLabel(upcomingToday[0].type)}</span></span>
              </div>
            </div>
          )}
          <div className="today-timeline">
            {events.slice(0, 5).map(event => {
              const isPast = new Date(event.scheduledAt) <= now
              return (
                <div key={event.id} className={`timeline-item ${isPast ? 'timeline-item--past' : ''}`} onClick={() => onEventClick?.(event)} role="button" tabIndex={0}>
                  <span className="timeline-time">{formatEventTime(event.scheduledAt)}</span>
                  <span className={`timeline-dot timeline-dot--${event.type}`} />
                  <span className="timeline-name">{event.candidateName}</span>
                </div>
              )
            })}
            {events.length > 5 && <div className="timeline-more">+{events.length - 5} more</div>}
          </div>
        </div>
      )}
    </div>
  )
}
