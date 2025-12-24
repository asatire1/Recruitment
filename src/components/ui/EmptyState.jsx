import { Button } from './Button';
import './EmptyState.css';

/**
 * SVG Illustrations for different empty states
 * Simple, clean line illustrations in the app's color scheme
 */

const illustrations = {
  // No candidates - person with magnifying glass
  candidates: (
    <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background circle */}
      <circle cx="100" cy="80" r="60" fill="var(--color-primary-50)" />
      
      {/* Person silhouette */}
      <circle cx="85" cy="55" r="18" stroke="var(--color-primary-300)" strokeWidth="3" fill="var(--color-primary-100)" />
      <path d="M55 110 C55 85 70 75 85 75 C100 75 115 85 115 110" stroke="var(--color-primary-300)" strokeWidth="3" fill="var(--color-primary-100)" strokeLinecap="round" />
      
      {/* Magnifying glass */}
      <circle cx="130" cy="70" r="20" stroke="var(--color-primary-400)" strokeWidth="3" fill="none" />
      <line x1="144" y1="84" x2="158" y2="98" stroke="var(--color-primary-400)" strokeWidth="4" strokeLinecap="round" />
      
      {/* Question mark in magnifying glass */}
      <path d="M125 65 C125 60 130 58 133 60 C136 62 136 66 133 68 L130 71" stroke="var(--color-primary-500)" strokeWidth="2" strokeLinecap="round" fill="none" />
      <circle cx="130" cy="76" r="1.5" fill="var(--color-primary-500)" />
      
      {/* Decorative dots */}
      <circle cx="45" cy="50" r="3" fill="var(--color-primary-200)" />
      <circle cx="155" cy="45" r="2" fill="var(--color-primary-200)" />
      <circle cx="50" cy="100" r="2" fill="var(--color-primary-200)" />
    </svg>
  ),

  // No jobs - briefcase with sparkle
  jobs: (
    <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background circle */}
      <circle cx="100" cy="80" r="60" fill="var(--color-primary-50)" />
      
      {/* Briefcase */}
      <rect x="55" y="60" width="90" height="60" rx="8" stroke="var(--color-primary-300)" strokeWidth="3" fill="var(--color-primary-100)" />
      <path d="M75 60 V50 C75 45 80 40 85 40 H115 C120 40 125 45 125 50 V60" stroke="var(--color-primary-300)" strokeWidth="3" fill="none" />
      <line x1="55" y1="85" x2="145" y2="85" stroke="var(--color-primary-300)" strokeWidth="3" />
      <rect x="90" y="78" width="20" height="14" rx="3" fill="var(--color-primary-400)" />
      
      {/* Sparkle/star */}
      <path d="M155 40 L158 48 L166 48 L160 53 L162 61 L155 56 L148 61 L150 53 L144 48 L152 48 Z" fill="var(--color-warning-400)" />
      
      {/* Plus sign indicating "add" */}
      <circle cx="155" cy="100" r="12" fill="var(--color-primary-500)" />
      <line x1="155" y1="94" x2="155" y2="106" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="149" y1="100" x2="161" y2="100" stroke="white" strokeWidth="2" strokeLinecap="round" />
      
      {/* Decorative dots */}
      <circle cx="45" cy="55" r="3" fill="var(--color-primary-200)" />
      <circle cx="40" cy="105" r="2" fill="var(--color-primary-200)" />
    </svg>
  ),

  // No interviews/calendar - calendar with clock
  calendar: (
    <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background circle */}
      <circle cx="100" cy="80" r="60" fill="var(--color-primary-50)" />
      
      {/* Calendar */}
      <rect x="50" y="50" width="80" height="75" rx="8" stroke="var(--color-primary-300)" strokeWidth="3" fill="var(--color-primary-100)" />
      <rect x="50" y="50" width="80" height="22" rx="8" fill="var(--color-primary-300)" />
      <line x1="70" y1="40" x2="70" y2="55" stroke="var(--color-primary-400)" strokeWidth="3" strokeLinecap="round" />
      <line x1="110" y1="40" x2="110" y2="55" stroke="var(--color-primary-400)" strokeWidth="3" strokeLinecap="round" />
      
      {/* Calendar grid dots */}
      <circle cx="70" cy="90" r="4" fill="var(--color-primary-200)" />
      <circle cx="90" cy="90" r="4" fill="var(--color-primary-200)" />
      <circle cx="110" cy="90" r="4" fill="var(--color-primary-200)" />
      <circle cx="70" cy="108" r="4" fill="var(--color-primary-200)" />
      <circle cx="90" cy="108" r="4" fill="var(--color-primary-200)" />
      <circle cx="110" cy="108" r="4" fill="var(--color-primary-200)" />
      
      {/* Clock overlay */}
      <circle cx="140" cy="95" r="22" stroke="var(--color-primary-400)" strokeWidth="3" fill="white" />
      <line x1="140" y1="95" x2="140" y2="82" stroke="var(--color-primary-500)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="140" y1="95" x2="150" y2="100" stroke="var(--color-primary-500)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="140" cy="95" r="3" fill="var(--color-primary-500)" />
      
      {/* Decorative dots */}
      <circle cx="45" cy="100" r="2" fill="var(--color-primary-200)" />
      <circle cx="165" cy="55" r="3" fill="var(--color-primary-200)" />
    </svg>
  ),

  // No search results - magnifying glass with X
  search: (
    <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background circle */}
      <circle cx="100" cy="80" r="60" fill="var(--color-primary-50)" />
      
      {/* Magnifying glass */}
      <circle cx="90" cy="70" r="35" stroke="var(--color-primary-300)" strokeWidth="4" fill="var(--color-primary-100)" />
      <line x1="115" y1="95" x2="145" y2="125" stroke="var(--color-primary-400)" strokeWidth="6" strokeLinecap="round" />
      
      {/* X mark inside */}
      <line x1="75" y1="55" x2="105" y2="85" stroke="var(--color-gray-400)" strokeWidth="4" strokeLinecap="round" />
      <line x1="105" y1="55" x2="75" y2="85" stroke="var(--color-gray-400)" strokeWidth="4" strokeLinecap="round" />
      
      {/* Decorative dots */}
      <circle cx="50" cy="45" r="3" fill="var(--color-primary-200)" />
      <circle cx="160" cy="70" r="2" fill="var(--color-primary-200)" />
      <circle cx="55" cy="115" r="2" fill="var(--color-primary-200)" />
    </svg>
  ),

  // No messages/templates - chat bubble
  messages: (
    <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background circle */}
      <circle cx="100" cy="80" r="60" fill="var(--color-primary-50)" />
      
      {/* Chat bubble */}
      <path 
        d="M50 45 H140 C148 45 155 52 155 60 V95 C155 103 148 110 140 110 H85 L65 130 V110 H60 C52 110 45 103 45 95 V60 C45 52 52 45 60 45 Z" 
        stroke="var(--color-primary-300)" 
        strokeWidth="3" 
        fill="var(--color-primary-100)" 
      />
      
      {/* Message lines */}
      <line x1="65" y1="68" x2="135" y2="68" stroke="var(--color-primary-300)" strokeWidth="3" strokeLinecap="round" />
      <line x1="65" y1="82" x2="115" y2="82" stroke="var(--color-primary-300)" strokeWidth="3" strokeLinecap="round" />
      <line x1="65" y1="96" x2="95" y2="96" stroke="var(--color-primary-300)" strokeWidth="3" strokeLinecap="round" />
      
      {/* Decorative sparkle */}
      <circle cx="160" cy="50" r="8" fill="var(--color-warning-200)" />
      <circle cx="160" cy="50" r="4" fill="var(--color-warning-400)" />
      
      {/* Decorative dots */}
      <circle cx="40" cy="70" r="2" fill="var(--color-primary-200)" />
      <circle cx="165" cy="100" r="3" fill="var(--color-primary-200)" />
    </svg>
  ),

  // No data/generic - document with lines
  generic: (
    <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background circle */}
      <circle cx="100" cy="80" r="60" fill="var(--color-primary-50)" />
      
      {/* Document */}
      <path 
        d="M60 35 H120 L140 55 V130 C140 135 136 140 130 140 H70 C65 140 60 135 60 130 V35 Z" 
        stroke="var(--color-primary-300)" 
        strokeWidth="3" 
        fill="var(--color-primary-100)" 
      />
      <path d="M120 35 V55 H140" stroke="var(--color-primary-300)" strokeWidth="3" fill="none" />
      
      {/* Document lines */}
      <line x1="75" y1="75" x2="125" y2="75" stroke="var(--color-primary-300)" strokeWidth="3" strokeLinecap="round" />
      <line x1="75" y1="92" x2="125" y2="92" stroke="var(--color-primary-300)" strokeWidth="3" strokeLinecap="round" />
      <line x1="75" y1="109" x2="105" y2="109" stroke="var(--color-primary-300)" strokeWidth="3" strokeLinecap="round" />
      
      {/* Decorative dots */}
      <circle cx="50" cy="60" r="3" fill="var(--color-primary-200)" />
      <circle cx="155" cy="85" r="2" fill="var(--color-primary-200)" />
      <circle cx="45" cy="120" r="2" fill="var(--color-primary-200)" />
    </svg>
  ),

  // No activity - timeline/pulse
  activity: (
    <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background circle */}
      <circle cx="100" cy="80" r="60" fill="var(--color-primary-50)" />
      
      {/* Activity pulse line */}
      <path 
        d="M30 80 H70 L80 50 L95 110 L110 65 L120 95 L130 80 H170" 
        stroke="var(--color-primary-400)" 
        strokeWidth="3" 
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Circle markers */}
      <circle cx="80" cy="50" r="5" fill="var(--color-primary-500)" />
      <circle cx="95" cy="110" r="5" fill="var(--color-primary-500)" />
      <circle cx="110" cy="65" r="5" fill="var(--color-primary-500)" />
      
      {/* Dotted baseline */}
      <line x1="30" y1="130" x2="170" y2="130" stroke="var(--color-primary-200)" strokeWidth="2" strokeDasharray="5,5" />
      
      {/* Decorative dots */}
      <circle cx="45" cy="50" r="3" fill="var(--color-primary-200)" />
      <circle cx="160" cy="55" r="2" fill="var(--color-primary-200)" />
    </svg>
  )
};

/**
 * EmptyState - Reusable empty state component with illustrations
 * 
 * @param {string} variant - Type of illustration (candidates, jobs, calendar, search, messages, generic, activity)
 * @param {string} title - Main heading
 * @param {string} description - Supporting text
 * @param {ReactNode} action - Optional action button/element
 * @param {string} className - Additional CSS classes
 */
export default function EmptyState({ 
  variant = 'generic',
  title = 'Nothing here yet',
  description = '',
  action = null,
  className = ''
}) {
  const illustration = illustrations[variant] || illustrations.generic;

  return (
    <div className={`empty-state ${className}`}>
      <div className="empty-state-illustration">
        {illustration}
      </div>
      <h3 className="empty-state-title">{title}</h3>
      {description && (
        <p className="empty-state-description">{description}</p>
      )}
      {action && (
        <div className="empty-state-actions">
          {action}
        </div>
      )}
    </div>
  );
}

// Also export individual illustrations for custom usage
export { illustrations as emptyStateIllustrations };
