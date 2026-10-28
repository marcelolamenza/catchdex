import { initializeApp, getApps } from "firebase/app";
import { browserLocalPersistence, getAuth, GoogleAuthProvider, onAuthStateChanged, setPersistence, signInWithPopup, signOut, type User } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
const env = import.meta.env;
const requiredConfig = ["VITE_FIREBASE_API_KEY", "VITE_FIREBASE_AUTH_DOMAIN", "VITE_FIREBASE_PROJECT_ID", "VITE_FIREBASE_APP_ID"] as const;
export const firebaseMissingConfig = requiredConfig.filter(key => !env[key]);
export const firebaseReady = firebaseMissingConfig.length === 0;
const app = firebaseReady ? (getApps().find(existing => existing.name === "[DEFAULT]") ?? initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY, authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID, storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID, appId: env.VITE_FIREBASE_APP_ID,
})) : null;
const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
const googleProvider = new GoogleAuthProvider();

export function observeAuth(onUser: (user: User | null) => void, onError: (error: Error) => void) {
  if (!auth) return () => undefined;
  return onAuthStateChanged(auth, onUser, onError);
}

export async function signInWithGoogle() {
  if (!auth) throw new Error("Firebase is not configured.");
  await setPersistence(auth, browserLocalPersistence);
  return signInWithPopup(auth, googleProvider);
}

export async function signOutCurrentUser() {
  if (!auth) throw new Error("Firebase is not configured.");
  return signOut(auth);
}
