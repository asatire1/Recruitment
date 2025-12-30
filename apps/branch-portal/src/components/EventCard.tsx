import { BranchEvent, formatEventTime, getEventTypeLabel, getStatusColor } from '../hooks/useBranchData'

interface EventCardProps { event: BranchEvent; onClick?: (event: BranchEvent) => void; compact?: boolean }

export function EventCard({ event, onClick, compact = false }: EventCardProps) {
  const handleClick = () => onClick?.(event)
  if (compact) return <div className={`event-card event-card--compact event-card--${event.type}`} onClick={handleClick} role="button" tabIndex={0} style={{ borderLeftColor: getStatusColor(event.status) }}><span className="event-time">{formatEventTime(event.scheduledAt)}</span><span className="event-name">{event.candidateName}</span></div>
  return (
    <div className={`event-card event-card--${event.type} event-card--${event.status}`} onClick={handleClick} role="button" tabIndex={0}>
      <div className="event-card__header"><span className={`event-type-badge event-type-badge--${event.type}`}>{getEventTypeLabel(event.type)}</span><span className="event-time">{formatEventTime(event.scheduledAt)}</span></div>
      <div className="event-card__body"><h4 className="event-candidate-name">{event.candidateName}</h4>{event.jobTitle && <p className="event-job-title">{event.jobTitle}</p>}</div>
      <div className="event-card__footer">{event.location && <span className="event-location"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>{event.location}</span>}<span className="event-duration">{event.duration} min</span></div>
    </div>
  )
}
