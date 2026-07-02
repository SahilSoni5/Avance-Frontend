'use client';

import { ProtectedRoute } from '@/components/auth/RouteGuards';
import { DashboardLayout } from '@/layouts/DashboardLayout';

export default function DashboardRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <DashboardLayout>{children}</DashboardLayout>
    </ProtectedRoute>
  );
}
