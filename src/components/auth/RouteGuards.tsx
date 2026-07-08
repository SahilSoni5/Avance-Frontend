'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, isAuthenticated } from '@/stores/auth.store';
import { bootstrapSession } from '@/lib/api';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const router = useRouter();
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated()) {
      setSessionReady(true);
      return;
    }
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      setSessionReady(true);
    };
    const safetyTimer = window.setTimeout(settle, 10000);
    void bootstrapSession().finally(() => {
      settle();
      window.clearTimeout(safetyTimer);
    });
    // Do not clear safetyTimer on cleanup — React Strict Mode remount must not
    // cancel the only escape hatch when bootstrap hangs.
  }, [hasHydrated]);

  useEffect(() => {
    if (hasHydrated && sessionReady && !isAuthenticated()) {
      router.replace('/login');
    }
  }, [hasHydrated, sessionReady, router]);

  if (!hasHydrated || !sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center mesh-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shadow-glow animate-pulse-soft">
            <span className="text-white font-bold text-lg">A</span>
          </div>
          <p className="text-sm text-muted-foreground">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated()) return null;
  return <>{children}</>;
}

export function PublicRoute({ children }: { children: ReactNode }) {
  const router = useRouter();
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  useEffect(() => {
    if (hasHydrated && isAuthenticated()) {
      router.replace('/');
    }
  }, [hasHydrated, router]);

  if (!hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center mesh-bg">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (isAuthenticated()) return null;
  return <>{children}</>;
}
