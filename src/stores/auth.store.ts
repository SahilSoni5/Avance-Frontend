'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Role } from '@crm/shared';
import { clientJsonStorage } from '../lib/client-storage';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  organizationId: string;
}

interface AuthState {
  accessToken: string | null;
  user: User | null;
  hasHydrated: boolean;
  setAuth: (accessToken: string, user: User) => void;
  updateAccessToken: (accessToken: string) => void;
  logout: () => void;
  setHasHydrated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      hasHydrated: false,
      setAuth: (accessToken, user) => set({ accessToken, user }),
      updateAccessToken: (accessToken) => set({ accessToken }),
      logout: () => set({ accessToken: null, user: null }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'crm-auth',
      storage: clientJsonStorage(),
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

// Fallback if persist rehydration hangs (prevents infinite blank loading screen)
if (typeof window !== 'undefined') {
  setTimeout(() => {
    if (!useAuthStore.getState().hasHydrated) {
      useAuthStore.getState().setHasHydrated(true);
    }
  }, 500);
}

export function getAuthHeaders(): HeadersInit {
  const token = useAuthStore.getState().accessToken;
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

export function isAuthenticated(): boolean {
  const { accessToken, user } = useAuthStore.getState();
  return Boolean(accessToken && user);
}
