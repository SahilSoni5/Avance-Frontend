import { createJSONStorage, type StateStorage } from 'zustand/middleware';

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

export function clientStorage(): StateStorage {
  if (typeof window === 'undefined') return noopStorage;
  return localStorage;
}

export function clientJsonStorage() {
  return createJSONStorage(() => clientStorage());
}
