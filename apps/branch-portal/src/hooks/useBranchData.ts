import { useState, useEffect } from 'react'
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore'
import { getFirebaseDb, COLLECTIONS } from '@allied/shared-lib'
import type { Interview, InterviewStatus } from '@allied/shared-lib'
import { useAuth } from '../contexts/AuthContext'

export interface BranchEvent {
  id: string
  type: 'interview' | 'trial'
  candidateName: string
  jobTitle?: string
  scheduledAt: Date
  scheduledEndAt?: Date
  duration: number
  status: InterviewStatus
  branchId?: string
  branchName?: string
  location?: string
  isRemote?: boolean
  candidateId: string
}

export interface DayEvents { date: Date; events: BranchEvent[] }
export interface BranchStats { pendingFeedback: number; todayEvents: number; upcomingEvents: number; completedThisWeek: number }

function interviewToEvent(interview: Interview): BranchEvent {
  return {
    id: interview.id, type: interview.type, candidateName: interview.candidateName, jobTitle: interview.jobTitle,
    scheduledAt: interview.scheduledAt?.toDate?.() || new Date(interview.scheduledAt as any),
    scheduledEndAt: interview.scheduledEndAt?.toDate?.() || undefined, duration: interview.duration || 60,
    status: interview.status, branchId: interview.branchId, branchName: interview.branchName,
    location: interview.location, isRemote: interview.isRemote, candidateId: interview.candidateId,
  }
}

function getStartOfDay(d: Date): Date { const r = new Date(d); r.setHours(0,0,0,0); return r }
function getEndOfDay(d: Date): Date { const r = new Date(d); r.setHours(23,59,59,999); return r }
function getStartOfWeek(d: Date): Date { const r = new Date(d); const day = r.getDay(); const diff = r.getDate() - day + (day === 0 ? -6 : 1); r.setDate(diff); r.setHours(0,0,0,0); return r }
function addDays(d: Date, days: number): Date { const r = new Date(d); r.setDate(r.getDate() + days); return r }

export function useBranchEvents() {
  const { user } = useAuth()
  const [events, setEvents] = useState<BranchEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) { setEvents([]); setLoading(false); return }
    const db = getFirebaseDb()
    const branchIds = user.branchIds || []
    if (branchIds.length === 0 && user.role === 'branch_manager') { setEvents([]); setLoading(false); return }
    
    let q
    if (user.role === 'branch_manager' && branchIds.length > 0) {
      q = query(collection(db, COLLECTIONS.INTERVIEWS), where('branchId', 'in', branchIds.slice(0, 10)), orderBy('scheduledAt', 'asc'))
    } else {
      const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      q = query(collection(db, COLLECTIONS.INTERVIEWS), where('scheduledAt', '>=', Timestamp.fromDate(thirtyDaysAgo)), orderBy('scheduledAt', 'asc'))
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const interviews: BranchEvent[] = []
      snapshot.forEach((doc) => { interviews.push(interviewToEvent({ id: doc.id, ...doc.data() } as Interview)) })
      setEvents(interviews); setLoading(false); setError(null)
    }, (err) => { console.error('Error:', err); setError('Failed to load'); setLoading(false) })
    return () => unsubscribe()
  }, [user])

  return { events, loading, error }
}

export function useBranchStats() {
  const { events } = useBranchEvents()
  const [stats, setStats] = useState<BranchStats>({ pendingFeedback: 0, todayEvents: 0, upcomingEvents: 0, completedThisWeek: 0 })

  useEffect(() => {
    const now = new Date()
    const todayStart = getStartOfDay(now), todayEnd = getEndOfDay(now), weekStart = getStartOfWeek(now), weekFromNow = addDays(now, 7)
    const todayEvents = events.filter(e => { const d = new Date(e.scheduledAt); return d >= todayStart && d <= todayEnd && e.status === 'scheduled' })
    const upcomingEvents = events.filter(e => { const d = new Date(e.scheduledAt); return d > now && d <= weekFromNow && e.status === 'scheduled' })
    const completedThisWeek = events.filter(e => { const d = new Date(e.scheduledAt); return d >= weekStart && d <= now && e.status === 'completed' })
    const pendingFeedback = events.filter(e => e.type === 'trial' && e.status === 'completed')
    setStats({ pendingFeedback: pendingFeedback.length, todayEvents: todayEvents.length, upcomingEvents: upcomingEvents.length, completedThisWeek: completedThisWeek.length })
  }, [events])

  return stats
}

export function useTodaySchedule() {
  const { events, loading, error } = useBranchEvents()
  const [todayEvents, setTodayEvents] = useState<BranchEvent[]>([])
  useEffect(() => {
    const now = new Date(), todayStart = getStartOfDay(now), todayEnd = getEndOfDay(now)
    setTodayEvents(events.filter(e => { const d = new Date(e.scheduledAt); return d >= todayStart && d <= todayEnd }).sort((a,b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()))
  }, [events])
  return { events: todayEvents, loading, error }
}

export function useUpcomingEvents(days: number = 7) {
  const { events, loading, error } = useBranchEvents()
  const [upcomingEvents, setUpcomingEvents] = useState<BranchEvent[]>([])
  useEffect(() => {
    const now = new Date(), futureDate = addDays(now, days)
    setUpcomingEvents(events.filter(e => { const d = new Date(e.scheduledAt); return d >= now && d <= futureDate && e.status === 'scheduled' }).sort((a,b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()))
  }, [events, days])
  return { events: upcomingEvents, loading, error }
}

export function useWeekEvents(weekStart: Date) {
  const { events, loading, error } = useBranchEvents()
  const [weekEvents, setWeekEvents] = useState<DayEvents[]>([])
  useEffect(() => {
    const days: DayEvents[] = []
    for (let i = 0; i < 7; i++) {
      const dayDate = addDays(weekStart, i), dayStart = getStartOfDay(dayDate), dayEnd = getEndOfDay(dayDate)
      const dayEvents = events.filter(e => { const d = new Date(e.scheduledAt); return d >= dayStart && d <= dayEnd }).sort((a,b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
      days.push({ date: dayDate, events: dayEvents })
    }
    setWeekEvents(days)
  }, [events, weekStart])
  return { weekEvents, loading, error }
}

export function useMonthEvents(year: number, month: number) {
  const { events, loading, error } = useBranchEvents()
  const [monthEvents, setMonthEvents] = useState<Map<string, BranchEvent[]>>(new Map())
  useEffect(() => {
    const eventMap = new Map<string, BranchEvent[]>()
    events.forEach(event => {
      const d = new Date(event.scheduledAt)
      if (d.getFullYear() === year && d.getMonth() === month) {
        const key = d.toISOString().split('T')[0]
        eventMap.set(key, [...(eventMap.get(key) || []), event])
      }
    })
    setMonthEvents(eventMap)
  }, [events, year, month])
  return { monthEvents, loading, error }
}

export function formatEventTime(d: Date): string { return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) }
export function formatEventDate(d: Date): string { return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) }
export function isToday(d: Date): boolean { const t = new Date(); return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear() }
export function isPast(d: Date): boolean { return d < new Date() }
export function getEventTypeLabel(type: 'interview' | 'trial'): string { return type === 'trial' ? 'Trial Shift' : 'Interview' }
export function getStatusColor(status: InterviewStatus): string { switch(status) { case 'scheduled': return 'var(--color-primary)'; case 'completed': return 'var(--color-success)'; case 'cancelled': return 'var(--color-text-muted)'; case 'no_show': return 'var(--color-error)'; default: return 'var(--color-text-secondary)' } }
