// Firebase web settings for Google sign-in and sync. These values are not
// secret: Firebase protects the data with security rules (see firestore.rules).
// Leave apiKey empty to run Questly in on-device-only mode.

export const firebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};

// Public key for phone notifications (Web Push). The matching private key is
// stored as the VAPID_PRIVATE_KEY secret in GitHub, never in this repo.
export const vapidPublicKey = 'BOPWhw1nDRa5UyHkwam8CFKfnMMMmVK-Vf_qA136VfTpArkYMHmVwYX8pyE9DGjgY5nKucWtjMbNEskB787RnnM';
