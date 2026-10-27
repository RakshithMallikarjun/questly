// Loads the Firebase code only when sync is switched on, so the app stays
// small and fast for on-device use.
import { syncConfigured, useSync } from './state';

export { syncConfigured, useSync };

type Mod = typeof import('./firebase');
let mod: Promise<Mod> | null = null;
const load = () => (mod ??= import('./firebase'));

export const initSync = () => {
  if (syncConfigured) load().then((m) => m.initSync());
};
export const signIn = () => load().then((m) => m.signIn());
export const signOut = () => load().then((m) => m.signOut());
export const saveSubscription = (deviceId: string, sub: PushSubscriptionJSON | null) =>
  syncConfigured ? load().then((m) => m.saveSubscription(deviceId, sub)) : Promise.resolve(false);
export const flush = () => {
  if (mod) mod.then((m) => m.flush());
};
