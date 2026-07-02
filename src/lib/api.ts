import { API_BASE } from './config';

let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok || !data.data?.accessToken) return false;

      const { useAuthStore } = await import('../stores/auth.store');
      useAuthStore.getState().updateAccessToken(data.data.accessToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function handleAuthFailure(): Promise<void> {
  const { useAuthStore } = await import('../stores/auth.store');
  useAuthStore.getState().logout();
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}, retried = false): Promise<T> {
  const { getAuthHeaders } = await import('../stores/auth.store');
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...getAuthHeaders(), ...options.headers },
    credentials: 'include',
  });

  let data: { success?: boolean; error?: { message?: string; code?: string }; data?: T };
  try {
    data = await res.json();
  } catch {
    throw new Error('Request failed');
  }

  if (res.status === 401 && !retried && !path.startsWith('/auth/login')) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      return apiFetch<T>(path, options, true);
    }
    await handleAuthFailure();
    throw new Error('Session expired. Please sign in again.');
  }

  if (!res.ok) {
    throw new Error(data.error?.message ?? 'Request failed');
  }

  return data as T;
}

/** Call on app startup to refresh an expired access token using the httpOnly cookie. */
export async function bootstrapSession(): Promise<boolean> {
  const { useAuthStore, isAuthenticated, getAuthHeaders } = await import('../stores/auth.store');
  if (!isAuthenticated()) return true;

  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (res.ok) return true;

    if (res.status === 401) {
      const refreshed = await tryRefreshToken();
      if (!refreshed) {
        await handleAuthFailure();
        return false;
      }
      return true;
    }

    return false;
  } catch {
    const refreshed = await tryRefreshToken();
    if (!refreshed) {
      await handleAuthFailure();
      return false;
    }
    return true;
  }
}
