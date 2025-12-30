import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs, orderBy, limit, Timestamp, onSnapshot } from 'firebase/firestore'
import { getFirebaseDb, COLLECTIONS } from '@allied/shared-lib'
import type { Candidate, Interview, Job, CandidateStatus, ActivityLog, ActivityAction } from '@allied/shared-lib'
import { Card, Spinner, Badge } from '@allied/shared-ui'
import { useAuth } from '../contexts/AuthContext'
import './Dashboard.css'

// ============================================================================
// TYPES
// ============================================================================

interface DashboardStats {
  totalCandidates: number
  newThisWeek: number
  newLastWeek: number  // For trend calculation
  interviewsScheduled: number  // Upcoming interviews
  openJobs: number
}

interface StatCard {
  id: string
  icon: string
  label: string
  value: number
  color: 'blue' | 'green' | 'purple' | 'orange'
  trend?: { value: number; direction: 'up' | 'down' | 'neutral' }
  link: string
}

interface PipelineStage {
  status: CandidateStatus | 'interview' | 'trial'
  label: string
  count: number
  percentage: number
  color: string
  statuses: CandidateStatus[]  // Actual statuses this stage includes
}

interface ActivityItem {
  id: string
  action: ActivityAction
  description: string
  entityType: 'candidate' | 'job' | 'interview' | 'branch' | 'user'
  entityId: string
  userName: string
  createdAt: Date
}

interface JobOverview {
  id: string
  title: string
  branchName: string
  employmentType: string
  candidateCount: number
  status: 'draft' | 'active' | 'closed'
  publishedAt?: Date
  closedAt?: Date
}

interface RecentCandidate {
  id: string
  name: string
  status: CandidateStatus
  jobTitle?: string
  createdAt: Date
}

