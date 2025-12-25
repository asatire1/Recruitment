// Re-export from lib/firebase.js to maintain single Firebase instance
// The lib/firebase.js has offline persistence configured
export { auth, db, storage, functions, default as app } from '../lib/firebase';
