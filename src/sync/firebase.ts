// Google sign-in and cloud sync. The whole game state is stored as one
// document per user (users/{uid}). The newest copy wins.

import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  GoogleAuthProvider, getAuth, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut as fbSignOut, type Auth, type User,
} from 'firebase/auth';
import {
  deleteDoc, doc, initializeFirestore, onSnapshot, persistentLocalCache, setDoc, type Firestore, type Unsubscribe,
} from 'firebase/firestore';
import { healthChanged, parseHealthInbox } from '../game/health';
import { planReminders } from '../game/reminders';
import type { GameState } from '../game/types';
import { useStore } from '../store';
import { firebaseConfig, vapidPublicKey } from './config';
import { syncConfigured, useSync } from './state';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let stopSnapshot: Unsubscribe | null = null;
let stopStore: (() => void) | null = null;
let applyingRemote = false;
let timer: ReturnType<typeof setTimeout> | null = null;

const progressOf = (g: GameState) => g.totals.quests * 1000 + g.xp;

const push = (uid: string, game: GameState) => {
  if (!db) return;
  useSync.setState({ status: 'syncing' });
  // The reminder plan travels with the state so the server can send
  // notifications while the app is closed.
  const plan = planReminders(game, new Date());
  setDoc(doc(db, 'users', uid), { state: JSON.stringify(game), updatedAt: game.updatedAt, plan }, { merge: true })
    .then(() => useSync.setState({ status: 'synced', error: undefined }))
    .catch((e: Error) => useSync.setState({ status: 'error', error: e.message }));
};

const startSync = (user: User) => {
  if (!db) return;
  let first = true;
  stopSnapshot = onSnapshot(
    doc(db, 'users', user.uid),
    (snap) => {
      const local = useStore.getState().game;
      if (!snap.exists()) {
        if (local.onboarded) push(user.uid, local);
        first = false;
        return;
      }
      const remote = JSON.parse(snap.data().state as string) as GameState;
      // First time on this device: keep whichever copy has more progress.
      // After that: the most recently changed copy wins.
      const takeRemote = first
        ? !local.onboarded || progressOf(remote) > progressOf(local) || (progressOf(remote) === progressOf(local) && remote.updatedAt > local.updatedAt)
        : remote.updatedAt > local.updatedAt;
      first = false;
      if (takeRemote) {
        applyingRemote = true;
        useStore.getState().replace(remote);
        useStore.getState().tick();
        applyingRemote = false;
        useSync.setState({ status: 'synced' });
      } else if (local.updatedAt > remote.updatedAt) {
        push(user.uid, local);
      } else {
        useSync.setState({ status: 'synced' });
      }
    },
    (e) => useSync.setState({ status: 'error', error: e.message }),
  );
  stopStore = useStore.subscribe((st, prev) => {
    if (st.game === prev.game || applyingRemote || !st.game.onboarded) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => push(user.uid, useStore.getState().game), 1200);
  });
};

const stopSync = () => {
  stopSnapshot?.();
  stopStore?.();
  stopSnapshot = null;
  stopStore = null;
};

// Apple Health: the iPhone shortcut writes to health/{key}; apply what arrives.
let stopHealth: Unsubscribe | null = null;
let healthKey: string | undefined;
const watchHealth = (key: string | undefined) => {
  if (key === healthKey) return;
  healthKey = key;
  stopHealth?.();
  stopHealth = null;
  if (!db || !key) return;
  stopHealth = onSnapshot(
    doc(db, 'health', key),
    (snap) => {
      if (!snap.exists()) return;
      for (const { day, data } of parseHealthInbox(snap.data())) {
        if (healthChanged(useStore.getState().game.health[day], data)) useStore.getState().health(day, data);
      }
    },
    (e) => console.warn('Apple Health sync:', e.message),
  );
};

/**
 * Delete the Apple Health inbox (health/{key}) from the cloud. Resolves
 * 'done' once the server has it, or 'queued' when offline: the delete is
 * saved on this phone and sent when it is back online.
 */
export const deleteHealthInbox = async (key: string): Promise<'done' | 'queued'> => {
  if (!db) initSync();
  if (!db) return 'done';
  if (healthKey === key) watchHealth(undefined);
  try {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sent = deleteDoc(doc(db, 'health', key)).then(() => 'done' as const);
    // A failure after we stopped waiting is only logged: the user was told it's queued.
    sent.catch((e: Error) => console.warn('Apple Health disconnect:', e.message));
    const offline = new Promise<'queued'>((ok) => {
      timer = setTimeout(() => ok('queued'), 8000);
    });
    try {
      return await Promise.race([sent, offline]);
    } finally {
      clearTimeout(timer);
    }
  } catch (e) {
    // Keep listening for the key the app still has.
    watchHealth(useStore.getState().game.profile.healthKey);
    throw e;
  }
};

export const initSync = () => {
  if (!syncConfigured || app) return;
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = initializeFirestore(app, { localCache: persistentLocalCache() });
  watchHealth(useStore.getState().game.profile.healthKey);
  useStore.subscribe((st) => watchHealth(st.game.profile.healthKey));
  onAuthStateChanged(auth, (user) => {
    stopSync();
    if (user) {
      useSync.setState({ user: { uid: user.uid, email: user.email, name: user.displayName }, status: 'syncing' });
      startSync(user);
    } else {
      useSync.setState({ user: null, status: 'signedOut' });
    }
  });
};

export const signIn = async () => {
  if (!auth) return;
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
      await signInWithRedirect(auth, provider);
    } else if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
      useSync.setState({ status: 'error', error: (e as Error).message });
    }
  }
};

export const signOut = async () => {
  if (auth) await fbSignOut(auth);
};

/** Delete your synced copy (users/{uid}) from the cloud, then sign out. Progress on this phone stays. */
export const deleteCloudCopy = async () => {
  const user = auth?.currentUser;
  if (!auth || !db || !user) return;
  // Stop syncing first so nothing writes the copy back.
  stopSync();
  if (timer) clearTimeout(timer);
  timer = null;
  await deleteDoc(doc(db, 'users', user.uid));
  await fbSignOut(auth);
};

/**
 * Register this phone for reminders sent by the server (Firebase Cloud
 * Messaging) and save its address in your user document.
 */
export const registerPush = async (deviceId: string, reg: ServiceWorkerRegistration) => {
  const user = useSync.getState().user;
  if (!app || !db || !user || !vapidPublicKey) return false;
  const { getMessaging, getToken, isSupported } = await import('firebase/messaging');
  if (!(await isSupported())) return false;
  const token = await getToken(getMessaging(app), { vapidKey: vapidPublicKey, serviceWorkerRegistration: reg });
  if (!token) return false;
  await setDoc(doc(db, 'users', user.uid), { subs: { [deviceId]: { token, ua: navigator.userAgent.slice(0, 120) } } }, { merge: true });
  return true;
};

/** Push right away (used before the app goes to the background). */
export const flush = () => {
  const user = useSync.getState().user;
  if (user && timer) {
    clearTimeout(timer);
    timer = null;
    push(user.uid, useStore.getState().game);
  }
};
