/**
 * Welcome Landing Page
 * Shows after successful token validation
 */

import type { BookingLinkData } from '../services/bookingService'

interface WelcomePageProps {
  data: BookingLinkData
  onContinue: () => void
}

export function WelcomePage({ data, onContinue }: WelcomePageProps) {
  const firstName = data.candidateName.split(' ')[0]
  const isInterview = data.type === 'interview'
  
  // Format duration
  const formatDuration = (minutes: number): string => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      if (mins === 0) {
        return `${hours} hour${hours > 1 ? 's' : ''}`
      }
      return `${hours}h ${mins}m`
    }
    return `${minutes} minutes`
  }
  
  return (
    <div className="welcome-container">
      <div className="welcome-icon">
        {isInterview ? <CalendarIcon /> : <BriefcaseIcon />}
      </div>
      
      <h1 className="welcome-title">
        Welcome, {firstName}!
      </h1>
      
      <p className="welcome-subtitle">
        {isInterview 
          ? "You're invited to schedule an interview"
          : "You're invited to schedule a trial shift"
        }
        {data.jobTitle && (
          <span className="welcome-job">
            {' '}for <strong>{data.jobTitle}</strong>
          </span>
        )}
      </p>
      
      <div className="welcome-info">
        <div className="info-card">
          <div className="info-icon">
            <ClockIcon />
          </div>
          <div className="info-content">
            <span className="info-label">Duration</span>
            <span className="info-value">
              {formatDuration(data.duration)}
            </span>
          </div>
        </div>
        
        {data.branchName && (
          <div className="info-card">
            <div className="info-icon">
              <MapPinIcon />
            </div>
            <div className="info-content">
              <span className="info-label">Location</span>
              <span className="info-value">{data.branchName}</span>
              {data.branchAddress && (
                <span className="info-address">{data.branchAddress}</span>
              )}
            </div>
          </div>
        )}
      </div>
      
      <button className="btn btn-primary btn-large" onClick={onContinue}>
        Choose a Time
        <ArrowRightIcon />
      </button>
      
      <p className="welcome-note">
        Select a time that works best for you. You'll receive a confirmation email once your booking is complete.
      </p>
    </div>
  )
}

// Icons
function CalendarIcon() {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      strokeWidth={1.5} 
      stroke="currentColor"
      width="64"
      height="64"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" 
      />
    </svg>
  )
}

function BriefcaseIcon() {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      strokeWidth={1.5} 
      stroke="currentColor"
      width="64"
      height="64"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" 
      />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      strokeWidth={1.5} 
      stroke="currentColor"
      width="24"
      height="24"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" 
      />
    </svg>
  )
}

function MapPinIcon() {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      strokeWidth={1.5} 
      stroke="currentColor"
      width="24"
      height="24"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" 
      />
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" 
      />
    </svg>
  )
}

function ArrowRightIcon() {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      strokeWidth={2} 
      stroke="currentColor"
      width="20"
      height="20"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" 
      />
    </svg>
  )
}
