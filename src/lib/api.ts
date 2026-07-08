import { API_BASE } from './config';

let refreshPromise: Promise<boolean> | null = null;

const AUTH_REQUEST_TIMEOUT_MS = 8000;

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = AUTH_REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function tryRefreshToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/auth/refresh`, {
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

  let data: {
    success?: boolean;
    error?: {
      message?: string;
      code?: string;
      details?: { fieldErrors?: Record<string, string[]>; formErrors?: string[] };
    };
    data?: T;
  };
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
    const details = data.error?.details;
    const fieldMsg = details?.fieldErrors
      ? Object.entries(details.fieldErrors)
          .flatMap(([field, msgs]) => msgs.map((m) => `${field}: ${m}`))
          .join('; ')
      : '';
    const message = [data.error?.message, fieldMsg].filter(Boolean).join(' — ');
    throw new Error(message || 'Request failed');
  }

  return data as T;
}

async function validateSession(): Promise<boolean> {
  const { isAuthenticated, getAuthHeaders } = await import('../stores/auth.store');
  if (!isAuthenticated()) return true;

  try {
    const res = await fetchWithTimeout(`${API_BASE}/auth/me`, {
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

/** Call on app startup to refresh an expired access token using the httpOnly cookie. */
export async function bootstrapSession(): Promise<boolean> {
  const timeout = new Promise<boolean>((resolve) => {
    setTimeout(() => resolve(false), AUTH_REQUEST_TIMEOUT_MS + 2000);
  });
  return Promise.race([validateSession(), timeout]);
}
