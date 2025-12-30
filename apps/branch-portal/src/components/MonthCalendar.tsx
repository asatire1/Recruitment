import { useState, useRef } from 'react'
import { useMonthEvents, isToday, getEventTypeLabel } from '../hooks/useBranchData'
import type { BranchEvent } from '../hooks/useBranchData'
import { Spinner } from '@allied/shared-ui'

interface MonthCalendarProps { onEventClick?: (event: BranchEvent) => void; onDayClick?: (date: Date, events: BranchEvent[]) => void }
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function MonthCalendar({ onEventClick, onDayClick }: MonthCalendarProps) {
  const today = new Date()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const { monthEvents, loading } = useMonthEvents(currentYear, currentMonth)
  const touchStartX = useRef<number>(0), touchEndX = useRef<number>(0)

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX }
  const handleTouchMove = (e: React.TouchEvent) => { touchEndX.current = e.touches[0].clientX }
  const handleTouchEnd = () => { const diff = touchStartX.current - touchEndX.current; if (Math.abs(diff) > 50) { diff > 0 ? goToNextMonth() : goToPrevMonth() } }

  const goToPrevMonth = () => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1) } else setCurrentMonth(m => m - 1) }
  const goToNextMonth = () => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1) } else setCurrentMonth(m => m + 1) }
  const goToToday = () => { setCurrentYear(today.getFullYear()); setCurrentMonth(today.getMonth()) }
  const isCurrentMonth = currentYear === today.getFullYear() && currentMonth === today.getMonth()

  const firstDay = new Date(currentYear, currentMonth, 1), lastDay = new Date(currentYear, currentMonth + 1, 0), daysInMonth = lastDay.getDate()
  let startDay = firstDay.getDay() - 1; if (startDay < 0) startDay = 6
  const cells: (Date | null)[] = []
  for (let i = 0; i < startDay; i++) cells.push(null)
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(currentYear, currentMonth, day))

  return (
    <div className="month-calendar" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <div className="month-calendar__nav">
        <button className="nav-btn" onClick={goToPrevMonth} aria-label="Previous month"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg></button>
        <div className="nav-title"><span className="month-year">{MONTHS[currentMonth]} {currentYear}</span>{!isCurrentMonth && <button className="today-btn" onClick={goToToday}>Today</button>}</div>
        <button className="nav-btn" onClick={goToNextMonth} aria-label="Next month"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg></button>
      </div>
      <div className="month-calendar__header">{DAYS.map(d => <div key={d} className="month-day-name">{d}</div>)}</div>
      {loading ? <div className="month-calendar__loading"><Spinner size="md" /></div> : (
        <div className="month-calendar__grid">
          {cells.map((date, idx) => {
            if (!date) return <div key={`empty-${idx}`} className="month-cell month-cell--empty" />
            const dateKey = date.toISOString().split('T')[0], dayEvents = monthEvents.get(dateKey) || [], isDateToday = isToday(date), isPast = date < today && !isDateToday
            return (
              <div key={dateKey} className={`month-cell ${isDateToday ? 'month-cell--today' : ''} ${isPast ? 'month-cell--past' : ''} ${dayEvents.length > 0 ? 'month-cell--has-events' : ''}`}
                onClick={() => dayEvents.length > 0 && onDayClick?.(date, dayEvents)} role={dayEvents.length > 0 ? 'button' : undefined} tabIndex={dayEvents.length > 0 ? 0 : undefined}>
                <span className={`month-cell-number ${isDateToday ? 'month-cell-number--today' : ''}`}>{date.getDate()}</span>
                {dayEvents.length > 0 && <div className="month-cell-events">{dayEvents.slice(0, 2).map(e => <div key={e.id} className={`month-event-dot month-event-dot--${e.type}`} title={`${e.candidateName} - ${getEventTypeLabel(e.type)}`} />)}{dayEvents.length > 2 && <span className="month-event-more">+{dayEvents.length - 2}</span>}</div>}
              </div>
            )
          })}
        </div>
      )}
      <div className="month-calendar__legend"><div className="legend-item"><span className="legend-dot legend-dot--interview" /><span>Interview</span></div><div className="legend-item"><span className="legend-dot legend-dot--trial" /><span>Trial</span></div></div>
    </div>
  )
}
