'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/auth.store';
import { apiFetch } from '../lib/api';
import { formatCurrencyINR } from '../lib/locale';
import { ModulePage, LoadingRows } from '../components/ModulePage';
import { Button, SectionCard, Dialog } from '../components/ui';
import { RecordForm } from '../components/RecordForm';

export function SettingsPage() {
  const queryClient = useQueryClient();
  const { user, setAuth } = useAuthStore();
  const [profileOpen, setProfileOpen] = useState(false);
  const [orgOpen, setOrgOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['org-settings'],
    queryFn: () =>
      apiFetch<{ data: { name: string; industry: string; timezone: string; currency: string; dealApprovalThreshold: number } }>(
        '/organizations/current'
      ),
  });

  const profileMutation = useMutation({
    mutationFn: (body: { firstName?: string; lastName?: string; phone?: string; timezone?: string }) =>
      apiFetch<{ data: typeof user }>('/users/profile', { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: (res) => {
      if (user && res.data) {
        setAuth(useAuthStore.getState().accessToken!, { ...user, ...res.data });
      }
      queryClient.invalidateQueries({ queryKey: ['org-settings'] });
      setProfileOpen(false);
    },
  });

  const orgMutation = useMutation({
    mutationFn: (body: Record<string, string>) =>
      apiFetch('/organizations/current', { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-settings'] });
      setOrgOpen(false);
    },
  });

  return (
    <ModulePage title="Settings" description="Organization and profile preferences">
      {isLoading && <LoadingRows />}
      {data?.data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SectionCard
            title="Profile"
            action={<Button size="sm" variant="outline" onClick={() => setProfileOpen(true)}>Edit</Button>}
          >
            <dl className="space-y-3 text-sm -mt-2">
              <div><dt className="text-slate-500">Name</dt><dd className="font-medium">{user?.firstName} {user?.lastName}</dd></div>
              <div><dt className="text-slate-500">Email</dt><dd>{user?.email}</dd></div>
              <div><dt className="text-slate-500">Role</dt><dd>{user?.role}</dd></div>
            </dl>
          </SectionCard>

          <SectionCard
            title="Organization"
            action={<Button size="sm" variant="outline" onClick={() => setOrgOpen(true)}>Edit</Button>}
          >
            <dl className="space-y-3 text-sm -mt-2">
              <div><dt className="text-slate-500">Organization</dt><dd className="font-medium">{data.data.name}</dd></div>
              <div><dt className="text-slate-500">Industry</dt><dd>{data.data.industry ?? '—'}</dd></div>
              <div><dt className="text-slate-500">Timezone</dt><dd>{data.data.timezone}</dd></div>
              <div><dt className="text-slate-500">Currency</dt><dd>{data.data.currency}</dd></div>
              <div><dt className="text-slate-500">Deal Approval Threshold</dt><dd>{formatCurrencyINR(data.data.dealApprovalThreshold ?? 0)}</dd></div>
            </dl>
          </SectionCard>
        </div>
      )}

      <Dialog open={profileOpen} onClose={() => setProfileOpen(false)} title="Edit Profile">
        <RecordForm<{ firstName: string; lastName: string; phone?: string; timezone?: string }>
          defaultValues={{ firstName: user?.firstName ?? '', lastName: user?.lastName ?? '' }}
          fields={[
            { name: 'firstName', label: 'First Name', required: true },
            { name: 'lastName', label: 'Last Name', required: true },
            { name: 'phone', label: 'Phone' },
            { name: 'timezone', label: 'Timezone' },
          ]}
          loading={profileMutation.isPending}
          onSubmit={(v) => profileMutation.mutate(v)}
        />
      </Dialog>

      <Dialog open={orgOpen} onClose={() => setOrgOpen(false)} title="Edit Organization">
        <RecordForm
          defaultValues={{
            name: data?.data.name ?? '',
            industry: data?.data.industry ?? '',
            timezone: data?.data.timezone ?? '',
            currency: data?.data.currency ?? '',
            dealApprovalThreshold: String(data?.data.dealApprovalThreshold ?? ''),
          }}
          fields={[
            { name: 'name', label: 'Organization Name', required: true },
            { name: 'industry', label: 'Industry' },
            { name: 'timezone', label: 'Timezone' },
            { name: 'currency', label: 'Currency' },
            { name: 'dealApprovalThreshold', label: 'Deal Approval Threshold', type: 'number' },
          ]}
          loading={orgMutation.isPending}
          onSubmit={(v) => orgMutation.mutate(v)}
        />
      </Dialog>
    </ModulePage>
  );
}
