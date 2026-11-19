import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { getFirestore, initializeFirestore, type Firestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth = null as unknown as Auth;
let firebaseInitError: string | null = null;
const googleAuthProvider = new GoogleAuthProvider();

const cfg = (firebaseConfig || {}) as Record<string, any>;

export const firebaseProjectId: string = String(cfg.projectId || '');

export const isFirebaseConfigured = Boolean(
  cfg &&
    cfg.apiKey &&
    typeof cfg.apiKey === 'string' &&
    cfg.apiKey.length > 10 &&
    !cfg.apiKey.includes('သင့်_') &&
    !cfg.apiKey.includes('YOUR_') &&
    cfg.projectId
);

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(cfg) : getApps()[0];
    const customDbId =
      typeof cfg.firestoreDatabaseId === 'string' &&
      cfg.firestoreDatabaseId.trim() !== '' &&
      cfg.firestoreDatabaseId !== '(default)'
        ? cfg.firestoreDatabaseId.trim()
        : undefined;

    // Force Long Polling so Firestore never hangs on restricted ISPs, mobile networks, or VPNs
    try {
      db = customDbId
        ? initializeFirestore(app, { experimentalForceLongPolling: true }, customDbId)
        : initializeFirestore(app, { experimentalForceLongPolling: true });
    } catch {
      db = customDbId ? getFirestore(app, customDbId) : getFirestore(app);
    }

    auth = getAuth(app);
  } catch (error: any) {
    firebaseInitError = error?.message || 'Firebase initialization failed';
    console.error('Firebase init error:', error);
  }
} else {
  firebaseInitError = 'firebase-applet-config.json တွင် သင့် Firebase Config တန်ဖိုးများ မပြည့်စုံသေးပါ။';
}

/**
 * Recursively strips undefined values because Firestore rejects documents with undefined fields.
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

/**
 * Prevents Firestore requests from hanging indefinitely on slow or blocked connections.
 */
export function withTimeout<T>(promise: Promise<T>, ms = 5000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error('CLOUD_TIMEOUT'));
    }, ms);
    promise
      .then((val) => {
        window.clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        window.clearTimeout(timer);
        reject(err);
      });
  });
}

export { app, db, auth, googleAuthProvider, firebaseInitError };
