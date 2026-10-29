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
export const registerPush = (deviceId: string, reg: ServiceWorkerRegistration) =>
  syncConfigured ? load().then((m) => m.registerPush(deviceId, reg)) : Promise.resolve(false);
/** Delete the Apple Health inbox from the cloud (nothing to do without sync). */
export const deleteHealthInbox = (key: string): Promise<'done' | 'queued'> =>
  syncConfigured ? load().then((m) => m.deleteHealthInbox(key)) : Promise.resolve('done');
export const flush = () => {
  if (mod) mod.then((m) => m.flush());
};