interface UpcomingInterview {
  id: string
  candidateId: string
  candidateName: string
  candidatePhone?: string
  type: 'interview' | 'trial'
  scheduledDate: Date
  branchName: string
  branchId?: string
  status: string
  notes?: string
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getStatusColor = (status: CandidateStatus): string => {
  const colors: Record<CandidateStatus, string> = {
    new: 'info',
    screening: 'warning',
    interview_scheduled: 'info',
    interview_complete: 'info',
    trial_scheduled: 'info',
    trial_complete: 'info',
    approved: 'success',
    rejected: 'error',
    withdrawn: 'neutral',
  }
  return colors[status] || 'neutral'
}

const formatDate = (date: Date): string => {
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) {
    return 'Today, ' + date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  } else if (days === 1) {
    return 'Tomorrow, ' + date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  } else if (days < 7) {
    return date.toLocaleDateString('en-GB', { weekday: 'long', hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const formatRelativeDate = (date: Date): string => {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// Get activity icon and color based on action type
const getActivityStyle = (action: ActivityAction): { icon: string; color: string } => {
  const styles: Record<ActivityAction, { icon: string; color: string }> = {
    created: { icon: '➕', color: '#34C759' },
    updated: { icon: '✏️', color: '#007AFF' },
    deleted: { icon: '🗑️', color: '#FF3B30' },
    status_changed: { icon: '🔄', color: '#AF52DE' },
    cv_uploaded: { icon: '📄', color: '#5856D6' },
    cv_parsed: { icon: '🤖', color: '#FF9500' },
    interview_scheduled: { icon: '📅', color: '#007AFF' },
    feedback_submitted: { icon: '📝', color: '#34C759' },
    message_sent: { icon: '💬', color: '#5AC8FA' },
    booking_link_created: { icon: '🔗', color: '#FF9500' },
    booking_link_used: { icon: '✅', color: '#34C759' },
  }
  return styles[action] || { icon: '📌', color: '#8e8e93' }
}

// ============================================================================
// COMPONENT
// ============================================================================

export function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([])
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([])
  const [activeJobsList, setActiveJobsList] = useState<JobOverview[]>([])
  const [recentCandidates, setRecentCandidates] = useState<RecentCandidate[]>([])
  const [upcomingInterviews, setUpcomingInterviews] = useState<UpcomingInterview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const db = getFirebaseDb()

  // State for real-time indicator
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [isLive, setIsLive] = useState(true)

  // Helper to calculate date ranges
  const getDateRanges = useCallback(() => {
    const now = new Date()
    const oneWeekAgo = new Date(now)
    oneWeekAgo.setDate(now.getDate() - 7)
    oneWeekAgo.setHours(0, 0, 0, 0)
    
    const twoWeeksAgo = new Date(now)
    twoWeeksAgo.setDate(now.getDate() - 14)
    twoWeeksAgo.setHours(0, 0, 0, 0)
    
    const sevenDaysFromNow = new Date(now)
    sevenDaysFromNow.setDate(now.getDate() + 7)
    
    return { now, oneWeekAgo, twoWeeksAgo, sevenDaysFromNow }
  }, [])

  // Process candidates data
  const processCandidates = useCallback((candidates: Candidate[]) => {
    const { oneWeekAgo, twoWeeksAgo } = getDateRanges()
    
    const totalCandidates = candidates.length
    const newThisWeek = candidates.filter(c => {
      const createdAt = c.createdAt?.toDate?.()
      return createdAt && createdAt >= oneWeekAgo
    }).length
    const newLastWeek = candidates.filter(c => {
      const createdAt = c.createdAt?.toDate?.()
      return createdAt && createdAt >= twoWeeksAgo && createdAt < oneWeekAgo
    }).length

    // Pipeline stages
    const pipelineConfig: { 
      status: CandidateStatus | 'interview' | 'trial'
      label: string
      color: string
      statuses: CandidateStatus[]
    }[] = [
      { status: 'new', label: 'New', color: '#007AFF', statuses: ['new'] },
      { status: 'screening', label: 'Screening', color: '#5856D6', statuses: ['screening'] },
      { status: 'interview', label: 'Interview', color: '#AF52DE', statuses: ['interview_scheduled', 'interview_complete'] },
      { status: 'trial', label: 'Trial', color: '#FF9500', statuses: ['trial_scheduled', 'trial_complete'] },
      { status: 'approved', label: 'Approved', color: '#34C759', statuses: ['approved', 'offer_made', 'hired'] },
      { status: 'rejected', label: 'Rejected', color: '#FF3B30', statuses: ['rejected', 'withdrawn'] },
    ]

    const pipeline = pipelineConfig.map(stage => {
      const count = candidates.filter(c => stage.statuses.includes(c.status)).length
      return {
        ...stage,
        count,
        percentage: totalCandidates > 0 ? Math.round((count / totalCandidates) * 100) : 0,
      }
    })

    // Recent candidates
    const sortedCandidates = [...candidates]
      .sort((a, b) => {
        const aDate = a.createdAt?.toDate?.() || new Date(0)
        const bDate = b.createdAt?.toDate?.() || new Date(0)
        return bDate.getTime() - aDate.getTime()
      })
      .slice(0, 5)

    const recentCands = sortedCandidates.map(c => ({
      id: c.id,
      name: `${c.firstName} ${c.lastName}`,
      status: c.status,
      jobTitle: c.jobTitle,
      createdAt: c.createdAt?.toDate?.() || new Date(),
    }))

    return { totalCandidates, newThisWeek, newLastWeek, pipeline, recentCands }
  }, [getDateRanges])

  // Set up real-time listeners
  useEffect(() => {
    setLoading(true)
    setError(null)

    const unsubscribers: (() => void)[] = []

    // ========== CANDIDATES LISTENER ==========
    const candidatesRef = collection(db, COLLECTIONS.CANDIDATES)
    const candidatesUnsub = onSnapshot(candidatesRef, (snapshot) => {
      const candidates = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Candidate[]

      const { totalCandidates, newThisWeek, newLastWeek, pipeline, recentCands } = processCandidates(candidates)
      
      setStats(prev => ({
        ...prev!,
        totalCandidates,
        newThisWeek,
        newLastWeek,
        interviewsScheduled: prev?.interviewsScheduled || 0,
        openJobs: prev?.openJobs || 0,
      }))
      setPipelineStages(pipeline)
      setRecentCandidates(recentCands)
      setLastUpdated(new Date())
      setLoading(false)
    }, (err) => {
      console.error('Candidates listener error:', err)
      setError('Failed to load candidates')
      setIsLive(false)
    })
    unsubscribers.push(candidatesUnsub)

    // ========== INTERVIEWS LISTENER ==========
    const interviewsRef = collection(db, COLLECTIONS.INTERVIEWS)
    const interviewsUnsub = onSnapshot(interviewsRef, (snapshot) => {
      const { now, sevenDaysFromNow } = getDateRanges()
      
      let interviews = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }) as Interview)
        .filter(i => i.scheduledDate && i.scheduledDate.toDate() >= now && i.status === 'scheduled')
        .sort((a, b) => a.scheduledDate.toDate().getTime() - b.scheduledDate.toDate().getTime())

      const interviewsScheduled = interviews.length

      // Filter for next 7 days
      const upcomingInNext7Days = interviews.filter(i => {
        const scheduledDate = i.scheduledDate?.toDate?.()
        return scheduledDate && scheduledDate <= sevenDaysFromNow
      })

      setUpcomingInterviews(
        upcomingInNext7Days
          .slice(0, 10)
          .map(i => ({
            id: i.id,
            candidateId: i.candidateId,
            candidateName: i.candidateName,
            candidatePhone: i.candidatePhone,
            type: i.type,
            scheduledDate: i.scheduledDate.toDate(),
            branchName: i.branchName,
            branchId: i.branchId,
            status: i.status,
            notes: i.notes,
          }))
      )

      setStats(prev => prev ? { ...prev, interviewsScheduled } : null)
      setLastUpdated(new Date())
    }, (err) => {
      console.error('Interviews listener error:', err)
      setIsLive(false)
    })
    unsubscribers.push(interviewsUnsub)

    // ========== JOBS LISTENER ==========
    const jobsRef = collection(db, COLLECTIONS.JOBS)
    const jobsUnsub = onSnapshot(jobsRef, (snapshot) => {
      const jobs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Job[]

      const openJobs = jobs.filter(j => j.status === 'active').length

      const activeJobsData = jobs
        .filter(j => j.status === 'active')
        .map(j => ({
          id: j.id,
          title: j.title,
          branchName: j.branchName || 'No branch',
          employmentType: j.employmentType || 'full_time',
          candidateCount: j.candidateCount || 0,
          status: j.status as 'draft' | 'active' | 'closed',
          publishedAt: j.publishedAt?.toDate?.(),
          closedAt: j.closedAt?.toDate?.(),
        }))
        .sort((a, b) => b.candidateCount - a.candidateCount)
        .slice(0, 8)

      setActiveJobsList(activeJobsData)
      setStats(prev => prev ? { ...prev, openJobs } : null)
      setLastUpdated(new Date())
    }, (err) => {
      console.error('Jobs listener error:', err)
      setIsLive(false)
    })
    unsubscribers.push(jobsUnsub)

    // ========== ACTIVITY LOG LISTENER ==========
    const activityRef = collection(db, COLLECTIONS.ACTIVITY_LOG)
    const activityUnsub = onSnapshot(activityRef, (snapshot) => {
      const activities = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }) as ActivityLog)
        .sort((a, b) => {
          const aDate = a.createdAt?.toDate?.()?.getTime() || 0
          const bDate = b.createdAt?.toDate?.()?.getTime() || 0
          return bDate - aDate
        })
        .slice(0, 20)

      setRecentActivities(activities.map(a => ({
        id: a.id,
        action: a.action,
        description: a.description,
        entityType: a.entityType,
        entityId: a.entityId,
        userName: a.userName || 'System',
        createdAt: a.createdAt?.toDate?.() || new Date(),
      })))
      setLastUpdated(new Date())
    }, (err) => {
      console.error('Activity listener error:', err)
      setIsLive(false)
    })
    unsubscribers.push(activityUnsub)

