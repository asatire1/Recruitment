// Hooks Index - Allied Recruitment Portal

// Candidates
export { default as useCandidates, useCandidateStats, useCandidate } from './useCandidates';

// Jobs
export { default as useJobs, useJob, useJobStats, useJobCandidates } from './useJobs';

// Dashboard
export { default as useDashboard } from './useDashboard';

// WhatsApp Templates
export { default as useWhatsAppTemplates, useSendMessage, PLACEHOLDER_CATEGORIES, getAvailablePlaceholders, replacePlaceholders } from './useWhatsAppTemplates';

// Calendar
export { default as useCalendar, useEvent, EVENT_TYPES, EVENT_STATUS } from './useCalendar';

// Booking
export { default as useBooking, useBookingLinks, useAvailableSlots, useBookingSubmit } from './useBooking';

// CV Parser
export { default as useCVParser, useCVUpload, useCVDataEditor, SUPPORTED_FILE_TYPES, MAX_FILE_SIZE, PARSE_STATUS, SKILL_CATEGORIES, PHARMACY_SKILLS, extractSkills, calculateSkillMatch, formatExperienceDuration, calculateTotalExperience } from './useCVParser';

// Algolia Search
export { default as useAlgoliaSearch, useSkillSuggestions, useSavedSearches, useRecentSearches, FILTER_OPTIONS, SORT_OPTIONS, highlightMatches, formatFacetCount } from './useAlgoliaSearch';

// PWA
export { default as usePWAInstall, usePushNotifications, useServiceWorker, useOfflineStorage, INSTALL_STATE, NOTIFICATION_STATE } from './usePWA';

// Manager Portal
export { default as usePendingReviews, useReviewActions, useManagerSchedule, useManagerDashboard, useEventActions, useCandidateLookup, REVIEW_DECISION, REVIEW_STATUS } from './useManagerPortal';
