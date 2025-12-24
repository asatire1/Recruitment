import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Firestore User Schema
 * Collection: users
 * Document ID: Firebase Auth UID
 * 
 * Fields:
 * - email: string (required)
 * - displayName: string (required)
 * - role: 'admin' | 'recruiter' | 'regional_manager' | 'branch_manager' | 'director'
 * - entityId: string | null (linked entity)
 * - branchIds: string[] (branches user has access to)
 * - regionIds: string[] (regions user has access to)
 * - phone: string | null
 * - avatarUrl: string | null
 * - isActive: boolean
 * - createdAt: timestamp
 * - updatedAt: timestamp
 * - lastLoginAt: timestamp
 */

export const USER_ROLES = {
  ADMIN: 'admin',
  RECRUITER: 'recruiter',
  REGIONAL_MANAGER: 'regional_manager',
  BRANCH_MANAGER: 'branch_manager',
  DIRECTOR: 'director'
};

/**
 * Create a new user profile in Firestore
 */
export async function createUserProfile(uid, userData) {
  const userRef = doc(db, 'users', uid);
  
  const profile = {
    email: userData.email,
    displayName: userData.displayName || userData.email.split('@')[0],
    role: userData.role || USER_ROLES.RECRUITER,
    entityId: userData.entityId || null,
    branchIds: userData.branchIds || [],
    regionIds: userData.regionIds || [],
    phone: userData.phone || null,
    avatarUrl: userData.avatarUrl || null,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastLoginAt: serverTimestamp()
  };

  await setDoc(userRef, profile);
  return profile;
}

/**
 * Get user profile from Firestore
 */
export async function getUserProfile(uid) {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    return { id: userSnap.id, ...userSnap.data() };
  }
  return null;
}

/**
 * Update user profile
 */
export async function updateUserProfile(uid, updates) {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
}

/**
 * Update last login timestamp
 */
export async function updateLastLogin(uid) {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    lastLoginAt: serverTimestamp()
  });
}

/**
 * Check if user has required role
 */
export function hasRole(userProfile, requiredRoles) {
  if (!userProfile?.role) return false;
  if (!Array.isArray(requiredRoles)) requiredRoles = [requiredRoles];
  return requiredRoles.includes(userProfile.role);
}

/**
 * Check if user is admin
 */
export function isAdmin(userProfile) {
  return userProfile?.role === USER_ROLES.ADMIN;
}

/**
 * Check if user can manage candidates (admin or recruiter)
 */
export function canManageCandidates(userProfile) {
  return hasRole(userProfile, [USER_ROLES.ADMIN, USER_ROLES.RECRUITER]);
}

/**
 * Check if user can approve hiring (admin or director)
 */
export function canApproveHiring(userProfile) {
  return hasRole(userProfile, [USER_ROLES.ADMIN, USER_ROLES.DIRECTOR]);
}
