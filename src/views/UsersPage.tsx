'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UserMinus, Users } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';
import { Role, canDeactivateUser } from '@crm/shared';
import { ModulePage, LoadingRows, ErrorMessage } from '../components/ModulePage';
import { Button } from '../components/ui';
import { DeactivateUserDialog } from '../components/DeactivateUserDialog';
import { cn } from '../lib/utils';

interface UserRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  reportsTo: { firstName: string; lastName: string; role: string } | null;
}

const ROLE_STYLES: Record<string, string> = {
  ADMIN: 'bg-rose-100 text-rose-700',
  BOSS: 'bg-amber-100 text-amber-700',
  MANAGER: 'bg-indigo-100 text-indigo-700',
  EMPLOYEE: 'bg-slate-100 text-slate-700',
  INTERN: 'bg-gray-100 text-gray-600',
};

const MANAGE_ROLES = [Role.ADMIN, Role.BOSS, Role.MANAGER] as const;

export function UsersPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [deactivateTarget, setDeactivateTarget] = useState<UserRow | null>(null);

  const canAccess = !!user && MANAGE_ROLES.includes(user.role as (typeof MANAGE_ROLES)[number]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['users-manage', user?.role],
    queryFn: () => apiFetch<{ data: UserRow[] }>('/users?limit=100&manage=true'),
    enabled: canAccess,
  });

  if (user && !canAccess) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        You do not have permission to manage users.
      </div>
    );
  }

  const users = (data?.data ?? []).filter((u) => u.isActive);

  function canDeactivateTarget(row: UserRow): boolean {
    if (!user) return false;
    const actorRole = user.role as Role;
    const isInActorTeam = actorRole === Role.MANAGER;
    return canDeactivateUser(actorRole, row.role as Role, isInActorTeam);
  }

  const pageDescription =
    user?.role === Role.MANAGER
      ? 'View and deactivate members of your team. Work must be handed over before deactivation.'
      : 'View and deactivate users across the organization. Work must be handed over before deactivation.';

  return (
    <ModulePage title="Users" description={pageDescription}>
      {isLoading && <LoadingRows />}
      {error && <ErrorMessage error={error} />}

      {data && (
        <div className="rounded-2xl border border-border/60 overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Reports to</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((row) => (
                <tr key={row.id} className="border-t border-border/40">
                  <td className="px-4 py-3 font-medium text-foreground">
                    {row.firstName} {row.lastName}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{row.email}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', ROLE_STYLES[row.role] ?? 'bg-muted')}>
                      {row.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.reportsTo ? `${row.reportsTo.firstName} ${row.reportsTo.lastName}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canDeactivateTarget(row) ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => setDeactivateTarget(row)}
                      >
                        <UserMinus className="w-3.5 h-3.5 mr-1" /> Deactivate
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <div className="flex flex-col items-center py-12 text-muted-foreground">
              <Users className="w-10 h-10 mb-2 opacity-30" />
              <p>
                {user?.role === Role.MANAGER
                  ? 'No team members to manage'
                  : 'No users available to manage'}
              </p>
            </div>
          )}
        </div>
      )}

      {deactivateTarget && (
        <DeactivateUserDialog
          userId={deactivateTarget.id}
          userName={`${deactivateTarget.firstName} ${deactivateTarget.lastName}`}
          open={!!deactivateTarget}
          onClose={() => setDeactivateTarget(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['users-manage'] });
            queryClient.invalidateQueries({ queryKey: ['org-chart'] });
          }}
        />
      )}
    </ModulePage>
  );
}
