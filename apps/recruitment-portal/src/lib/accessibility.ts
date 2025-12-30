// ============================================================================
// Allied Recruitment Portal - Accessibility Utilities (R11.6)
// Location: apps/recruitment-portal/src/lib/accessibility.ts
// ============================================================================

import { useEffect, useRef, useCallback } from 'react'

// ============================================================================
// FOCUS TRAP HOOK
// ============================================================================

/**
 * Traps focus within a container element (for modals, dialogs, etc.)
 */
export function useFocusTrap(isActive: boolean = true) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isActive || !containerRef.current) return

    const container = containerRef.current
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    // Focus first element when trap activates
    firstElement?.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        // Shift + Tab: if on first element, go to last
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        // Tab: if on last element, go to first
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    return () => container.removeEventListener('keydown', handleKeyDown)
  }, [isActive])

  return containerRef
}

// ============================================================================
// RESTORE FOCUS HOOK
// ============================================================================

/**
 * Restores focus to the previously focused element when component unmounts
 */
export function useRestoreFocus() {
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    // Store currently focused element
    previousFocusRef.current = document.activeElement as HTMLElement

    return () => {
      // Restore focus on unmount
      previousFocusRef.current?.focus()
    }
  }, [])
}

// ============================================================================
// SKIP TO CONTENT LINK
// ============================================================================

export function SkipToContent() {
  return (
    <a href="#main-content" className="skip-to-content">
      Skip to main content
    </a>
  )
}

// ============================================================================
// SCREEN READER ONLY TEXT
// ============================================================================

interface SrOnlyProps {
  children: React.ReactNode
}

export function SrOnly({ children }: SrOnlyProps) {
  return <span className="sr-only">{children}</span>
}

// ============================================================================
// LIVE REGION FOR ANNOUNCEMENTS
// ============================================================================

interface LiveRegionProps {
  message: string
  assertive?: boolean
}

export function LiveRegion({ message, assertive = false }: LiveRegionProps) {
  return (
    <div
      role="status"
      aria-live={assertive ? 'assertive' : 'polite'}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  )
}

// ============================================================================
// ANNOUNCE HOOK
// ============================================================================

/**
 * Hook to announce messages to screen readers
 */
export function useAnnounce() {
  const announce = useCallback((message: string, assertive: boolean = false) => {
    const region = document.createElement('div')
    region.setAttribute('role', 'status')
    region.setAttribute('aria-live', assertive ? 'assertive' : 'polite')
    region.setAttribute('aria-atomic', 'true')
    region.className = 'sr-only'
    region.textContent = message
    
    document.body.appendChild(region)
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(region)
    }, 1000)
  }, [])

  return announce
}

// ============================================================================
// FOCUS VISIBLE HOOK
// ============================================================================

/**
 * Detects whether focus outlines should be shown
 * (keyboard navigation vs mouse clicks)
 */
export function useFocusVisible() {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Tab') {
        document.body.classList.add('focus-visible')
      }
    }

    function handleMouseDown() {
      document.body.classList.remove('focus-visible')
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleMouseDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [])
}

// ============================================================================
// REDUCED MOTION HOOK
// ============================================================================

/**
 * Respects user's preference for reduced motion
 */
export function useReducedMotion(): boolean {
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  return mediaQuery.matches
}

// ============================================================================
// ARIA HELPERS
// ============================================================================

/**
 * Generate unique IDs for ARIA relationships
 */
let idCounter = 0
export function generateAriaId(prefix: string = 'aria'): string {
  return `${prefix}-${++idCounter}`
}

/**
 * Create aria-describedby value from multiple IDs
 */
export function combineAriaDescribedBy(...ids: (string | undefined)[]): string | undefined {
  const validIds = ids.filter(Boolean)
  return validIds.length > 0 ? validIds.join(' ') : undefined
}

// ============================================================================
// FORM ACCESSIBILITY HELPERS
// ============================================================================

interface FormFieldA11yProps {
  id: string
  label: string
  error?: string
  hint?: string
  required?: boolean
}

export function getFormFieldA11y({ id, label, error, hint, required }: FormFieldA11yProps) {
  const errorId = error ? `${id}-error` : undefined
  const hintId = hint ? `${id}-hint` : undefined
  
  return {
    input: {
      id,
      'aria-required': required || undefined,
      'aria-invalid': error ? true : undefined,
      'aria-describedby': combineAriaDescribedBy(errorId, hintId),
    },
    label: {
      htmlFor: id,
    },
    error: errorId ? {
      id: errorId,
      role: 'alert',
    } : undefined,
    hint: hintId ? {
      id: hintId,
    } : undefined,
  }
}

// ============================================================================
// TABLE ACCESSIBILITY HELPERS
// ============================================================================

interface TableA11yProps {
  caption?: string
  sortColumn?: string
  sortDirection?: 'asc' | 'desc'
}

export function getTableA11y({ caption, sortColumn, sortDirection }: TableA11yProps) {
  return {
    table: {
      role: 'table',
      'aria-label': caption,
    },
    getSortableHeader: (column: string) => ({
      'aria-sort': column === sortColumn 
        ? (sortDirection === 'asc' ? 'ascending' : 'descending')
        : 'none',
      role: 'columnheader',
    }),
  }
}

// ============================================================================
// DIALOG ACCESSIBILITY HELPERS
// ============================================================================

interface DialogA11yProps {
  title: string
  describedBy?: string
}

export function getDialogA11y({ title, describedBy }: DialogA11yProps) {
  const titleId = generateAriaId('dialog-title')
  
  return {
    dialog: {
      role: 'dialog',
      'aria-modal': true,
      'aria-labelledby': titleId,
      'aria-describedby': describedBy,
    },
    title: {
      id: titleId,
    },
  }
}
