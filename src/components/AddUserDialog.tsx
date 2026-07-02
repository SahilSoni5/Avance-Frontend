'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Loader2, UserPlus } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { Dialog } from './ui';
import { RecordForm } from './RecordForm';

interface OrgUser {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface TeamOption {
  id: string;
  name: string;
  manager: { firstName: string; lastName: string };
}

interface AddUserDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ROLE_OPTIONS = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'BOSS', label: 'Boss' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'EMPLOYEE', label: 'Employee' },
  { value: 'INTERN', label: 'Intern' },
];

export function AddUserDialog({ open, onClose, onSuccess }: AddUserDialogProps) {
  const [formError, setFormError] = useState('');

  const { data: orgUsersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users-org-list'],
    queryFn: () => apiFetch<{ data: OrgUser[] }>('/users?limit=200&manage=true'),
    enabled: open,
  });

  const { data: teamsData, isLoading: teamsLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => apiFetch<{ data: TeamOption[] }>('/teams'),
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const body: Record<string, string | null | undefined> = {
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim(),
        password: values.password.trim(),
        role: values.role,
        phone: values.phone.trim() || undefined,
        timezone: values.timezone.trim() || undefined,
        reportsToId: values.reportsToId || null,
      };

      const res = await apiFetch<{ success?: boolean; data: { id: string } }>('/users', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      const teamId = values.teamId?.trim();
      const createdUserId = res.data?.id;
      if (teamId && createdUserId) {
        await apiFetch(`/teams/${teamId}/members`, {
          method: 'POST',
          body: JSON.stringify({ userId: createdUserId }),
        });
      } else if (teamId && !createdUserId) {
        throw new Error('User was created but could not be assigned to the team. Add them manually from the Teams page.');
      }

      return res;
    },
    onSuccess: () => {
      onSuccess();
      onClose();
    },
  });

  const wasOpen = useRef(false);

  useEffect(() => {
    if (wasOpen.current && !open) {
      createMutation.reset();
      setFormError('');
    }
    wasOpen.current = open;
  }, [open]);

  function handleSubmit(values: Record<string, string>) {
    if (values.role === 'EMPLOYEE' && !values.reportsToId?.trim()) {
      setFormError('Employees must have a manager selected under Reports to.');
      return;
    }
    setFormError('');
    createMutation.mutate(values);
  }

  const managerOptions = (orgUsersData?.data ?? []).map((u) => ({
    value: u.id,
    label: `${u.firstName} ${u.lastName} (${u.role})`,
  }));

  const teamOptions = (teamsData?.data ?? []).map((t) => ({
    value: t.id,
    label: `${t.name} — ${t.manager.firstName} ${t.manager.lastName}`,
  }));

  const loading = usersLoading || teamsLoading;

  return (
    <Dialog open={open} onClose={onClose} title="Add user" className="max-w-lg">
      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading…
        </div>
      ) : (
        <>
          {(createMutation.error || formError) && (
            <p className="text-sm text-red-600 mb-4">
              {formError ||
                (createMutation.error instanceof Error
                  ? createMutation.error.message
                  : 'Failed to create user')}
            </p>
          )}

          <RecordForm
            fields={[
              { name: 'firstName', label: 'First name', required: true },
              { name: 'lastName', label: 'Last name', required: true },
              { name: 'email', label: 'Email', type: 'email', required: true },
              { name: 'password', label: 'Password', type: 'password', required: true },
              { name: 'phone', label: 'Phone' },
              { name: 'timezone', label: 'Timezone (e.g. Asia/Kolkata)' },
              {
                name: 'role',
                label: 'Role',
                type: 'select',
                required: true,
                options: ROLE_OPTIONS,
              },
              {
                name: 'reportsToId',
                label: 'Reports to',
                type: 'select',
                options: [{ value: '', label: '— None —' }, ...managerOptions],
              },
              {
                name: 'teamId',
                label: 'Assign to team',
                type: 'select',
                options: [{ value: '', label: '— No team —' }, ...teamOptions],
              },
            ]}
            defaultValues={{
              firstName: '',
              lastName: '',
              email: '',
              password: '',
              phone: '',
              timezone: '',
              role: 'EMPLOYEE',
              reportsToId: '',
              teamId: '',
            }}
            loading={createMutation.isPending}
            submitLabel="Create user"
            onCancel={onClose}
            onSubmit={(values) => handleSubmit(values as Record<string, string>)}
          />

          <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1">
            <UserPlus className="w-3 h-3" />
            Use Employee or Intern role for team members. Employees need a manager under Reports to.
          </p>
        </>
      )}
    </Dialog>
  );
}
