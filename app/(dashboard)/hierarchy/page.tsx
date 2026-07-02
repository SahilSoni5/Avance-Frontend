'use client';
import { Role } from '@crm/shared';
import { RoleRoute } from '@/components/auth/RoleRoute';
import { HierarchyPage } from '@/views/HierarchyPage';
export default function Page() {
  return (
    <RoleRoute roles={[Role.ADMIN]}>
      <HierarchyPage />
    </RoleRoute>
  );
}
