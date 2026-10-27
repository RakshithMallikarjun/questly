// Phone notifications.
// - When signed in, this phone subscribes to Web Push and a scheduled server
//   job sends reminders even while Questly is closed.
// - Otherwise reminders are shown by the open app itself (best effort).

import { create } from 'zustand';
import { planReminders } from './game/reminders';
import { useStore } from './store';
import { registerPush, syncConfigured, useSync } from './sync';
import { vapidPublicKey } from './sync/config';

type Perm = NotificationPermission | 'unsupported';

interface NotifyState {
  permission: Perm;
  /** True when this phone is registered for server-sent reminders. */
  push: boolean;
}

export const supported = () => typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
const pushSupported = () => supported() && 'PushManager' in window;

export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

export const useNotify = create<NotifyState>(() => ({
  permission: supported() ? Notification.permission : 'unsupported',
  push: false,
}));

const deviceId = (): string => {
  try {
    let id = localStorage.getItem('questly-device');
    if (!id) {
      id = Math.random().toString(36).slice(2, 12);
      localStorage.setItem('questly-device', id);
    }
    return id;
  } catch {
    return 'device';
  }
};

/** Register this phone for server-sent reminders (needs sign-in). */
const subscribePush = async () => {
  if (!pushSupported() || !syncConfigured || !vapidPublicKey || !useSync.getState().user || Notification.permission !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const ok = await registerPush(deviceId(), reg);
    useNotify.setState({ push: ok });
  } catch {
    useNotify.setState({ push: false });
  }
};

/** Ask for permission (must be called from a tap). */
export const enableNotifications = async () => {
  if (!supported()) return;
  const permission = await Notification.requestPermission();
  useNotify.setState({ permission });
  if (permission === 'granted') await subscribePush();
};

export const show = async (title: string, body: string, tag?: string) => {
  if (!supported() || Notification.permission !== 'granted') return;
  const reg = await navigator.serviceWorker.getRegistration();
  const opts: NotificationOptions = { body, tag, icon: 'icon-192.png', badge: 'favicon-32.png' };
  if (reg) await reg.showNotification(title, opts);
  else new Notification(title, opts);
};

// Reminders shown by the open app, for when server reminders are not set up.
let timers: ReturnType<typeof setTimeout>[] = [];
const shown = new Set<string>();
const LOCAL_WINDOW = 12 * 3600 * 1000;

const scheduleLocal = () => {
  timers.forEach(clearTimeout);
  timers = [];
  if (useNotify.getState().push || Notification.permission !== 'granted') return;
  const now = Date.now();
  for (const r of planReminders(useStore.getState().game, new Date(now))) {
    if (r.at - now > LOCAL_WINDOW || shown.has(r.tag)) continue;
    timers.push(
      setTimeout(() => {
        shown.add(r.tag);
        void show(r.title, r.body, r.tag);
      }, r.at - now),
    );
  }
};

let started = false;
export const initNotifications = () => {
  if (started || !supported()) return;
  started = true;
  useNotify.setState({ permission: Notification.permission });
  // Re-register whenever someone signs in, and replan when anything changes.
  useSync.subscribe((s, prev) => {
    if (s.user && s.user.uid !== prev.user?.uid) void subscribePush();
    if (!s.user && prev.user) useNotify.setState({ push: false });
  });
  if (useSync.getState().user) void subscribePush();
  useStore.subscribe((s, prev) => s.game !== prev.game && scheduleLocal());
  useNotify.subscribe((s, prev) => s.push !== prev.push && scheduleLocal());
  scheduleLocal();
};
