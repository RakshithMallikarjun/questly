// Google sign-in and cloud sync. The whole game state is stored as one
// document per user (users/{uid}). The newest copy wins.

import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  GoogleAuthProvider, getAuth, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut as fbSignOut, type Auth, type User,
} from 'firebase/auth';
import {
  doc, initializeFirestore, onSnapshot, persistentLocalCache, setDoc, type Firestore, type Unsubscribe,
} from 'firebase/firestore';
import type { GameState } from '../game/types';
import { useStore } from '../store';
import { firebaseConfig } from './config';
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
  setDoc(doc(db, 'users', uid), { state: JSON.stringify(game), updatedAt: game.updatedAt })
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

export const initSync = () => {
  if (!syncConfigured || app) return;
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = initializeFirestore(app, { localCache: persistentLocalCache() });
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

/** Push right away (used before the app goes to the background). */
export const flush = () => {
  const user = useSync.getState().user;
  if (user && timer) {
    clearTimeout(timer);
    timer = null;
    push(user.uid, useStore.getState().game);
  }
};
