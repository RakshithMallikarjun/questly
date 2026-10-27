// Firebase web settings for Google sign-in and sync. These values are not
// secret: Firebase protects the data with security rules (see firestore.rules).
// Leave apiKey empty to run Questly in on-device-only mode.

export const firebaseConfig = {
  apiKey: 'AIzaSyBe8Jnq7nkbFQhxMvPEX3hrtuULpJ3FbvM',
  authDomain: 'questly-2a6c9.firebaseapp.com',
  projectId: 'questly-2a6c9',
  storageBucket: 'questly-2a6c9.firebasestorage.app',
  messagingSenderId: '94384717938',
  appId: '1:94384717938:web:c513b320788f35779f42eb',
};

// Web Push key for phone notifications, from Firebase console: Project
// settings > Cloud Messaging > Web Push certificates. Leave empty to show
// reminders only while the app is open.
export const vapidPublicKey = '';
