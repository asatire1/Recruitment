import { useState, useRef } from 'react'
import { useWeekEvents, formatEventTime, isToday, getEventTypeLabel } from '../hooks/useBranchData'
import type { BranchEvent, DayEvents } from '../hooks/useBranchData'
import { Spinner } from '@allied/shared-ui'

interface WeekCalendarProps { onEventClick?: (event: BranchEvent) => void }

function getStartOfWeek(d: Date): Date { const r = new Date(d); const day = r.getDay(); const diff = r.getDate() - day + (day === 0 ? -6 : 1); r.setDate(diff); r.setHours(0,0,0,0); return r }
function addWeeks(d: Date, w: number): Date { const r = new Date(d); r.setDate(r.getDate() + w * 7); return r }
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function WeekCalendar({ onEventClick }: WeekCalendarProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getStartOfWeek(new Date()))
  const { weekEvents, loading } = useWeekEvents(currentWeekStart)
  const touchStartX = useRef<number>(0), touchEndX = useRef<number>(0)

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX }
  const handleTouchMove = (e: React.TouchEvent) => { touchEndX.current = e.touches[0].clientX }
  const handleTouchEnd = () => { const diff = touchStartX.current - touchEndX.current; if (Math.abs(diff) > 50) { diff > 0 ? setCurrentWeekStart(prev => addWeeks(prev, 1)) : setCurrentWeekStart(prev => addWeeks(prev, -1)) } }

  const weekEnd = new Date(currentWeekStart); weekEnd.setDate(weekEnd.getDate() + 6)
  const weekRangeText = `${currentWeekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${weekEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
  const isCurrentWeek = isToday(currentWeekStart) || (currentWeekStart <= new Date() && weekEnd >= new Date())

  return (
    <div className="week-calendar" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <div className="week-calendar__nav">
        <button className="nav-btn" onClick={() => setCurrentWeekStart(prev => addWeeks(prev, -1))} aria-label="Previous week"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg></button>
        <div className="nav-title"><span className="week-range">{weekRangeText}</span>{!isCurrentWeek && <button className="today-btn" onClick={() => setCurrentWeekStart(getStartOfWeek(new Date()))}>Today</button>}</div>
        <button className="nav-btn" onClick={() => setCurrentWeekStart(prev => addWeeks(prev, 1))} aria-label="Next week"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg></button>
      </div>
      {loading ? <div className="week-calendar__loading"><Spinner size="md" /></div> : (
        <div className="week-calendar__grid">
          {weekEvents.map((day, idx) => {
            const today = isToday(day.date), isPast = day.date < new Date() && !today
            return (
              <div key={day.date.toISOString()} className={`day-column ${today ? 'day-column--today' : ''} ${isPast ? 'day-column--past' : ''}`}>
                <div className="day-header"><span className="day-name">{DAYS[idx]}</span><span className={`day-number ${today ? 'day-number--today' : ''}`}>{day.date.getDate()}</span></div>
                <div className="day-events">
                  {day.events.length === 0 ? <div className="day-empty">-</div> : day.events.map(event => (
                    <div key={event.id} className={`day-event day-event--${event.type}`} onClick={() => onEventClick?.(event)} role="button" tabIndex={0} title={`${event.candidateName} - ${getEventTypeLabel(event.type)}`}>
                      <span className="event-time">{formatEventTime(event.scheduledAt)}</span><span className="event-name">{event.candidateName.split(' ')[0]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
      <div className="week-calendar__hint"><span>← Swipe to navigate →</span></div>
    </div>
  )
}
