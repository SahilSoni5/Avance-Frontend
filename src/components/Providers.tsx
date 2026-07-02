'use client';

import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { applyThemeClass, getInitialThemeDark, useThemeStore } from '@/stores/theme.store';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

function ThemeSync() {
  const isDark = useThemeStore((s) => s.isDark);

  useEffect(() => {
    applyThemeClass(isDark);
  }, [isDark]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    applyThemeClass(getInitialThemeDark());
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeSync />
      {children}
    </QueryClientProvider>
  );
}
