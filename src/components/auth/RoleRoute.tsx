'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Role } from '@crm/shared';
import { useAuthStore } from '@/stores/auth.store';

export function RoleRoute({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (user && !roles.includes(user.role as Role)) {
      router.replace('/');
    }
  }, [user, roles, router]);

  if (!user || !roles.includes(user.role as Role)) return null;
  return <>{children}</>;
}
