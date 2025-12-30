import { 
  createContext, 
  useContext, 
  useEffect, 
  useState, 
  useCallback,
  ReactNode 
} from 'react'
import {
  User as FirebaseUser,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from 'firebase/auth'
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { 
  getFirebaseAuth, 
  getFirebaseDb, 
  COLLECTIONS 
} from '@allied/shared-lib'
import type { User, UserRole } from '@allied/shared-lib'

// ============================================================================
// TYPES
// ============================================================================

interface AuthState {
  firebaseUser: FirebaseUser | null
  user: User | null
  isLoading: boolean
  error: string | null
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string, remember?: boolean) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  hasRole: (role: UserRole | UserRole[]) => boolean
  canAccessBranch: (branchId: string) => boolean
  clearError: () => void
}

// Roles allowed to access the Branch Portal
const ALLOWED_ROLES: UserRole[] = ['branch_manager', 'regional_manager', 'super_admin', 'recruiter']

// ============================================================================
// CONTEXT
// ============================================================================

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// ============================================================================
// PROVIDER
// ============================================================================

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    firebaseUser: null,
    user: null,
    isLoading: true,
    error: null,
  })

  const auth = getFirebaseAuth()
  const db = getFirebaseDb()

  // --------------------------------------------------------------------------
  // Fetch user profile from Firestore with role check
  // --------------------------------------------------------------------------
  const fetchUserProfile = useCallback(async (firebaseUser: FirebaseUser): Promise<User | null> => {
    try {
      const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, firebaseUser.uid))
      
      if (!userDoc.exists()) {
        console.error('User profile not found in Firestore')
        return null
      }

      const userData = userDoc.data()
      
      // Check if user is active
      if (!userData.active) {
        console.error('User account is disabled')
        return null
      }

      // IMPORTANT: Check if user has an allowed role for Branch Portal
      if (!ALLOWED_ROLES.includes(userData.role as UserRole)) {
        console.error('User does not have branch manager access')
        return null
      }

      // Update last login timestamp
      await updateDoc(doc(db, COLLECTIONS.USERS, firebaseUser.uid), {
        lastLoginAt: serverTimestamp(),
      })

      return {
        id: userDoc.id,
        ...userData,
      } as User
    } catch (error) {
      console.error('Error fetching user profile:', error)
      return null
    }
  }, [db])

  // --------------------------------------------------------------------------
  // Listen for auth state changes
  // --------------------------------------------------------------------------
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userProfile = await fetchUserProfile(firebaseUser)
        
        if (userProfile) {
          setState({
            firebaseUser,
            user: userProfile,
            isLoading: false,
            error: null,
          })
        } else {
          // User exists but is not a branch manager or is disabled
          await firebaseSignOut(auth)
          setState({
            firebaseUser: null,
            user: null,
            isLoading: false,
            error: 'You do not have access to the Branch Portal. Please use the main recruitment portal.',
          })
        }
      } else {
        setState({
          firebaseUser: null,
          user: null,
          isLoading: false,
          error: null,
        })
      }
    })

    return () => unsubscribe()
  }, [auth, fetchUserProfile])

  // --------------------------------------------------------------------------
  // Sign in with role validation
  // --------------------------------------------------------------------------
  const signIn = useCallback(async (
    email: string, 
    password: string, 
    remember: boolean = false
  ): Promise<void> => {
    setState(prev => ({ ...prev, error: null }))

    try {
      await setPersistence(
        auth, 
        remember ? browserLocalPersistence : browserSessionPersistence
      )

      const result = await signInWithEmailAndPassword(auth, email, password)
      
      const userProfile = await fetchUserProfile(result.user)
      
      if (!userProfile) {
        await firebaseSignOut(auth)
        throw new Error('You do not have access to the Branch Portal.')
      }

    } catch (error) {
      const errorMessage = getAuthErrorMessage(error)
      setState(prev => ({ ...prev, error: errorMessage }))
      throw error
    }
  }, [auth, fetchUserProfile])

  // --------------------------------------------------------------------------
  // Sign out
  // --------------------------------------------------------------------------
  const signOut = useCallback(async (): Promise<void> => {
    try {
      await firebaseSignOut(auth)
    } catch (error) {
      console.error('Sign out error:', error)
      throw error
    }
  }, [auth])

  // --------------------------------------------------------------------------
  // Reset password
  // --------------------------------------------------------------------------
  const resetPassword = useCallback(async (email: string): Promise<void> => {
    try {
      await sendPasswordResetEmail(auth, email)
    } catch (error) {
      console.error('Password reset error:', error)
    }
  }, [auth])

  // --------------------------------------------------------------------------
  // Role checking
  // --------------------------------------------------------------------------
  const hasRole = useCallback((role: UserRole | UserRole[]): boolean => {
    if (!state.user) return false
    const roles = Array.isArray(role) ? role : [role]
    return roles.includes(state.user.role)
  }, [state.user])

  // --------------------------------------------------------------------------
  // Branch access checking
  // --------------------------------------------------------------------------
  const canAccessBranch = useCallback((branchId: string): boolean => {
    if (!state.user) return false
    
    // Super admins and recruiters can access all branches
    if (hasRole(['super_admin', 'recruiter'])) return true
    
    // Branch managers can only access their assigned branches
    if (state.user.branchIds && state.user.branchIds.length > 0) {
      return state.user.branchIds.includes(branchId)
    }
    
    // Regional managers - allow if they have regionIds set
    if (hasRole('regional_manager') && state.user.regionIds?.length) {
      return true
    }
    
    return false
  }, [state.user, hasRole])

  // --------------------------------------------------------------------------
  // Clear error
  // --------------------------------------------------------------------------
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  const value: AuthContextValue = {
    ...state,
    signIn,
    signOut,
    resetPassword,
    hasRole,
    canAccessBranch,
    clearError,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// ============================================================================
// HOOK
// ============================================================================

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  
  return context
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getAuthErrorMessage(error: unknown): string {
  const firebaseError = error as { code?: string; message?: string }
  
  switch (firebaseError.code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.'
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.'
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please try again.'
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.'
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection and try again.'
    default:
      return firebaseError.message || 'An error occurred. Please try again.'
  }
}

export { AuthContext }
export type { AuthContextValue, AuthState }
