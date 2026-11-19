import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth = null as unknown as Auth;
let firebaseInitError: string | null = null;
const googleAuthProvider = new GoogleAuthProvider();

const cfg = (firebaseConfig || {}) as Record<string, any>;

export const firebaseProjectId: string = String(cfg.projectId || 'arena-25951');

export const isFirebaseConfigured = Boolean(
  cfg &&
    cfg.apiKey &&
    typeof cfg.apiKey === 'string' &&
    cfg.apiKey.length > 10 &&
    !cfg.apiKey.includes('AIzaSyDVpL90m8SwxNbzg2OWwx2t-Mc4HkWNd3M') &&
    !cfg.apiKey.includes('AIzaSyDVpL90m8SwxNbzg2OWwx2t-Mc4HkWNd3M') &&
    cfg.projectId
);

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(cfg) : getApps()[0];
    db = getFirestore(app);
    auth = getAuth(app);
  } catch (error: any) {
    firebaseInitError = error?.message || 'Firebase initialization failed';
    console.error('Firebase init error:', error);
  }
} else {
  firebaseInitError = 'firebase-applet-config.json တွင် သင့် Firebase Config တန်ဖိုးများ မပြည့်စုံသေးပါ။';
}

/**
 * Recursively removes undefined values because Firestore rejects any document containing undefined.
 */
export function stripUndefined<T>(input: T): T {
  if (input === null || input === undefined) return input;
  if (Array.isArray(input)) {
    return input.map((item) => stripUndefined(item)).filter((item) => item !== undefined) as unknown as T;
  }
  if (typeof input === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [k, v] of Object.entries(input as Record<string, any>)) {
      if (v !== undefined) {
        cleaned[k] = stripUndefined(v);
      }
    }
    return cleaned as T;
  }
  return input;
}

export { app, db, auth, googleAuthProvider, firebaseInitError };
