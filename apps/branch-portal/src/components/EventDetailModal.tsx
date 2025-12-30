import { useEffect, useRef } from 'react'
import { BranchEvent, formatEventTime, formatEventDate, getEventTypeLabel } from '../hooks/useBranchData'
import { Button, Badge } from '@allied/shared-ui'

interface EventDetailModalProps { event: BranchEvent | null; onClose: () => void }

export function EventDetailModal({ event, onClose }: EventDetailModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (event) { document.addEventListener('keydown', handleEscape); document.body.style.overflow = 'hidden' }
    return () => { document.removeEventListener('keydown', handleEscape); document.body.style.overflow = '' }
  }, [event, onClose])

  if (!event) return null

  const statusLabel = { scheduled: 'Scheduled', completed: 'Completed', cancelled: 'Cancelled', no_show: 'No Show' }[event.status]
  const statusVariant = { scheduled: 'info', completed: 'success', cancelled: 'default', no_show: 'error' }[event.status] as any

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal event-detail-modal" role="dialog" aria-modal="true">
        <div className="modal-header">
          <div className="modal-title-row"><span className={`event-type-badge event-type-badge--${event.type}`}>{getEventTypeLabel(event.type)}</span><Badge variant={statusVariant}>{statusLabel}</Badge></div>
          <button className="modal-close" onClick={onClose} aria-label="Close"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
        </div>
        <div className="modal-body">
          <section className="event-detail-section"><h3 className="event-detail-candidate-name">{event.candidateName}</h3>{event.jobTitle && <p className="event-detail-job">{event.jobTitle}</p>}</section>
          <section className="event-detail-section"><h4 className="event-detail-label">Schedule</h4><div className="event-detail-schedule"><div className="schedule-item"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg><span>{formatEventDate(event.scheduledAt)}</span></div><div className="schedule-item"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg><span>{formatEventTime(event.scheduledAt)} ({event.duration} min)</span></div></div></section>
          {(event.location || event.branchName) && <section className="event-detail-section"><h4 className="event-detail-label">Location</h4><div className="event-detail-location">{event.location && <div className="location-item"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg><span>{event.location}</span></div>}{event.branchName && <div className="location-item"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg><span>{event.branchName}</span></div>}</div></section>}
          <div className="event-detail-note"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg><span>Contact details are managed by the recruitment team.</span></div>
        </div>
        <div className="modal-footer"><Button variant="secondary" onClick={onClose} fullWidth>Close</Button></div>
      </div>
    </div>
  )
}
