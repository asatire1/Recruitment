/**
 * Firebase Configuration for Booking Page
 */

import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getFunctions } from 'firebase/functions'

const firebaseConfig = {
  apiKey: "AIzaSyAewXWSniSC_XYLrDBATgrJxx-n6jXxp_Q",
  authDomain: "recruitment-633bd.firebaseapp.com",
  projectId: "recruitment-633bd",
  storageBucket: "recruitment-633bd.firebasestorage.app",
  messagingSenderId: "1062908743824",
  appId: "1:1062908743824:web:e5e47e5cc1462091fdc815"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)

// Functions in different regions
export const functions = getFunctions(app, 'us-central1')  // Most functions are here
export const functionsEU = getFunctions(app, 'europe-west2')  // Some functions here

export default app