    // Cleanup all listeners on unmount
    return () => {
      unsubscribers.forEach(unsub => unsub())
    }
  }, [db, getDateRanges, processCandidates])

  // Calculate trend for "New This Week"
  const calculateTrend = (): { value: number; direction: 'up' | 'down' | 'neutral' } | undefined => {
    if (!stats) return undefined
    if (stats.newLastWeek === 0) {
      return stats.newThisWeek > 0 ? { value: 100, direction: 'up' } : undefined
    }
    const change = ((stats.newThisWeek - stats.newLastWeek) / stats.newLastWeek) * 100
    if (change === 0) return { value: 0, direction: 'neutral' }
    return {
      value: Math.abs(Math.round(change)),
      direction: change > 0 ? 'up' : 'down'
    }
  }

  // Build stat cards array
  const statCards: StatCard[] = stats ? [
    {
      id: 'total',
      icon: '👥',
      label: 'Total Candidates',
      value: stats.totalCandidates,
      color: 'blue',
      link: '/candidates'
    },
    {
      id: 'new',
      icon: '✨',
      label: 'New This Week',
      value: stats.newThisWeek,
      color: 'green',
      trend: calculateTrend(),
      link: '/candidates?status=new'
    },
    {
      id: 'interviews',
      icon: '📅',
      label: 'Interviews Scheduled',
      value: stats.interviewsScheduled,
      color: 'purple',
      link: '/interviews'
    },
    {
      id: 'jobs',
      icon: '💼',
      label: 'Open Jobs',
      value: stats.openJobs,
      color: 'orange',
      link: '/jobs?status=active'
    }
  ] : []

  if (loading) {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <h1>Dashboard</h1>
          <p className="dashboard-welcome">Welcome back, {user?.displayName || 'User'}</p>
        </div>
        
        {/* Loading Skeleton */}
        <div className="stats-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="stat-card skeleton">
              <div className="skeleton-icon" />
              <div className="skeleton-content">
                <div className="skeleton-value" />
                <div className="skeleton-label" />
              </div>
            </div>
          ))}
        </div>
        
        <div className="dashboard-loading-content">
          <Spinner size="lg" />
          <p>Loading dashboard data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="header-left">
          <h1>Dashboard</h1>
          <p className="dashboard-welcome">Welcome back, {user?.displayName || 'User'}</p>
        </div>
        <div className="header-right">
          <div className={`live-indicator ${isLive ? 'live' : 'offline'}`}>
            <span className="live-dot" />
            <span className="live-text">{isLive ? 'Live' : 'Offline'}</span>
          </div>
          <span className="last-updated">
            Updated {formatRelativeDate(lastUpdated)}
          </span>
        </div>
      </div>

      {/* Stats Grid - 4 Primary Cards */}
      <div className="stats-grid">
        {statCards.map(stat => (
          <Card 
            key={stat.id}
            className={`stat-card clickable ${stat.color}`} 
            onClick={() => navigate(stat.link)}
          >
            <div className={`stat-icon ${stat.color}`}>
              <span className="stat-emoji">{stat.icon}</span>
            </div>
            <div className="stat-content">
              <span className="stat-value">{stat.value.toLocaleString()}</span>
              <span className="stat-label">{stat.label}</span>
              {stat.trend && stat.trend.value > 0 && (
                <span className={`stat-trend ${stat.trend.direction}`}>
                  {stat.trend.direction === 'up' ? '↑' : stat.trend.direction === 'down' ? '↓' : '→'} 
                  {stat.trend.value}% vs last week
                </span>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Pipeline Visualization */}
      <Card className="pipeline-card">
        <div className="pipeline-header">
          <h2>Candidate Pipeline</h2>
          <span className="pipeline-total">{stats?.totalCandidates || 0} total candidates</span>
        </div>
        <div className="pipeline-stages">
          {pipelineStages.map(stage => (
            <div 
              key={stage.status} 
              className="pipeline-stage"
              onClick={() => {
                const statusParam = stage.statuses.join(',')
                navigate(`/candidates?status=${statusParam}`)
              }}
            >
              <div className="pipeline-stage-header">
                <span className="pipeline-stage-label">{stage.label}</span>
                <span className="pipeline-stage-count">{stage.count}</span>
              </div>
              <div className="pipeline-bar-container">
                <div 
                  className="pipeline-bar"
                  style={{ 
                    width: `${Math.max(stage.percentage, 5)}%`,
                    backgroundColor: stage.color 
                  }}
                />
              </div>
              <span className="pipeline-stage-percentage">{stage.percentage}%</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Content Grid */}
      <div className="dashboard-content">
        {/* Recent Candidates */}
        <Card className="dashboard-card">
          <div className="card-header">
            <h2>Recent Candidates</h2>
            <a href="/candidates" className="view-all">View all →</a>
          </div>
          <div className="card-content">
            {recentCandidates.length === 0 ? (
              <p className="empty-message">No candidates yet</p>
            ) : (
              <ul className="candidate-list">
                {recentCandidates.map(candidate => (
                  <li key={candidate.id} className="candidate-item">
                    <div className="candidate-info">
                      <span className="candidate-name">{candidate.name}</span>
                      <span className="candidate-job">{candidate.jobTitle || 'No job assigned'}</span>
                    </div>
                    <div className="candidate-meta">
                      <Badge variant={getStatusColor(candidate.status) as any}>
                        {candidate.status.replace(/_/g, ' ')}
                      </Badge>
                      <span className="candidate-date">{formatRelativeDate(candidate.createdAt)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* Upcoming Interviews - Enhanced Widget */}
        <Card className="dashboard-card upcoming-widget">
          <div className="card-header">
            <div className="header-title-group">
              <h2>📅 Upcoming (Next 7 Days)</h2>
              <span className="upcoming-count">{upcomingInterviews.length} scheduled</span>
            </div>
            <a href="/interviews" className="view-all">View all →</a>
          </div>
          <div className="card-content">
            {upcomingInterviews.length === 0 ? (
              <div className="empty-upcoming">
                <div className="empty-icon">📅</div>
                <p>No interviews or trials in the next 7 days</p>
                <button 
                  className="schedule-btn"
                  onClick={() => navigate('/candidates')}
                >
                  Schedule Interview
                </button>
              </div>
            ) : (
              <ul className="upcoming-list">
                {upcomingInterviews.map(interview => {
                  const isToday = new Date().toDateString() === interview.scheduledDate.toDateString()
                  const isTomorrow = new Date(Date.now() + 86400000).toDateString() === interview.scheduledDate.toDateString()
                  
                  return (
                    <li key={interview.id} className={`upcoming-item ${isToday ? 'today' : ''}`}>
                      <div className="upcoming-date-badge">
                        <span className="date-day">
                          {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : interview.scheduledDate.toLocaleDateString('en-GB', { weekday: 'short' })}
                        </span>
                        <span className="date-num">
                          {interview.scheduledDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </span>
                        <span className="date-time">
                          {interview.scheduledDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      
                      <div className="upcoming-details">
                        <div className="upcoming-header">
                          <Badge variant={interview.type === 'interview' ? 'info' : 'success'} size="sm">
                            {interview.type}
                          </Badge>
                          {isToday && <span className="today-badge">Today</span>}
                        </div>
                        <span 
                          className="upcoming-candidate"
                          onClick={() => navigate(`/candidates/${interview.candidateId}`)}
                        >
                          {interview.candidateName}
                        </span>
                        <span className="upcoming-branch">📍 {interview.branchName}</span>
                      </div>
                      
                      <div className="upcoming-actions" onClick={(e) => e.stopPropagation()}>
                        <button 
                          className="action-btn-small"
                          title="View Candidate"
                          onClick={() => navigate(`/candidates/${interview.candidateId}`)}
                        >
                          👤
                        </button>
                        {interview.candidatePhone && (
                          <button 
                            className="action-btn-small"
                            title="Send WhatsApp"
                            onClick={() => {
                              const phone = interview.candidatePhone?.replace(/\D/g, '')
                              const formattedPhone = phone?.startsWith('44') ? phone : `44${phone?.replace(/^0/, '')}`
                              window.open(`https://wa.me/${formattedPhone}`, '_blank')
                            }}
                          >
                            💬
                          </button>
                        )}
                        <button 
                          className="action-btn-small"
                          title="View in Calendar"
                          onClick={() => navigate('/calendar')}
                        >
                          📅
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </Card>

        {/* Recent Activity Feed */}
        <Card className="dashboard-card activity-card">
          <div className="card-header">
            <h2>Recent Activity</h2>
            <span className="activity-count">{recentActivities.length} actions</span>
          </div>
          <div className="card-content">
            {recentActivities.length === 0 ? (
              <p className="empty-message">No recent activity</p>
            ) : (
              <ul className="activity-list">
                {recentActivities.map(activity => {
                  const style = getActivityStyle(activity.action)
                  return (
                    <li 
                      key={activity.id} 
                      className="activity-item"
                      onClick={() => {
                        if (activity.entityType === 'candidate' && activity.entityId) {
                          navigate(`/candidates/${activity.entityId}`)
                        } else if (activity.entityType === 'job' && activity.entityId) {
                          navigate(`/jobs/${activity.entityId}`)
                        }
                      }}
                    >
                      <div 
                        className="activity-icon"
                        style={{ backgroundColor: `${style.color}15` }}
                      >
                        <span>{style.icon}</span>
                      </div>
                      <div className="activity-content">
                        <p className="activity-description">{activity.description}</p>
                        <div className="activity-meta">
                          <span className="activity-user">{activity.userName}</span>
                          <span className="activity-time">{formatRelativeDate(activity.createdAt)}</span>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </Card>

        {/* Jobs Overview Widget */}
        <Card className="dashboard-card jobs-widget">
          <div className="card-header">
            <div className="header-title-group">
              <h2>💼 Active Jobs</h2>
              <span className="jobs-count">{activeJobsList.length} open positions</span>
            </div>
            <a href="/jobs" className="view-all">View all →</a>
          </div>
          <div className="card-content">
            {activeJobsList.length === 0 ? (
              <div className="empty-jobs">
                <div className="empty-icon">💼</div>
                <p>No active job postings</p>
                <button 
                  className="create-job-btn"
                  onClick={() => navigate('/jobs/new')}
                >
                  Create Job
                </button>
              </div>
            ) : (
              <div className="jobs-grid">
                {activeJobsList.map(job => {
                  const employmentLabel = {
                    full_time: 'Full-time',
                    part_time: 'Part-time',
                    locum: 'Locum',
                    contract: 'Contract'
                  }[job.employmentType] || job.employmentType

                  return (
                    <div 
                      key={job.id} 
                      className="job-card"
                      onClick={() => navigate(`/jobs/${job.id}`)}
                    >
                      <div className="job-card-header">
                        <h3 className="job-title">{job.title}</h3>
                        <span className={`employment-badge ${job.employmentType}`}>
                          {employmentLabel}
                        </span>
                      </div>
                      <p className="job-branch">📍 {job.branchName}</p>
                      <div className="job-card-footer">
                        <div className="candidate-count">
                          <span className="count-number">{job.candidateCount}</span>
                          <span className="count-label">
                            {job.candidateCount === 1 ? 'candidate' : 'candidates'}
                          </span>
                        </div>
                        <button 
                          className="view-job-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/jobs/${job.id}`)
                          }}
                        >
                          View →
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

export default Dashboard
