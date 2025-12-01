// Firebase configuration for whisperbox-b58c2
// For production deployment, ensure these values match your Firebase Console project
const FALLBACK_CONFIG = {
    apiKey: "AIzaSyA_YOUR_API_KEY_HERE",
    authDomain: "whisperbox-b58c2.firebaseapp.com",
    projectId: "whisperbox-b58c2",
    storageBucket: "whisperbox-b58c2.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID_HERE",
    appId: "1:YOUR_APP_ID_HERE:web:YOUR_WEB_ID_HERE",
    measurementId: "G_YOUR_MEASUREMENT_ID_HERE"
};

function resolveConfig() {
    try {
        if (typeof window !== 'undefined' && window.__FIREBASE_CONFIG__) {
            return window.__FIREBASE_CONFIG__;
        }
    } catch (e) {
        // ignore
    }
    // Fallback (useful for local dev only) — rotate/revoke keys stored in repo and inject at deploy time.
    return FALLBACK_CONFIG;
}

// Initialize Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js';
import { getAuth, GoogleAuthProvider, FacebookAuthProvider, signInWithPopup, signOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, sendPasswordResetEmail, sendEmailVerification, setPersistence, browserLocalPersistence, browserSessionPersistence } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/12.6.0/firebase-analytics.js';

const firebaseConfig = resolveConfig();
if (!firebaseConfig || !firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith('REPLACE_')) {
    console.warn('Firebase config appears to be a placeholder. Ensure you inject production config at deploy time.');
}

const app = initializeApp(firebaseConfig);
let analytics;
try { analytics = getAnalytics(app); } catch (e) { /* analytics may fail in some environments */ }

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();

// Configure Google provider
googleProvider.setCustomParameters({
    prompt: 'select_account'
});
// Configure Facebook provider (optional)
facebookProvider.setCustomParameters({
    display: 'popup'
});

// Authentication functions
export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const signInWithFacebook = () => signInWithPopup(auth, facebookProvider);
export const logout = () => signOut(auth);
export { onAuthStateChanged };
// Re-export auth helpers for convenience in client code
export { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, sendPasswordResetEmail, sendEmailVerification, setPersistence, browserLocalPersistence, browserSessionPersistence };
