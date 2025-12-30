import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useBranchStats } from '../hooks/useBranchData'
import { TodayWidget, UpcomingList, EventDetailModal } from '../components'
import type { BranchEvent } from '../hooks/useBranchData'
import { Card } from '@allied/shared-ui'

export function MyBranch() {
  const { user } = useAuth()
  const stats = useBranchStats()
  const navigate = useNavigate()
  const [selectedEvent, setSelectedEvent] = useState<BranchEvent | null>(null)
  const branchCount = user?.branchIds?.length || 0

  return (
    <div className="page my-branch-page">
      <TodayWidget onEventClick={setSelectedEvent} />
      {stats.pendingFeedback > 0 && (
        <section className="section">
          <Card className="action-card action-card--warning" onClick={() => navigate('/feedback')}>
            <div className="action-icon warning"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg></div>
            <div className="action-content"><h3>Pending Feedback</h3><p>{stats.pendingFeedback} trial{stats.pendingFeedback !== 1 ? 's' : ''} awaiting feedback</p></div>
            <span className="action-badge">{stats.pendingFeedback}</span>
            <svg className="action-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
          </Card>
        </section>
      )}
      <section className="section">
        <div className="stats-grid">
          <div className="stat-card"><span className="stat-value">{stats.todayEvents}</span><span className="stat-label">Today</span></div>
          <div className="stat-card"><span className="stat-value">{stats.upcomingEvents}</span><span className="stat-label">This Week</span></div>
          <div className="stat-card"><span className="stat-value">{stats.completedThisWeek}</span><span className="stat-label">Completed</span></div>
          <div className="stat-card"><span className="stat-value">{branchCount}</span><span className="stat-label">Branches</span></div>
        </div>
      </section>
      <section className="section">
        <div className="section-header"><h2>Upcoming</h2><button className="section-link" onClick={() => navigate('/calendar')}>View Calendar</button></div>
        <UpcomingList onEventClick={setSelectedEvent} limit={5} />
      </section>
      <section className="section">
        <h2>Quick Actions</h2>
        <div className="quick-actions">
          <button className="quick-action" onClick={() => navigate('/calendar')}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /></svg><span>Calendar</span></button>
          <button className="quick-action" onClick={() => navigate('/feedback')}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /></svg><span>Feedback</span></button>
        </div>
      </section>
      <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </div>
  )
}
