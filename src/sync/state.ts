import { create } from 'zustand';
import { firebaseConfig } from './config';

export const syncConfigured = Boolean(firebaseConfig.apiKey);

interface SyncState {
  user: { uid: string; email: string | null; name: string | null } | null;
  status: 'off' | 'signedOut' | 'syncing' | 'synced' | 'error';
  error?: string;
}

export const useSync = create<SyncState>(() => ({ user: null, status: syncConfigured ? 'signedOut' : 'off' }));
