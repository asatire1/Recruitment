import { useState } from 'react'
import { WeekCalendar, MonthCalendar, EventDetailModal } from '../components'
import type { BranchEvent } from '../hooks/useBranchData'

type CalendarView = 'week' | 'month'

export function Calendar() {
  const [view, setView] = useState<CalendarView>('week')
  const [selectedEvent, setSelectedEvent] = useState<BranchEvent | null>(null)
  const [dayEvents, setDayEvents] = useState<BranchEvent[]>([])
  const [showDayModal, setShowDayModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const handleDayClick = (date: Date, events: BranchEvent[]) => { setSelectedDate(date); setDayEvents(events); setShowDayModal(true) }
  const handleCloseDayModal = () => { setShowDayModal(false); setDayEvents([]); setSelectedDate(null) }

  return (
    <div className="page calendar-page">
      <header className="page-header">
        <h1>Calendar</h1>
        <div className="view-toggle">
          <button className={`toggle-btn ${view === 'week' ? 'active' : ''}`} onClick={() => setView('week')}>Week</button>
          <button className={`toggle-btn ${view === 'month' ? 'active' : ''}`} onClick={() => setView('month')}>Month</button>
        </div>
      </header>
      <div className="calendar-container">
        {view === 'week' ? <WeekCalendar onEventClick={setSelectedEvent} /> : <MonthCalendar onEventClick={setSelectedEvent} onDayClick={handleDayClick} />}
      </div>
      <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      {showDayModal && selectedDate && (
        <div className="modal-backdrop" onClick={handleCloseDayModal}>
          <div className="modal day-events-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
              <button className="modal-close" onClick={handleCloseDayModal}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
            </div>
            <div className="modal-body">
              <div className="day-events-list">
                {dayEvents.map(event => (
                  <div key={event.id} className={`day-event-item day-event-item--${event.type}`} onClick={() => { handleCloseDayModal(); setSelectedEvent(event) }} role="button" tabIndex={0}>
                    <span className="event-time">{event.scheduledAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                    <div className={`event-indicator event-indicator--${event.type}`} />
                    <div className="event-details"><span className="candidate-name">{event.candidateName}</span><span className="event-type">{event.type === 'trial' ? 'Trial' : 'Interview'}</span></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
