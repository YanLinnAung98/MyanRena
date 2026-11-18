import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

export const isFirebaseConfigured = Boolean(
  firebaseConfig &&
  firebaseConfig.apiKey &&
  !firebaseConfig.apiKey.includes('သင့်_') &&
  firebaseConfig.projectId
);

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    db = getFirestore(app);
  } catch (error) {
    console.warn('Firebase init fallback to local mode:', error);
  }
}

export { app, db };
