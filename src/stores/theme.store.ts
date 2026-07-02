'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { clientJsonStorage } from '../lib/client-storage';

interface ThemeState {
  isDark: boolean;
  hasHydrated: boolean;
  toggle: () => void;
  setDark: (value: boolean) => void;
  setHasHydrated: (value: boolean) => void;
}

export function applyThemeClass(isDark: boolean) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', isDark);
}

export function getInitialThemeDark(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem('crm-theme');
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { state?: { isDark?: boolean; dark?: boolean } };
    return parsed.state?.isDark ?? parsed.state?.dark ?? false;
  } catch {
    return false;
  }
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      isDark: false,
      hasHydrated: false,
      toggle: () => {
        const next = !get().isDark;
        applyThemeClass(next);
        set({ isDark: next });
      },
      setDark: (value) => {
        applyThemeClass(value);
        set({ isDark: value });
      },
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'crm-theme',
      storage: clientJsonStorage(),
      partialize: (state) => ({ isDark: state.isDark }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyThemeClass(state.isDark);
          state.setHasHydrated(true);
        }
      },
    }
  )
);
