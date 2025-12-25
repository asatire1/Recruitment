import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch user data from Firestore
  const fetchUserData = useCallback(async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const data = { id: userDoc.id, ...userDoc.data() };
        setUserData(data);
        return data;
      }
      return null;
    } catch (err) {
      console.error('Error fetching user data:', err);
      return null;
    }
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const data = await fetchUserData(firebaseUser.uid);
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: data?.displayName || firebaseUser.displayName,
          ...data
        });
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [fetchUserData]);

  // Sign in
  const signIn = async (email, password) => {
    setError(null);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      // Update last login
      await setDoc(doc(db, 'users', result.user.uid), {
        lastLoginAt: serverTimestamp()
      }, { merge: true });
      
      return result.user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setUserData(null);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Reset password
  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Check if user has role
  const hasRole = useCallback((role) => {
    if (!user?.role) return false;
    if (user.role === 'super_admin') return true;
    return user.role === role;
  }, [user]);

  // Check if user has access to entity
  const hasEntityAccess = useCallback((entityId) => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    return user.entityId === entityId || user.entityIds?.includes(entityId);
  }, [user]);

  // Check if user has access to branch
  const hasBranchAccess = useCallback((branchId) => {
    if (!user) return false;
    if (user.role === 'super_admin' || user.role === 'recruiter') return true;
    return user.branchId === branchId || user.branchIds?.includes(branchId);
  }, [user]);

  const value = {
    user,
    userData,
    loading,
    error,
    signIn,
    signOut,
    resetPassword,
    hasRole,
    hasEntityAccess,
    hasBranchAccess,
    refreshUserData: () => user?.uid && fetchUserData(user.uid)
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
