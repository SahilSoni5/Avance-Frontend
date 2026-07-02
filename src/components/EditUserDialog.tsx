'use client';

import { useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Loader2, Pencil } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { Button, Dialog } from './ui';
import { RecordForm } from './RecordForm';

interface UserDetail {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  timezone: string | null;
  role: string;
  reportsToId: string | null;
  reportsTo: { id: string; firstName: string; lastName: string; role: string } | null;
}

interface OrgUser {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface EditUserDialogProps {
  userId: string;
  userName: string;
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

export function EditUserDialog({ userId, userName, open, onClose, onSuccess }: EditUserDialogProps) {
  const { data: userData, isLoading: userLoading, error: userError } = useQuery({
    queryKey: ['user-detail', userId],
    queryFn: () => apiFetch<{ data: UserDetail }>(`/users/${userId}`),
    enabled: open && !!userId,
  });

  const { data: orgUsersData, isLoading: orgUsersLoading } = useQuery({
    queryKey: ['users-org-list'],
    queryFn: () => apiFetch<{ data: OrgUser[] }>('/users?limit=200&manage=true'),
    enabled: open,
  });

  const updateMutation = useMutation({
    mutationFn: (body: Record<string, string | null>) =>
      apiFetch(`/users/${userId}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
  });

  const user = userData?.data;
  const managerOptions = (orgUsersData?.data ?? [])
    .filter((u) => u.id !== userId)
    .map((u) => ({
      value: u.id,
      label: `${u.firstName} ${u.lastName} (${u.role})`,
    }));

  useEffect(() => {
    if (!open) updateMutation.reset();
  }, [open, updateMutation]);

  function handleSubmit(values: Record<string, string>) {
    const body: Record<string, string | null> = {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email: values.email.trim(),
      phone: values.phone.trim() || '',
      timezone: values.timezone.trim() || '',
      role: values.role,
      reportsToId: values.reportsToId || null,
    };
    if (values.password.trim()) {
      body.password = values.password.trim();
    }
    updateMutation.mutate(body);
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Edit user — ${userName}`}
      className="max-w-lg"
    >
      {(userLoading || orgUsersLoading) && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading user…
        </div>
      )}

      {userError && (
        <p className="text-sm text-red-600 py-4">
          {userError instanceof Error ? userError.message : 'Failed to load user'}
        </p>
      )}

      {user && !userLoading && (
        <>
          {updateMutation.error && (
            <p className="text-sm text-red-600 mb-4">
              {updateMutation.error instanceof Error ? updateMutation.error.message : 'Update failed'}
            </p>
          )}

          <RecordForm
            key={user.id}
            fields={[
              { name: 'firstName', label: 'First name', required: true },
              { name: 'lastName', label: 'Last name', required: true },
              { name: 'email', label: 'Email', type: 'email', required: true },
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
                name: 'password',
                label: 'New password',
                type: 'password',
                placeholder: 'Leave blank to keep current password',
              },
            ]}
            defaultValues={{
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              phone: user.phone ?? '',
              timezone: user.timezone ?? '',
              role: user.role,
              reportsToId: user.reportsToId ?? user.reportsTo?.id ?? '',
              password: '',
            }}
            loading={updateMutation.isPending}
            submitLabel="Save changes"
            onCancel={onClose}
            onSubmit={(values) => handleSubmit(values as Record<string, string>)}
          />

          <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1">
            <Pencil className="w-3 h-3" />
            Admin can update profile info, email, role, manager, and reset password.
          </p>
        </>
      )}

      {!userLoading && !user && !userError && (
        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      )}
    </Dialog>
  );
}
