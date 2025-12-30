import { useState, useEffect, useCallback } from 'react'
import { 
  validateBookingToken, 
  extractTokenFromUrl,
  BookingLinkData,
  ValidationError 
} from '../services/bookingService'

export type BookingTokenState = 
  | { status: 'loading' }
  | { status: 'no-token' }
  | { status: 'valid'; data: BookingLinkData; token: string }
  | { status: 'invalid'; error: ValidationError }

/**
 * Hook to validate booking token from URL
 */
export function useBookingToken(): BookingTokenState & { retry: () => void } {
  const [state, setState] = useState<BookingTokenState>({ status: 'loading' })
  const [token, setToken] = useState<string | null>(null)

  const validate = useCallback(async (tokenToValidate: string) => {
    setState({ status: 'loading' })
    
    const result = await validateBookingToken(tokenToValidate)
    
    if (result.success) {
      setState({ 
        status: 'valid', 
        data: result.data,
        token: tokenToValidate
      })
    } else {
      setState({ 
        status: 'invalid', 
        error: result.error 
      })
    }
  }, [])

  useEffect(() => {
    const extractedToken = extractTokenFromUrl()
    setToken(extractedToken)
    
    if (!extractedToken) {
      setState({ status: 'no-token' })
      return
    }
    
    validate(extractedToken)
  }, [validate])

  const retry = useCallback(() => {
    if (token) {
      validate(token)
    }
  }, [token, validate])

  return { ...state, retry }
}
